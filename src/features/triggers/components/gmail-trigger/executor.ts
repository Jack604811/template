import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailTriggerChannel } from "@/inngest/channels/gmail-trigger";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

type GmailTokenValue = {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number;
};

type GmailTriggerData = {
  credentialId?: string;
  from?: string;
  subjectContains?: string;
  hasAttachment?: boolean;
  attachmentType?: string;
  /** variableName is not stored on GMAIL_TRIGGER; we always use "gmail" */
};

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  filename?: string;
  headers?: Array<{ name?: string; value?: string }>;
  parts?: GmailPart[];
};

function parseHeader(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string,
): string | undefined {
  if (!headers?.length) return undefined;
  const n = name.toLowerCase();
  return headers.find((x) => x.name?.toLowerCase() === n)?.value;
}

function extractBodyFromParts(parts: GmailPart[] | undefined): string | undefined {
  if (!parts?.length) return undefined;
  for (const mimeType of ["text/plain", "text/html"]) {
    for (const part of parts) {
      if (part.mimeType === mimeType && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
      if (part.mimeType?.startsWith("multipart/") && part.parts?.length) {
        const found = extractBodyFromParts(part.parts);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function collectAttachmentMeta(
  parts: GmailPart[] | undefined,
): Array<{ filename: string; mimeType: string; attachmentId: string; size?: number }> {
  if (!parts?.length) return [];
  const result: Array<{ filename: string; mimeType: string; attachmentId: string; size?: number }> = [];
  for (const part of parts) {
    if (part.body?.attachmentId) {
      result.push({
        filename: part.filename?.trim() || `attachment-${result.length}`,
        mimeType: part.mimeType ?? "application/octet-stream",
        attachmentId: part.body.attachmentId,
        size: part.body.size,
      });
    }
    if (part.mimeType?.startsWith("multipart/") && part.parts?.length) {
      result.push(...collectAttachmentMeta(part.parts));
    }
  }
  return result;
}

function normalizeGmailMessage(full: {
  id: string;
  threadId?: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  };
  snippet?: string;
}) {
  const headers = full.payload?.headers;
  const payload = full.payload;
  let body: string | undefined;
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  } else {
    body = extractBodyFromParts(payload?.parts);
  }
  const attachments = collectAttachmentMeta(payload?.parts);
  return {
    messageId: full.id,
    threadId: full.threadId,
    from: parseHeader(headers, "From"),
    to: parseHeader(headers, "To"),
    subject: parseHeader(headers, "Subject"),
    snippet: full.snippet,
    body,
    hasAttachments: attachments.length > 0,
    attachments,
    labelIds: full.labelIds,
  };
}

/**
 * Gmail Trigger executor — when run manually (via the Run button), fetches the
 * most recent email matching the node's filters so the workflow has real data.
 * When triggered automatically via Pub/Sub push, the email is already in context
 * via initialData and this executor simply passes it through.
 */
export const gmailTriggerExecutor: NodeExecutor = async ({
  data,
  nodeId,
  organizationId,
  context,
  step,
  publish,
}) => {
  await publish(gmailTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const triggerData = data as GmailTriggerData;

    // If context already has a "gmail" key (set by push handler via initialData), pass through.
    if (context && "gmail" in context) {
      const result = await step.run("gmail-trigger-passthrough", async () => context);
      await publish(gmailTriggerChannel().status({ nodeId, status: "success" }));
      return result;
    }

    // Manual run: fetch the most recent matching email.
    if (!triggerData.credentialId) {
      await publish(gmailTriggerChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gmail trigger: No credential configured");
    }

    const credential = await step.run("gmail-trigger-load-credential", () =>
      prisma.credential.findUnique({
        where: { id: triggerData.credentialId, organizationId },
      }),
    );

    if (!credential) {
      await publish(gmailTriggerChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gmail trigger: Credential not found");
    }

    let tokens: GmailTokenValue;
    try {
      tokens = JSON.parse(decrypt(credential.value)) as GmailTokenValue;
    } catch {
      await publish(gmailTriggerChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gmail trigger: Invalid credential value");
    }

    // Refresh token if needed
    const now = Date.now();
    if (tokens.expiry_date && tokens.expiry_date <= now + 60_000) {
      tokens = await step.run("gmail-trigger-refresh-token", async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret || !tokens.refresh_token) {
          throw new NonRetriableError("Gmail trigger: Cannot refresh token");
        }
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: tokens.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        if (!res.ok) throw new NonRetriableError("Gmail trigger: Token refresh failed");
        const body = (await res.json()) as { access_token: string; expires_in: number };
        const newTokens: GmailTokenValue = {
          access_token: body.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + body.expires_in * 1000,
        };
        await prisma.credential.update({
          where: { id: credential.id },
          data: { value: encrypt(JSON.stringify(newTokens)) },
        });
        return newTokens;
      });
    }

    const email = await step.run("gmail-trigger-fetch-email", async () => {
      const queryParts: string[] = [];
      if (triggerData.from?.trim()) queryParts.push(`from:${triggerData.from.trim()}`);
      if (triggerData.subjectContains?.trim()) queryParts.push(`subject:${triggerData.subjectContains.trim()}`);
      if (triggerData.hasAttachment) queryParts.push("has:attachment");
      if (triggerData.attachmentType?.trim()) queryParts.push(`filename:${triggerData.attachmentType.trim()}`);
      const q = queryParts.join(" ");

      const listParams = new URLSearchParams({ maxResults: "1" });
      if (q) listParams.set("q", q);

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams.toString()}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!listRes.ok) {
        if (listRes.status === 403) {
          throw new NonRetriableError(
            "Gmail trigger: 403 Forbidden — credential is missing required read permissions. Please reconnect your Gmail account.",
          );
        }
        throw new NonRetriableError(`Gmail trigger: Gmail API error ${listRes.status}`);
      }

      const listJson = (await listRes.json()) as { messages?: Array<{ id: string }> };
      const msgId = listJson.messages?.[0]?.id;
      if (!msgId) return null;

      const getRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!getRes.ok) {
        if (getRes.status === 403) {
          throw new NonRetriableError(
            "Gmail trigger: 403 Forbidden — credential is missing required read permissions. Please reconnect your Gmail account.",
          );
        }
        throw new NonRetriableError(`Gmail trigger: Gmail API error ${getRes.status}`);
      }

      return normalizeGmailMessage(
        (await getRes.json()) as Parameters<typeof normalizeGmailMessage>[0],
      );
    });

    await publish(gmailTriggerChannel().status({ nodeId, status: "success" }));
    return { ...context, gmail: email };
  } catch (error) {
    await publish(gmailTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

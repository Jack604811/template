/**
 * Gmail "Get email" trigger via Push Notifications (Pub/Sub).
 * @see https://developers.google.com/workspace/gmail/api/guides/push
 *
 * Requires: GMAIL_PUBSUB_TOPIC (e.g. projects/myproject/topics/gmail-watch).
 * Set up in Google Cloud: create topic, create push subscription to your
 * POST /api/webhooks/gmail-push URL, grant gmail-api-push@system.gserviceaccount.com
 * publish permission on the topic.
 */
import { CredentialType, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { inngest } from "./client";
import { sendWorkflowExecution } from "./utils";

type GmailTokenValue = {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number;
};

type GmailNewEmailsNodeData = {
  action?: string;
  variableName?: string;
  credentialId?: string;
  from?: string;
  hasAttachment?: boolean;
  attachmentType?: string;
  subjectContains?: string;
  gmailHistoryId?: string;
  /** Display name stored on GMAIL_TRIGGER nodes */
  name?: string;
};

type NormalizedAttachment = {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size?: number;
};

type NormalizedEmail = {
  messageId: string;
  threadId?: string;
  from?: string;
  to?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  hasAttachments?: boolean;
  attachments: NormalizedAttachment[];
  labelIds?: string[];
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
  const h = headers.find((x) => x.name?.toLowerCase() === n);
  return h?.value;
}

/**
 * Recursively walk MIME parts to find a text/plain body.
 * Gmail nests parts arbitrarily: multipart/mixed > multipart/alternative > text/plain.
 */
function extractBodyFromParts(parts: GmailPart[] | undefined): string | undefined {
  if (!parts?.length) return undefined;

  // Prefer text/plain over text/html
  for (const mimeType of ["text/plain", "text/html"]) {
    for (const part of parts) {
      if (part.mimeType === mimeType && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
      // Recurse into multipart containers
      if (part.mimeType?.startsWith("multipart/") && part.parts?.length) {
        const found = extractBodyFromParts(part.parts);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function getPartFilename(part: GmailPart, fallbackIndex: number): string {
  if (part.filename?.trim()) return part.filename.trim();
  const disp = parseHeader(part.headers, "Content-Disposition");
  if (disp) {
    const match = /filename\s*=\s*(["']?)([^"'\s;]+)\1/.exec(disp);
    if (match?.[2]) return match[2].trim();
  }
  const name = parseHeader(part.headers, "Content-Type");
  if (name) {
    const match = /name\s*=\s*(["']?)([^"'\s;]+)\1/.exec(name);
    if (match?.[2]) return match[2].trim();
  }
  return `attachment-${fallbackIndex}`;
}

function collectAttachmentParts(
  parts: GmailPart[] | undefined,
  indexRef: { current: number } = { current: 0 },
): NormalizedAttachment[] {
  if (!parts?.length) return [];
  const result: NormalizedAttachment[] = [];
  for (const part of parts) {
    if (part.body?.attachmentId) {
      result.push({
        filename: getPartFilename(part, indexRef.current),
        mimeType: part.mimeType ?? "application/octet-stream",
        attachmentId: part.body.attachmentId,
        size: part.body.size,
      });
      indexRef.current += 1;
    }
    if (part.mimeType?.startsWith("multipart/") && part.parts?.length) {
      result.push(...collectAttachmentParts(part.parts, indexRef));
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
}): NormalizedEmail {
  const headers = full.payload?.headers;
  const from = parseHeader(headers, "From");
  const to = parseHeader(headers, "To");
  const subject = parseHeader(headers, "Subject");
  const snippet = full.snippet;

  let body: string | undefined;
  const payload = full.payload;

  // Simple message: body data at the root payload level
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  } else {
    // Multipart: recurse through parts tree
    body = extractBodyFromParts(payload?.parts);
  }

  const attachments = collectAttachmentParts(payload?.parts);

  return {
    messageId: full.id,
    threadId: full.threadId,
    from,
    to,
    subject,
    snippet,
    body,
    hasAttachments: attachments.length > 0,
    attachments,
    labelIds: full.labelIds,
  };
}

function emailMatchesFilters(
  email: NormalizedEmail,
  nodeData: GmailNewEmailsNodeData,
): boolean {
  if (nodeData.from?.trim()) {
    const want = nodeData.from.trim().toLowerCase();
    const from = (email.from ?? "").toLowerCase();
    if (!from.includes(want)) return false;
  }
  if (nodeData.hasAttachment && !email.hasAttachments) return false;
  if (nodeData.attachmentType?.trim()) {
    if (!email.hasAttachments) return false;
  }
  if (nodeData.subjectContains?.trim()) {
    const want = nodeData.subjectContains.trim().toLowerCase();
    const subj = (email.subject ?? "").toLowerCase();
    if (!subj.includes(want)) return false;
  }
  return true;
}

async function refreshGmailTokenIfNeeded(
  credentialId: string,
  tokens: GmailTokenValue,
): Promise<GmailTokenValue> {
  const now = Date.now();
  const bufferMs = 60 * 1000;
  if (
    !tokens.expiry_date ||
    tokens.expiry_date > now + bufferMs ||
    !tokens.refresh_token
  ) {
    return tokens;
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return tokens;

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
  if (!res.ok) return tokens;

  const body = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const newTokens: GmailTokenValue = {
    access_token: body.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + body.expires_in * 1000,
  };
  await prisma.credential.update({
    where: { id: credentialId },
    data: { value: encrypt(JSON.stringify(newTokens)) },
  });
  return newTokens;
}

/**
 * Process a Gmail push: fetch history since last known historyId, trigger workflows for new emails.
 * Triggered by webhook when Pub/Sub delivers a mailbox change notification.
 */
export const gmailProcessPush = inngest.createFunction(
  {
    id: "gmail-process-push",
    retries: 2,
  },
  { event: "gmail/push.received" },
  async ({ event, step }) => {
    const { credentialId, historyId: newHistoryId } = event.data as {
      credentialId: string;
      historyId: string;
    };

    const watch = await step.run("load-watch", async () => {
      return prisma.gmailWatch.findUnique({
        where: { credentialId },
        select: { historyId: true },
      });
    });
    if (!watch) return { processed: 0 };

    const startHistoryId = watch.historyId;

    // Deduplication: if we already processed this historyId or newer, skip.
    // historyIds are monotonically increasing integers.
    if (
      startHistoryId &&
      Number(newHistoryId) <= Number(startHistoryId)
    ) {
      return { processed: 0, reason: "already-processed" };
    }
    const credential = await step.run("load-credential", async () => {
      return prisma.credential.findUnique({
        where: { id: credentialId, type: CredentialType.GMAIL },
        select: { id: true, value: true },
      });
    });
    if (!credential) return { processed: 0 };

    let tokens: GmailTokenValue;
    try {
      const raw = decrypt(credential.value);
      tokens = JSON.parse(raw) as GmailTokenValue;
    } catch {
      return { processed: 0 };
    }

    tokens = await step.run("refresh-token", async () => {
      return refreshGmailTokenIfNeeded(credentialId, tokens);
    });

    const nodes = await step.run("fetch-nodes", async () => {
      // credentialId is stored inside the JSON data field, not the DB column.
      // Match both: legacy GMAIL nodes (action==="get") and dedicated GMAIL_TRIGGER nodes.
      const all = await prisma.node.findMany({
        where: {
          type: { in: [NodeType.GMAIL, NodeType.GMAIL_TRIGGER] },
          data: { path: ["credentialId"], equals: credentialId },
        },
        select: { id: true, workflowId: true, data: true, type: true },
      });
      return all.filter((n) => {
        const d = n.data as GmailNewEmailsNodeData | null;
        if (n.type === NodeType.GMAIL_TRIGGER) {
          return !!d?.credentialId;
        }
        return d?.action === "get" && d.variableName;
      }) as Array<{
        id: string;
        workflowId: string;
        data: GmailNewEmailsNodeData & { action?: string };
      }>;
    });

    if (nodes.length === 0) return { processed: 0 };

    // If this is the very first push, we don't have a prior historyId to diff from.
    // Use (newHistoryId - 1) so history.list returns the messages in this push.
    // Gmail historyIds are monotonically increasing integers as strings.
    const effectiveStartHistoryId = startHistoryId
      ? startHistoryId
      : String(Math.max(1, Number(newHistoryId) - 1));

    const result = await step.run("process-history", async () => {
      const messageIds: string[] = [];
      let nextPageToken: string | undefined;
      let latestHistoryId: string | null = newHistoryId;

      do {
        const params = new URLSearchParams({
          startHistoryId: effectiveStartHistoryId,
          historyTypes: "messageAdded",
          maxResults: "100",
        });
        if (nextPageToken) params.set("pageToken", nextPageToken);
        const historyRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/history?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          },
        );

        if (historyRes.status === 404) {
          const profileRes = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            },
          );
          if (!profileRes.ok) return { triggered: 0, latestHistoryId: null };
          const profile = (await profileRes.json()) as { historyId?: string };
          latestHistoryId = profile.historyId ?? null;
          break;
        }

        if (!historyRes.ok) return { triggered: 0, latestHistoryId: null };

        const historyJson = (await historyRes.json()) as {
          history?: Array<{
            messagesAdded?: Array<{ message?: { id?: string } }>;
          }>;
          nextPageToken?: string;
          historyId?: string;
        };
        latestHistoryId = historyJson.historyId ?? null;
        nextPageToken = historyJson.nextPageToken;

        for (const record of historyJson.history ?? []) {
          for (const added of record.messagesAdded ?? []) {
            const id = added.message?.id;
            if (id) messageIds.push(id);
          }
        }
      } while (nextPageToken);

      const emails: NormalizedEmail[] = [];
      for (const msgId of messageIds) {
        const getRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          },
        );
        if (!getRes.ok) continue;
        const full = (await getRes.json()) as Parameters<
          typeof normalizeGmailMessage
        >[0];
        emails.push(normalizeGmailMessage(full));
      }

      let triggered = 0;
      for (const email of emails) {
        for (const node of nodes) {
          const d = node.data as GmailNewEmailsNodeData;
          if (!emailMatchesFilters(email, d)) continue;
          // GMAIL_TRIGGER nodes use "gmail" as the context key (per trigger schema registry).
          // Legacy GMAIL nodes (action==="get") use their variableName.
          const varName = d.variableName ?? "gmail";
          await sendWorkflowExecution({
            workflowId: node.workflowId,
            triggerNodeId: node.id,
            initialData: { [varName]: email },
          });
          triggered++;
        }
      }

      if (latestHistoryId) {
        await prisma.gmailWatch.update({
          where: { credentialId },
          data: { historyId: latestHistoryId },
        });
        for (const node of nodes) {
          const current = (node.data ?? {}) as Record<string, unknown>;
          await prisma.node.update({
            where: { id: node.id },
            data: {
              data: {
                ...current,
                gmailHistoryId: latestHistoryId,
              } as object,
            },
          });
        }
      }

      return { triggered, latestHistoryId };
    });

    return { processed: result?.triggered ?? 0 };
  },
);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hourly cron: register or renew Gmail watch for each credential used by a "Get email" node.
 * Watch must be renewed at least every 7 days; we run hourly so new set-ups get watched quickly.
 * @see https://developers.google.com/workspace/gmail/api/guides/push
 */
export const gmailEnsureWatches = inngest.createFunction(
  {
    id: "gmail-ensure-watches",
    retries: 2,
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName?.trim()) {
      return { registered: 0, skipped: "GMAIL_PUBSUB_TOPIC not set" };
    }

    const nodes = await step.run("fetch-gmail-get-nodes", async () => {
      const all = await prisma.node.findMany({
        where: { type: { in: [NodeType.GMAIL, NodeType.GMAIL_TRIGGER] } },
        select: { id: true, credentialId: true, data: true, type: true },
      });
      return all.filter((n) => {
        const d = n.data as GmailNewEmailsNodeData | null;
        if (n.type === NodeType.GMAIL_TRIGGER) {
          return !!(d?.credentialId);
        }
        return !!(d && d.action === "get" && d.credentialId && d.variableName);
      });
    });

    const byCredential = new Map<string, (typeof nodes)[number][]>();
    for (const node of nodes) {
      const cid = node.credentialId;
      if (!cid) continue;
      const list = byCredential.get(cid) ?? [];
      list.push(node);
      byCredential.set(cid, list);
    }

    let registered = 0;
    for (const [credentialId] of byCredential) {
      const result = await step.run(
        `ensure-watch-${credentialId}`,
        async () => {
          const credential = await prisma.credential.findUnique({
            where: { id: credentialId, type: CredentialType.GMAIL },
            include: { gmailWatch: true },
          });
          if (!credential) return { ok: false };

          const now = Date.now();
          const existing = credential.gmailWatch;
          if (
            existing?.expirationMs &&
            Number(existing.expirationMs) > now + ONE_DAY_MS
          ) {
            return { ok: false };
          }

          let tokens: GmailTokenValue;
          try {
            const raw = decrypt(credential.value);
            tokens = JSON.parse(raw) as GmailTokenValue;
          } catch {
            return { ok: false };
          }

          tokens = await refreshGmailTokenIfNeeded(credentialId, tokens);

          const profileRes = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            },
          );
          if (!profileRes.ok) return { ok: false };
          const profile = (await profileRes.json()) as {
            emailAddress?: string;
            historyId?: string;
          };
          const emailAddress = profile.emailAddress?.trim();
          if (!emailAddress) return { ok: false };

          const watchRes = await fetch(
            "https://www.googleapis.com/gmail/v1/users/me/watch",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokens.access_token}`,
              },
              body: JSON.stringify({
                topicName,
              }),
            },
          );
          if (!watchRes.ok) {
            const err = await watchRes.text();
            console.error("Gmail watch failed:", watchRes.status, err);
            return { ok: false };
          }

          const watchBody = (await watchRes.json()) as {
            historyId?: string;
            expiration?: string;
          };
          const expirationMs = watchBody.expiration
            ? Number(watchBody.expiration)
            : null;
          const historyId = watchBody.historyId?.toString() ?? null;

          await prisma.gmailWatch.upsert({
            where: { credentialId },
            create: {
              credentialId,
              emailAddress: emailAddress.toLowerCase(),
              historyId,
              expirationMs: expirationMs != null ? BigInt(expirationMs) : null,
            },
            update: {
              emailAddress: emailAddress.toLowerCase(),
              historyId,
              expirationMs: expirationMs != null ? BigInt(expirationMs) : null,
            },
          });

          return { ok: true };
        },
      );
      if (result?.ok) registered++;
    }

    return { registered };
  },
);

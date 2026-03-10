import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailChannel } from "@/inngest/channels/gmail";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context: unknown) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailTokenValue = {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number;
};

type GmailData = {
  variableName?: string;
  credentialId?: string;
  to?: string;
  subject?: string;
  body?: string;
  attachmentsManual?: Array<{ filename: string; contentBase64: string }>;
  attachmentsVariable?: string;
  showAttachmentOptions?: boolean;
  action?: "send" | "draft" | "get";
  from?: string;
  hasAttachment?: boolean;
  attachmentType?: string;
  subjectContains?: string;
};

type AttachmentPart = { filename: string; contentBase64: string };

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  filename?: string;
  headers?: Array<{ name?: string; value?: string }>;
  parts?: GmailPart[];
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
  hasAttachments: boolean;
  attachments: NormalizedAttachment[];
  labelIds?: string[];
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
  const payload = full.payload;
  let body: string | undefined;
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  } else {
    body = extractBodyFromParts(payload?.parts);
  }
  const attachments = collectAttachmentParts(payload?.parts);
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

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function resolveAttachmentsVariable(
  context: Record<string, unknown>,
  variablePath: string | undefined,
): AttachmentPart[] {
  if (!variablePath?.trim()) return [];

  const path = variablePath
    .replace(/\{\{\s*|\s*\}\}/g, "")
    .trim();
  if (!path) return [];

  const value = getByPath(context, path);
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const filename = typeof o.filename === "string" ? o.filename : undefined;
      if (!filename) return null;
      let contentBase64: string | undefined;
      if (typeof o.contentBase64 === "string") {
        contentBase64 = o.contentBase64;
      } else if (typeof o.content === "string") {
        contentBase64 = Buffer.from(o.content, "utf-8").toString("base64");
      }
      if (!contentBase64) return null;
      return { filename, contentBase64 };
    })
    .filter((a): a is AttachmentPart => a !== null);
}

/** Base64url (Gmail API) to standard base64 for MIME. */
function base64UrlToBase64(data: string): string {
  let b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  return b64;
}

/**
 * When the variable points to Gmail-style attachments (metadata with attachmentId but no content),
 * fetch each attachment via Gmail API and return { filename, contentBase64 }.
 */
async function fetchGmailAttachmentsFromVariable(
  context: Record<string, unknown>,
  variablePath: string,
  accessToken: string,
): Promise<AttachmentPart[]> {
  const path = variablePath.replace(/\{\{\s*|\s*\}\}/g, "").trim();
  if (!path) return [];

  const value = getByPath(context, path);
  if (!Array.isArray(value) || value.length === 0) return [];

  const parts = path.split(".");
  const basePath = parts.slice(0, -1).join(".");
  const messageId =
    basePath ? (getByPath(context, `${basePath}.messageId`) as string | undefined) : undefined;
  if (!messageId || typeof messageId !== "string") return [];

  const results: AttachmentPart[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const attachmentId = typeof o.attachmentId === "string" ? o.attachmentId : undefined;
    const filename =
      typeof o.filename === "string" ? o.filename.trim() || `attachment-${results.length}` : `attachment-${results.length}`;
    if (!attachmentId) continue;

    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) continue;
    const json = (await res.json()) as { data?: string };
    const data = json.data;
    if (typeof data !== "string") continue;
    const contentBase64 = base64UrlToBase64(data);
    results.push({ filename, contentBase64 });
  }
  return results;
}

/** Extract valid email(s) from a To header value (e.g. from Gmail API) so it can be reused in send/draft. */
function normalizeToHeader(value: string): string {
  const trimmed = value.replace(/[\r\n]+/g, " ").trim();
  if (!trimmed) return trimmed;
  // Angle-bracket form: "display" <addr> or ""weird"" <addr> — use the addr part(s).
  const angleMatches = trimmed.matchAll(/<\s*([^>]+)\s*>/g);
  const fromAngles = [...angleMatches].map((m) => m[1].trim()).filter(Boolean);
  if (fromAngles.length > 0) return fromAngles.join(", ");
  // Plain email(s): allow simple addr-spec.
  const emailLike = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const plain = trimmed.match(emailLike);
  if (plain?.length) return plain.join(", ");
  return trimmed;
}

function buildSimpleMime(to: string, subject: string, body: string): string {
  const lines = [
    "MIME-Version: 1.0",
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body.replace(/\r?\n/g, "\r\n"),
  ];
  return lines.join("\r\n");
}

function buildMultipartMime(
  to: string,
  subject: string,
  body: string,
  attachments: AttachmentPart[],
): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const CRLF = "\r\n";

  // RFC 2046: each part is preceded by --boundary CRLF, then headers, then CRLF, then body.
  // Parts are separated by CRLF before the next boundary line.
  let mime = "";

  // Message headers
  mime += `MIME-Version: 1.0${CRLF}`;
  mime += `To: ${to}${CRLF}`;
  mime += `Subject: ${subject}${CRLF}`;
  mime += `Content-Type: multipart/mixed; boundary="${boundary}"${CRLF}`;
  mime += CRLF; // blank line after headers

  // Body part
  const normalizedBody = body.replace(/\r?\n/g, CRLF);
  mime += `--${boundary}${CRLF}`;
  mime += `Content-Type: text/plain; charset=UTF-8${CRLF}`;
  mime += `Content-Transfer-Encoding: 7bit${CRLF}`;
  mime += CRLF; // blank line between headers and content
  mime += normalizedBody;
  mime += CRLF;

  // Attachment parts
  for (const att of attachments) {
    const safeName = att.filename.replace(/[\r\n"]/g, "");
    // Wrap base64 at 76 chars per line
    const b64 = att.contentBase64.replace(/[^A-Za-z0-9+/=]/g, "");
    const b64Wrapped = b64.match(/.{1,76}/g)?.join(CRLF) ?? b64;

    mime += `--${boundary}${CRLF}`;
    mime += `Content-Type: application/octet-stream; name="${safeName}"${CRLF}`;
    mime += `Content-Transfer-Encoding: base64${CRLF}`;
    mime += `Content-Disposition: attachment; filename="${safeName}"${CRLF}`;
    mime += CRLF; // blank line between headers and content
    mime += b64Wrapped;
    mime += CRLF;
  }

  // Closing boundary
  mime += `--${boundary}--${CRLF}`;

  return mime;
}

function toBase64Url(mime: string): string {
  return Buffer.from(mime, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const gmailExecutor: NodeExecutor<GmailData> = async ({
  data,
  nodeId,
  organizationId,
  context,
  step,
  publish,
}) => {
  await publish(
    gmailChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    await publish(
      gmailChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError("Gmail node: Variable name is missing");
  }

  if (!data.credentialId) {
    await publish(
      gmailChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError("Gmail node: Credential is required");
  }

  if (data.action === "get") {
    const credential = await step.run("get-credential-get", () =>
      prisma.credential.findUnique({
        where: { id: data.credentialId, organizationId },
      }),
    );

    if (!credential) {
      await publish(gmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gmail node: Credential not found");
    }

    let tokens: GmailTokenValue;
    try {
      tokens = JSON.parse(decrypt(credential.value)) as GmailTokenValue;
    } catch {
      await publish(gmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gmail node: Invalid credential value");
    }

    const now = Date.now();
    if (tokens.expiry_date && tokens.expiry_date <= now + 60_000) {
      tokens = await step.run("refresh-token-get", async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret || !tokens.refresh_token) {
          throw new NonRetriableError("Gmail node: Cannot refresh token");
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
        if (!res.ok) throw new NonRetriableError("Gmail node: Token refresh failed");
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

    const email = await step.run("fetch-email-get", async () => {
      const queryParts: string[] = [];
      if (data.from?.trim()) queryParts.push(`from:${data.from.trim()}`);
      if (data.subjectContains?.trim()) queryParts.push(`subject:${data.subjectContains.trim()}`);
      if (data.hasAttachment) queryParts.push("has:attachment");
      if (data.attachmentType?.trim()) queryParts.push(`filename:${data.attachmentType.trim()}`);
      const q = queryParts.join(" ");

      const listParams = new URLSearchParams({ maxResults: "1" });
      if (q) listParams.set("q", q);

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams.toString()}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!listRes.ok) {
        const status = listRes.status;
        if (status === 403) {
          throw new NonRetriableError(
            "Gmail API error: 403 Forbidden — your Gmail credential is missing the required read permissions. Please reconnect your Gmail account from the Credentials page.",
          );
        }
        throw new NonRetriableError(`Gmail API error: ${status}`);
      }

      const listJson = (await listRes.json()) as { messages?: Array<{ id: string }> };
      const msgId = listJson.messages?.[0]?.id;
      if (!msgId) return null;

      const getRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!getRes.ok) {
        const status = getRes.status;
        if (status === 403) {
          throw new NonRetriableError(
            "Gmail API error: 403 Forbidden — your Gmail credential is missing the required read permissions. Please reconnect your Gmail account from the Credentials page.",
          );
        }
        throw new NonRetriableError(`Gmail API error: ${status}`);
      }

      return normalizeGmailMessage(
        (await getRes.json()) as Parameters<typeof normalizeGmailMessage>[0],
      );
    });

    await publish(gmailChannel().status({ nodeId, status: "success" }));
    return {
      ...context,
      [data.variableName]: email,
    };
  }

  if (!data.to || !data.subject || !data.body) {
    await publish(
      gmailChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError(
      "Gmail node: To, Subject, and Body are required",
    );
  }

  const credential = await step.run("get-credential", () => {
    return prisma.credential.findUnique({
      where: {
        id: data.credentialId,
        organizationId,
      },
    });
  });

  if (!credential) {
    await publish(
      gmailChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError("Gmail node: Credential not found");
  }

  let tokens: GmailTokenValue;
  try {
    const raw = decrypt(credential.value);
    tokens = JSON.parse(raw) as GmailTokenValue;
  } catch {
    await publish(
      gmailChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError("Gmail node: Invalid credential value");
  }

  const now = Date.now();
  const bufferMs = 60 * 1000;
  if (tokens.expiry_date && tokens.expiry_date <= now + bufferMs) {
    const refreshed = await step.run("refresh-gmail-token", async () => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret || !tokens.refresh_token) {
        throw new NonRetriableError(
          "Gmail node: Cannot refresh token (missing refresh_token or env)",
        );
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
      if (!res.ok) {
        const err = await res.text();
        throw new NonRetriableError(
          `Gmail node: Token refresh failed: ${err.slice(0, 200)}`,
        );
      }
      const body = (await res.json()) as {
        access_token: string;
        expires_in: number;
      };
      const expiryDate = Date.now() + body.expires_in * 1000;
      const newValue = JSON.stringify({
        access_token: body.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: expiryDate,
      });
      await prisma.credential.update({
        where: { id: credential.id },
        data: { value: encrypt(newValue) },
      });
      return {
        access_token: body.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: expiryDate,
      } as GmailTokenValue;
    });
    tokens = refreshed;
  }

  let to = Handlebars.compile(data.to)(context);
  const subject = Handlebars.compile(data.subject)(context);
  const body = Handlebars.compile(data.body)(context);

  if (typeof to !== "string") to = String(to ?? "");
  to = normalizeToHeader(to);
  if (!to) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Gmail node: To header is empty or invalid after resolving variables. Use a valid email address.",
    );
  }
  const subjectLine =
    typeof subject === "string" ? subject.replace(/[\r\n]+/g, " ").trim() : String(subject ?? "");

  const useAttachments = data.showAttachmentOptions !== false;
  const manualAttachments: AttachmentPart[] =
    useAttachments && Array.isArray(data.attachmentsManual)
      ? data.attachmentsManual
      : [];
  let variableAttachments: AttachmentPart[] =
    useAttachments && data.attachmentsVariable
      ? resolveAttachmentsVariable(context, data.attachmentsVariable)
      : [];
  const attachmentsVar = data.attachmentsVariable?.trim();
  if (
    variableAttachments.length === 0 &&
    useAttachments &&
    attachmentsVar
  ) {
    variableAttachments = await step.run(
      "fetch-gmail-attachments",
      () =>
        fetchGmailAttachmentsFromVariable(
          context,
          attachmentsVar,
          tokens.access_token,
        ),
    );
  }
  const allAttachments = [...manualAttachments, ...variableAttachments];

  const mime =
    allAttachments.length === 0
      ? buildSimpleMime(to, subjectLine, body)
      : buildMultipartMime(to, subjectLine, body, allAttachments);

  const raw = toBase64Url(mime);
  const isDraft = data.action === "draft";

  try {
    const result = await step.run(
      isDraft ? "gmail-create-draft" : "gmail-send",
      async () => {
        const url = isDraft
          ? "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
          : "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
        const body = isDraft
          ? JSON.stringify({ message: { raw } })
          : JSON.stringify({ raw });

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
          body,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new NonRetriableError(
            `Gmail API error: ${res.status} ${err.slice(0, 300)}`,
          );
        }

        const json = (await res.json()) as
          | { id: string; threadId?: string }
          | { id: string; message: { id: string; threadId?: string } };

        if (isDraft) {
          const draft = json as { id: string; message: { id: string; threadId?: string } };
          return {
            draftId: draft.id,
            messageId: draft.message?.id,
            threadId: draft.message?.threadId,
          };
        }
        const message = json as { id: string; threadId?: string };
        return { messageId: message.id, threadId: message.threadId };
      },
    );

    await publish(
      gmailChannel().status({ nodeId, status: "success" }),
    );

    const key = data.variableName ?? "Gmail";
    const existing = context[key];
    const merged =
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>), sendResult: result }
        : { sendResult: result };

    return {
      ...context,
      [key]: merged,
    };
  } catch (error) {
    await publish(
      gmailChannel().status({ nodeId, status: "error" }),
    );
    throw error;
  }
};

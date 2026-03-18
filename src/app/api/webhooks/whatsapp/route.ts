import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { CredentialType, NodeType } from "@/generated/prisma";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
          audio?: { id?: string; mime_type?: string; sha256?: string; voice?: boolean };
          video?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
          document?: { id?: string; mime_type?: string; sha256?: string; filename?: string; caption?: string };
          location?: { latitude?: number; longitude?: number; name?: string; address?: string };
          button?: { text?: string; payload?: string };
          interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
          context?: { from?: string; id?: string };
        }>;
        statuses?: Array<{ id?: string; status?: string; timestamp?: string; recipient_id?: string }>;
      };
    }>;
  }>;
};

// GET: Meta webhook verification challenge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check env var fallback (for self-hosted / manual setup)
  const envToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (envToken && token.trim() === envToken.trim()) {
    return new NextResponse(challenge, { status: 200 });
  }

  // The verify token is the credential ID — look it up directly (no decryption needed)
  const credential = await prisma.credential.findFirst({
    where: { id: token.trim(), type: CredentialType.WHATSAPP },
  });

  if (credential) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Incoming WhatsApp messages from Meta
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    const hmac = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    if (
      !signature ||
      signature.length !== hmac.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(hmac))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: MetaWebhookPayload;
  try {
    body = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle whatsapp_business_account object
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ok" });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const message of value.messages) {
        // Skip status updates and non-message events
        if (!message.id) continue;

        const contact = value.contacts?.[0];
        const senderName = contact?.profile?.name ?? undefined;
        const from = message.from ?? contact?.wa_id ?? "";

        // Build normalized message context
        const whatsapp: Record<string, unknown> = {
          messageId: message.id,
          from,
          senderName,
          phoneNumberId,
          displayPhoneNumber: value.metadata?.display_phone_number,
          timestamp: message.timestamp,
          type: message.type ?? "unknown",
        };

        switch (message.type) {
          case "text":
            whatsapp.text = message.text?.body;
            break;
          case "image":
            whatsapp.image = message.image;
            break;
          case "audio":
            whatsapp.audio = message.audio;
            break;
          case "video":
            whatsapp.video = message.video;
            break;
          case "document":
            whatsapp.document = message.document;
            break;
          case "location":
            whatsapp.location = message.location;
            break;
          case "button":
            whatsapp.button = message.button;
            break;
          case "interactive":
            whatsapp.interactive = message.interactive;
            break;
        }

        if (message.context) {
          whatsapp.context = message.context;
        }

        // Find matching WHATSAPP_TRIGGER nodes by phoneNumberId
        await triggerMatchingWorkflows(phoneNumberId, whatsapp);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function triggerMatchingWorkflows(
  phoneNumberId: string,
  whatsapp: Record<string, unknown>,
) {
  // Load all WhatsApp credentials and find matching phone number ID
  const credentials = await prisma.credential.findMany({
    where: { type: CredentialType.WHATSAPP },
  });

  const matchingCredentialIds: string[] = [];
  for (const cred of credentials) {
    try {
      const raw = decrypt(cred.value).trim();
      if (raw.startsWith("{")) {
        const parsed = JSON.parse(raw) as { phoneNumberId?: string };
        if (parsed.phoneNumberId?.trim() === phoneNumberId.trim()) {
          matchingCredentialIds.push(cred.id);
        }
      }
    } catch {
      // ignore invalid credentials
    }
  }

  if (matchingCredentialIds.length === 0) return;

  // Find all WHATSAPP_TRIGGER nodes using those credentials
  const nodes = await prisma.node.findMany({
    where: { type: NodeType.WHATSAPP_TRIGGER },
    select: { id: true, workflowId: true, data: true },
  });

  const matchingNodes = nodes.filter((node) => {
    const data = node.data as { credentialId?: string };
    return data.credentialId && matchingCredentialIds.includes(data.credentialId);
  });

  for (const node of matchingNodes) {
    await sendWorkflowExecution({
      workflowId: node.workflowId,
      initialData: { whatsapp },
    }).catch((err) => {
      console.error("WhatsApp trigger: failed to send workflow execution", err);
    });
  }
}

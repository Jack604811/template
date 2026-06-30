import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { ChannelType, CredentialType, MessageRole, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { MEDIA_BUCKET, supabase } from "@/lib/supabase";
import { qstash } from "@/lib/upstash";

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
          sticker?: { id?: string; mime_type?: string; sha256?: string; animated?: boolean };
          location?: { latitude?: number; longitude?: number; name?: string; address?: string };
          button?: { text?: string; payload?: string };
          interactive?: { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
          context?: { from?: string; id?: string };
          reaction?: { message_id?: string; emoji?: string };
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

  console.log("=== WhatsApp webhook POST ===");

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

      // Handle delivery/read status updates
      for (const s of value?.statuses ?? []) {
        if (!s.id || !s.status) continue;
        console.log("[webhook] STATUS UPDATE:", s.id, s.status);
        const statusMap: Record<string, "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
          sent: "SENT",
          delivered: "DELIVERED",
          read: "READ",
          failed: "FAILED",
        };
        const mapped = statusMap[s.status];
        if (!mapped) continue;
        const updated = await prisma.message.updateMany({
          where: { externalId: s.id },
          data: { status: mapped },
        });
        console.log("[webhook] STATUS ROWS UPDATED:", updated.count);
      }

      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const message of value.messages) {
        if (!message.id) continue;

        const contact = value.contacts?.[0];
        const senderName = contact?.profile?.name ?? undefined;
        const from = message.from ?? contact?.wa_id ?? "";

        console.log("[webhook] RAW MESSAGE:", JSON.stringify(message));

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

        // Reactions are handled inline — find the target message and upsert/delete the reaction row
        if (message.type === "reaction") {
          const targetExternalId = message.reaction?.message_id;
          const emoji = message.reaction?.emoji ?? "";
          if (targetExternalId) {
            const target = await prisma.message.findFirst({
              where: { externalId: targetExternalId },
              select: { id: true },
            });
            if (target) {
              if (emoji) {
                await prisma.messageReaction.upsert({
                  where: { messageId_userId: { messageId: target.id, userId: from } },
                  create: { messageId: target.id, userId: from, emoji },
                  update: { emoji },
                });
              } else {
                await prisma.messageReaction.deleteMany({
                  where: { messageId: target.id, userId: from },
                });
              }
              console.log("[webhook] REACTION", emoji || "(removed)", "on", targetExternalId);
            }
          }
          continue;
        }

        switch (message.type) {
          case "text":
            whatsapp.text = message.text?.body;
            break;
          case "image":
            whatsapp.mediaId = message.image?.id;
            whatsapp.mimeType = message.image?.mime_type ?? "image/jpeg";
            whatsapp.caption = message.image?.caption;
            break;
          case "audio":
            whatsapp.mediaId = message.audio?.id;
            whatsapp.mimeType = message.audio?.mime_type ?? "audio/ogg";
            break;
          case "video":
            whatsapp.mediaId = message.video?.id;
            whatsapp.mimeType = message.video?.mime_type ?? "video/mp4";
            whatsapp.caption = message.video?.caption;
            break;
          case "document":
            whatsapp.mediaId = message.document?.id;
            whatsapp.mimeType = message.document?.mime_type ?? "application/octet-stream";
            whatsapp.mediaFilename = message.document?.filename;
            whatsapp.caption = message.document?.caption;
            break;
          case "sticker":
            whatsapp.mediaId = message.sticker?.id;
            whatsapp.mimeType = message.sticker?.mime_type ?? "image/webp";
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

async function uploadWhatsAppMedia(
  rawMediaId: string,
  accessToken: string,
  mimeType: string,
  filename: string,
  orgId: string,
  platform: string,
  conversationId: string,
): Promise<string | null> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v22.0/${rawMediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      console.error(`[media-upload] Meta resolve failed ${metaRes.status}:`, await metaRes.text());
      return null;
    }
    const { url } = (await metaRes.json()) as { url?: string };
    if (!url) {
      console.error("[media-upload] No URL from Meta");
      return null;
    }

    const fileRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) {
      console.error(`[media-upload] File download failed ${fileRes.status}`);
      return null;
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const path = `${orgId}/${platform}/${conversationId}/${filename}`;

    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      console.error("[media-upload] Supabase upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("[media-upload] Unexpected error:", err);
    return null;
  }
}

async function triggerMatchingWorkflows(
  phoneNumberId: string,
  whatsapp: Record<string, unknown>,
) {
  const credentials = await prisma.credential.findMany({
    where: { type: CredentialType.WHATSAPP },
  });

  const matchingCredentials: { id: string; organizationId: string; accessToken: string }[] = [];
  for (const cred of credentials) {
    try {
      const raw = decrypt(cred.value).trim();
      if (raw.startsWith("{")) {
        const parsed = JSON.parse(raw) as { phoneNumberId?: string; value?: string };
        const stored = parsed.phoneNumberId?.trim();
        if (stored === phoneNumberId.trim()) {
          matchingCredentials.push({
            id: cred.id,
            organizationId: cred.organizationId,
            accessToken: parsed.value?.trim() ?? "",
          });
        }
      }
    } catch (e) {
      console.error(`WhatsApp webhook: failed to decrypt credential ${cred.id}`, e);
    }
  }

  if (matchingCredentials.length === 0) {
    console.log(`WhatsApp webhook: no credentials matched phoneNumberId="${phoneNumberId}"`);
    return;
  }
  console.log(`WhatsApp webhook: ${matchingCredentials.length} credential(s) matched`);

  const from = whatsapp.from as string;
  const senderName = whatsapp.senderName as string | undefined;
  const messageId = whatsapp.messageId as string;
  const msgType = whatsapp.type as string;
  const caption = whatsapp.caption as string | undefined;
  const waButton = whatsapp.button as { text?: string; payload?: string } | undefined;
  const waInteractive = whatsapp.interactive as { type?: string; button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } } | undefined;
  const interactiveReplyId = waInteractive?.button_reply?.id ?? waInteractive?.list_reply?.id;
  const interactiveReplyTitle = waInteractive?.button_reply?.title ?? waInteractive?.list_reply?.title;
  const isButtonReply = msgType === "button" || (msgType === "interactive" && !!interactiveReplyTitle);
  const buttonPayloadId = msgType === "button" ? waButton?.payload : interactiveReplyId;
  const content = msgType === "text"
    ? (whatsapp.text as string)
    : msgType === "button"
    ? (waButton?.text ?? "[button]")
    : interactiveReplyTitle
    ? interactiveReplyTitle
    : (caption ?? `[${msgType}]`);
  const mediaType = msgType === "text" ? null : isButtonReply ? "button" : msgType;
  const mediaId = whatsapp.mediaId as string | undefined;
  const mimeType = whatsapp.mimeType as string | undefined;
  const mediaFilename = whatsapp.mediaFilename as string | undefined;
  const location = whatsapp.location as { latitude?: number; longitude?: number; name?: string; address?: string } | undefined;
  const waContext = whatsapp.context as { from?: string; id?: string } | undefined;
  const timestamp = whatsapp.timestamp
    ? new Date(Number(whatsapp.timestamp) * 1000)
    : new Date();

  for (const cred of matchingCredentials) {
    try {
      let customer = await prisma.customer.findFirst({
        where: { organizationId: cred.organizationId, phone: from },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            organizationId: cred.organizationId,
            name: senderName ?? from,
            phone: from,
          },
        });
      } else if (senderName && customer.name !== senderName) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { name: senderName },
        });
      }

      const conversation = await prisma.conversation.upsert({
        where: {
          organizationId_channel_externalId: {
            organizationId: cred.organizationId,
            channel: ChannelType.WHATSAPP,
            externalId: from,
          },
        },
        update: {
          lastMessageAt: timestamp,
          lastMessageText: content,
          unreadCount: { increment: 1 },
          blocked: false,
          customerId: customer.id,
          ...(senderName ? { contactName: senderName } : {}),
        },
        create: {
          organizationId: cred.organizationId,
          channel: ChannelType.WHATSAPP,
          externalId: from,
          contactName: senderName,
          credentialId: cred.id,
          lastMessageAt: timestamp,
          lastMessageText: content,
          unreadCount: 1,
          customerId: customer.id,
        },
      });

      let mediaUrl: string | null = null;
      let resolvedFilename = mediaFilename;

      if (msgType === "location" && location?.latitude != null && location?.longitude != null) {
        mediaUrl = `geo:${location.latitude},${location.longitude}`;
        resolvedFilename = [location.name, location.address].filter(Boolean).join(" — ") || undefined;
      } else if (mediaId && mediaType && cred.accessToken) {
        const ext = mimeType?.split("/")[1] ?? "bin";
        const filename = mediaFilename ?? `${mediaId}.${ext}`;
        mediaUrl = await uploadWhatsAppMedia(
          mediaId,
          cred.accessToken,
          mimeType ?? "application/octet-stream",
          filename,
          cred.organizationId,
          "whatsapp",
          conversation.id,
        );
      }

      let replyToId: string | null = null;
      if (waContext?.id) {
        const replied = await prisma.message.findFirst({
          where: { conversationId: conversation.id, externalId: waContext.id },
          select: { id: true },
        });
        if (replied) replyToId = replied.id;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          externalId: messageId,
          role: MessageRole.USER,
          content,
          mediaType,
          mediaId,
          mediaUrl,
          mediaFilename: buttonPayloadId
            ? JSON.stringify({ payload: buttonPayloadId })
            : resolvedFilename,
          replyToId,
          timestamp,
        },
      });
    } catch (err) {
      console.error("WhatsApp webhook: failed to persist conversation/message", err);
    }
  }

  const matchingCredentialIds = matchingCredentials.map((c) => c.id);
  const nodes = await prisma.node.findMany({
    where: { type: NodeType.WHATSAPP_TRIGGER },
    select: { id: true, workflowId: true, data: true },
  });

  const matchingNodes = nodes.filter((node) => {
    const data = node.data as { credentialId?: string };
    return data.credentialId && matchingCredentialIds.includes(data.credentialId);
  });

  const baseUrl = process.env.QSTASH_BASE_URL;
  console.log(`WhatsApp trigger: ${matchingNodes.length} matching workflow(s), baseUrl=${baseUrl}`);
  for (const node of matchingNodes) {
    const url = `${baseUrl}/api/chat/run`;
    console.log(`WhatsApp trigger: enqueuing workflowId=${node.workflowId} → ${url}`);
    await qstash
      .publishJSON({ url, body: { workflowId: node.workflowId, whatsapp } })
      .then(() => console.log(`WhatsApp trigger: enqueued workflowId=${node.workflowId}`))
      .catch((err) => {
        console.error("WhatsApp trigger: failed to enqueue chat run", err);
      });
  }
}

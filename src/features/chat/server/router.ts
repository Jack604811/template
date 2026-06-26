import { z } from "zod";
import { ChannelType, MessageRole } from "@/generated/prisma";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { MEDIA_BUCKET, supabase } from "@/lib/supabase";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";

async function resolveCredential(credentialId: string) {
  const credential = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!credential) throw new Error("Credential not found");
  let accessToken = "";
  let phoneNumberId = "";
  try {
    const raw = decrypt(credential.value).trim();
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { value?: string; phoneNumberId?: string };
      accessToken = parsed.value?.trim() ?? "";
      phoneNumberId = parsed.phoneNumberId?.trim() ?? "";
    } else {
      accessToken = raw;
    }
  } catch {
    throw new Error("Failed to decrypt credential");
  }
  if (!accessToken) throw new Error("Access token missing");
  if (!phoneNumberId) throw new Error("Phone number ID missing");
  return { accessToken, phoneNumberId };
}

function buildWhatsAppPayload(
  to: string,
  content: string,
  mediaUrl?: string,
  mediaType?: string,
  mediaFilename?: string,
  caption?: string,
  replyToExternalId?: string,
) {
  const context = replyToExternalId ? { context: { message_id: replyToExternalId } } : {};

  if (mediaType === "interactive_carousel") {
    type CarouselCard = {
      title?: string; description?: string; imageUrl?: string;
      buttonText?: string; buttonUrl?: string;
      quickReplies?: { id: string; title: string }[];
    };
    let cards: CarouselCard[] = [];
    try {
      const parsed = JSON.parse(mediaFilename ?? "{}") as { cards?: CarouselCard[] };
      cards = parsed.cards ?? [];
    } catch {}
    return {
      messaging_product: "whatsapp", to, type: "interactive",
      interactive: {
        type: "carousel",
        body: { text: content },
        action: {
          cards: cards.map((card, i) => ({
            card_index: i,
            type: "cta_url",
            header: {
              type: "image",
              image: { link: card.imageUrl ?? "" },
            },
            body: {
              text: [card.title ? `*${card.title}*` : "", card.description ?? ""]
                .filter(Boolean)
                .join("\n\n"),
            },
            action: card.quickReplies?.length
              ? {
                  buttons: card.quickReplies.map((qr) => ({
                    type: "quick_reply",
                    quick_reply: { id: qr.id, title: qr.title },
                  })),
                }
              : {
                  name: "cta_url",
                  parameters: {
                    display_text: card.buttonText ?? "Open",
                    url: card.buttonUrl ?? "",
                  },
                },
          })),
        },
      },
      ...context,
    };
  }

  if (!mediaUrl || !mediaType) {
    return { messaging_product: "whatsapp", to, type: "text", text: { body: content }, ...context };
  }
  if (mediaType === "image") {
    return { messaging_product: "whatsapp", to, type: "image", image: { link: mediaUrl, ...(caption ? { caption } : {}) }, ...context };
  }
  if (mediaType === "video") {
    return { messaging_product: "whatsapp", to, type: "video", video: { link: mediaUrl, ...(caption ? { caption } : {}) }, ...context };
  }
  if (mediaType === "audio") {
    return { messaging_product: "whatsapp", to, type: "audio", audio: { link: mediaUrl }, ...context };
  }
  if (mediaType === "interactive_cta_url") {
    let displayText = "Open";
    let footer: string | undefined;
    let headerImageUrl: string | undefined;
    try {
      const parsed = JSON.parse(mediaFilename ?? "{}") as {
        displayText?: string;
        footer?: string;
        headerImageUrl?: string;
      };
      displayText = parsed.displayText ?? "Open";
      footer = parsed.footer;
      headerImageUrl = parsed.headerImageUrl;
    } catch {}
    const interactive: Record<string, unknown> = {
      type: "cta_url",
      body: { text: content },
      action: { name: "cta_url", parameters: { display_text: displayText, url: mediaUrl } },
    };
    if (headerImageUrl) interactive.header = { type: "image", image: { link: headerImageUrl } };
    if (footer) interactive.footer = { text: footer };
    return { messaging_product: "whatsapp", to, type: "interactive", interactive, ...context };
  }
  return {
    messaging_product: "whatsapp", to, type: "document",
    document: { link: mediaUrl, filename: mediaFilename ?? "file", ...(caption ? { caption } : {}) },
    ...context,
  };
}

export const chatRouter = createTRPCRouter({
  getConversations: organizationProcedure
    .input(
      z.object({
        channel: z.nativeEnum(ChannelType).optional(),
        search: z.string().default(""),
        joined: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { channel, search, joined } = input;
      return prisma.conversation.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(channel ? { channel } : {}),
          ...(search
            ? {
                OR: [
                  { contactName: { contains: search, mode: "insensitive" } },
                  { externalId: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(joined ? { participants: { some: { userId: ctx.auth.user.id } } } : {}),
        },
        include: { tags: { select: { tagId: true } } },
        orderBy: { lastMessageAt: "desc" },
        take: 100,
      });
    }),

  getMessages: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      const userId = ctx.auth.user.id;
      const msgs = await prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { timestamp: "desc" },
        take: 100,
        include: {
          replyTo: {
            select: { id: true, role: true, content: true, mediaType: true, mediaUrl: true, mediaFilename: true },
          },
        },
      });
      const rawReactions = await prisma.messageReaction.findMany({
        where: { messageId: { in: msgs.map((m) => m.id) } },
        select: { messageId: true, emoji: true, userId: true },
      });
      const reactionMap = new Map<string, { emoji: string; count: number; byMe: boolean }[]>();
      for (const r of rawReactions) {
        const list = reactionMap.get(r.messageId) ?? [];
        const existing = list.find((x) => x.emoji === r.emoji);
        if (existing) {
          existing.count++;
          if (r.userId === userId) existing.byMe = true;
        } else {
          list.push({ emoji: r.emoji, count: 1, byMe: r.userId === userId });
          reactionMap.set(r.messageId, list);
        }
      }
      return msgs.reverse().map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        externalId: m.externalId,
        role: m.role,
        content: m.content,
        mediaType: m.mediaType,
        mediaId: m.mediaId,
        mediaUrl: m.mediaUrl,
        mediaFilename: m.mediaFilename,
        timestamp: m.timestamp,
        replyToId: m.replyToId,
        replyTo: m.replyTo,
        deletedAt: m.deletedAt,
        status: m.status,
        starred: m.starred,
        reactions: reactionMap.get(m.id) ?? [] as { emoji: string; count: number; byMe: boolean }[],
      }));
    }),

  sendMessage: organizationProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string(),
      mediaUrl: z.string().optional(),
      mediaType: z.string().optional(),
      mediaFilename: z.string().optional(),
      replyToId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const userName = ctx.auth.user.name ?? ctx.auth.user.email ?? "Agent";

      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      if (!conversation.credentialId) throw new Error("No WhatsApp credential linked to this conversation");

      const existing = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId } },
      });

      let joinSystemMessage: Awaited<ReturnType<typeof prisma.message.create>> | null = null;
      if (!existing) {
        const joinedAt = new Date();
        [, joinSystemMessage] = await prisma.$transaction([
          prisma.conversationParticipant.create({
            data: { conversationId: input.conversationId, userId, userName },
          }),
          prisma.message.create({
            data: {
              conversationId: input.conversationId,
              role: "SYSTEM",
              content: `${userName} se ha unido a la conversación`,
              timestamp: joinedAt,
            },
          }),
        ]);
      }

      const credential = await prisma.credential.findUnique({
        where: { id: conversation.credentialId },
      });
      if (!credential) throw new Error("Credential not found");

      let accessToken = "";
      let phoneNumberId = "";
      try {
        const raw = decrypt(credential.value).trim();
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as { value?: string; phoneNumberId?: string };
          accessToken = parsed.value?.trim() ?? "";
          phoneNumberId = parsed.phoneNumberId?.trim() ?? "";
        } else {
          accessToken = raw;
        }
      } catch {
        throw new Error("Failed to decrypt credential");
      }

      if (!accessToken) throw new Error("Access token missing");
      if (!phoneNumberId) throw new Error("Phone number ID missing");

      let replyToExternalId: string | undefined;
      if (input.replyToId) {
        const repliedMsg = await prisma.message.findUnique({
          where: { id: input.replyToId },
          select: { externalId: true },
        });
        replyToExternalId = repliedMsg?.externalId ?? undefined;
      }

      const caption = input.content.trim() || undefined;
      const waPayload = buildWhatsAppPayload(
        conversation.externalId,
        input.content,
        input.mediaUrl,
        input.mediaType,
        input.mediaFilename,
        caption,
        replyToExternalId,
      );

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(waPayload),
        },
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("[sendMessage] WhatsApp API error:", res.status, err);
        console.error("[sendMessage] Payload:", JSON.stringify(waPayload));
        throw new Error(`WhatsApp API error ${res.status}: ${err.slice(0, 400)}`);
      }

      const json = (await res.json()) as { messages?: Array<{ id: string }> };
      const wamid = json.messages?.[0]?.id;

      const stored = input.mediaType
        ? (input.content.trim() || `[${input.mediaType}]`)
        : input.content;

      const now = new Date();
      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            externalId: wamid,
            role: MessageRole.ASSISTANT,
            content: stored,
            mediaType: input.mediaType ?? null,
            mediaUrl: input.mediaUrl ?? null,
            mediaFilename: input.mediaFilename ?? null,
            replyToId: input.replyToId ?? null,
            timestamp: now,
          },
          include: {
            replyTo: {
              select: { id: true, role: true, content: true, mediaType: true, mediaUrl: true, mediaFilename: true },
            },
          },
        }),
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageText: stored, lastMessageAt: now },
        }),
      ]);

      return { message, joinSystemMessage };
    }),

  sendTemplate: organizationProcedure
    .input(z.object({
      conversationId: z.string(),
      templateName: z.string(),
      templateLanguage: z.string(),
      previewText: z.string(),
      bodyParameters: z.array(z.string()).default([]),
      headerParameters: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      if (!conversation.credentialId) throw new Error("No WhatsApp credential linked");

      const credential = await prisma.credential.findUnique({ where: { id: conversation.credentialId } });
      if (!credential) throw new Error("Credential not found");

      let accessToken = "";
      let phoneNumberId = "";
      try {
        const raw = decrypt(credential.value).trim();
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as { value?: string; phoneNumberId?: string };
          accessToken = parsed.value?.trim() ?? "";
          phoneNumberId = parsed.phoneNumberId?.trim() ?? "";
        } else {
          accessToken = raw;
        }
      } catch {
        throw new Error("Failed to decrypt credential");
      }
      if (!accessToken) throw new Error("Access token missing");
      if (!phoneNumberId) throw new Error("Phone number ID missing");

      const components: object[] = [];
      if (input.headerParameters.length > 0) {
        components.push({
          type: "header",
          parameters: input.headerParameters.map((text) => ({ type: "text", text })),
        });
      }
      if (input.bodyParameters.length > 0) {
        components.push({
          type: "body",
          parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
        });
      }

      const waPayload = {
        messaging_product: "whatsapp",
        to: conversation.externalId,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.templateLanguage },
          ...(components.length > 0 ? { components } : {}),
        },
      };

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(waPayload),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`WhatsApp API error: ${err.slice(0, 200)}`);
      }

      const json = (await res.json()) as { messages?: Array<{ id: string }> };
      const wamid = json.messages?.[0]?.id;
      const stored = input.previewText || `[template: ${input.templateName}]`;
      const now = new Date();

      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            externalId: wamid,
            role: MessageRole.ASSISTANT,
            content: stored,
            timestamp: now,
          },
        }),
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageText: stored, lastMessageAt: now },
        }),
      ]);

      return message;
    }),

  sendCatalogMessage: organizationProcedure
    .input(z.object({
      conversationId: z.string(),
      type: z.enum(["catalog", "product"]),
      catalogId: z.string(),
      productRetailerId: z.string().optional(),
      bodyText: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      if (!conversation.credentialId) throw new Error("No WhatsApp credential linked");

      const credential = await prisma.credential.findUnique({ where: { id: conversation.credentialId } });
      if (!credential) throw new Error("Credential not found");

      let accessToken = "";
      let phoneNumberId = "";
      try {
        const raw = decrypt(credential.value).trim();
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as { value?: string; phoneNumberId?: string };
          accessToken = parsed.value?.trim() ?? "";
          phoneNumberId = parsed.phoneNumberId?.trim() ?? "";
        } else {
          accessToken = raw;
        }
      } catch {
        throw new Error("Failed to decrypt credential");
      }
      if (!accessToken) throw new Error("Access token missing");
      if (!phoneNumberId) throw new Error("Phone number ID missing");

      let interactive: object;
      if (input.type === "catalog") {
        interactive = {
          type: "catalog_message",
          body: { text: input.bodyText || "Explora nuestro catálogo" },
          action: {
            name: "catalog_message",
            parameters: input.productRetailerId
              ? { thumbnail_product_retailer_id: input.productRetailerId }
              : {},
          },
        };
      } else {
        if (!input.productRetailerId) throw new Error("productRetailerId required for product type");
        interactive = {
          type: "product",
          body: input.bodyText ? { text: input.bodyText } : undefined,
          action: { catalog_id: input.catalogId, product_retailer_id: input.productRetailerId },
        };
      }

      const waPayload = { messaging_product: "whatsapp", to: conversation.externalId, type: "interactive", interactive };

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(waPayload),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`WhatsApp API error: ${err.slice(0, 200)}`);
      }

      const json = (await res.json()) as { messages?: Array<{ id: string }> };
      const wamid = json.messages?.[0]?.id;
      const stored = input.type === "product" ? "[product]" : "[catalog]";
      const now = new Date();

      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            externalId: wamid,
            role: MessageRole.ASSISTANT,
            content: stored,
            timestamp: now,
          },
        }),
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageText: stored, lastMessageAt: now },
        }),
      ]);

      return message;
    }),

  leaveConversation: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const userName = ctx.auth.user.name ?? ctx.auth.user.email ?? "Agent";

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId } },
      });
      if (!participant) return;

      const [, leaveSystemMessage] = await prisma.$transaction([
        prisma.conversationParticipant.delete({
          where: { conversationId_userId: { conversationId: input.conversationId, userId } },
        }),
        prisma.message.create({
          data: {
            conversationId: input.conversationId,
            role: "SYSTEM",
            content: `${userName} ha abandonado la conversación`,
            timestamp: new Date(),
          },
        }),
      ]);

      return { leaveSystemMessage };
    }),

  joinConversation: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const userName = ctx.auth.user.name ?? ctx.auth.user.email ?? "Agent";

      const existing = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId } },
      });
      if (existing) return null;

      const joinedAt = new Date();
      const [, joinSystemMessage] = await prisma.$transaction([
        prisma.conversationParticipant.create({
          data: { conversationId: input.conversationId, userId, userName },
        }),
        prisma.message.create({
          data: {
            conversationId: input.conversationId,
            role: "SYSTEM",
            content: `${userName} se ha unido a la conversación`,
            timestamp: joinedAt,
          },
        }),
      ]);

      return joinSystemMessage;
    }),

  checkParticipant: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.auth.user.id } },
      });
      return !!participant;
    }),

  markAsRead: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.conversation.updateMany({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
        data: { unreadCount: 0 },
      });
    }),

  updateNotes: organizationProcedure
    .input(z.object({ conversationId: z.string(), notes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.conversation.updateMany({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
        data: { notes: input.notes || null },
      });
    }),

  blockContact: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      if (!conversation.credentialId) throw new Error("No WhatsApp credential linked");

      const { accessToken, phoneNumberId } = await resolveCredential(conversation.credentialId);

      const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/block_users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          block_users: [{ user: conversation.externalId }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`WhatsApp API error: ${err.slice(0, 200)}`);
      }

      const userName = ctx.auth.user.name ?? ctx.auth.user.email ?? "Agente";
      return prisma.$transaction([
        prisma.conversation.update({
          where: { id: input.conversationId },
          data: { blocked: true },
        }),
        prisma.message.create({
          data: {
            conversationId: input.conversationId,
            role: "SYSTEM",
            content: `${userName} bloqueó este contacto`,
            timestamp: new Date(),
          },
        }),
      ]);
    }),

  unblockContact: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      if (!conversation.credentialId) throw new Error("No WhatsApp credential linked");

      const { accessToken, phoneNumberId } = await resolveCredential(conversation.credentialId);

      const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/block_users`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          block_users: [{ user: conversation.externalId }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`WhatsApp API error: ${err.slice(0, 200)}`);
      }

      const userName = ctx.auth.user.name ?? ctx.auth.user.email ?? "Agente";
      return prisma.$transaction([
        prisma.conversation.update({
          where: { id: input.conversationId },
          data: { blocked: false },
        }),
        prisma.message.create({
          data: {
            conversationId: input.conversationId,
            role: "SYSTEM",
            content: `${userName} desbloqueó este contacto`,
            timestamp: new Date(),
          },
        }),
      ]);
    }),

  toggleReaction: organizationProcedure
    .input(z.object({ messageId: z.string(), emoji: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;

      const message = await prisma.message.findUnique({
        where: { id: input.messageId },
        select: { externalId: true, conversationId: true },
      });
      if (!message) throw new Error("Message not found");

      const conversation = await prisma.conversation.findFirst({
        where: { id: message.conversationId, organizationId: ctx.organizationId },
        select: { channel: true, externalId: true, credentialId: true },
      });
      if (!conversation) throw new Error("Conversation not found");

      const isWhatsApp =
        conversation.channel === ChannelType.WHATSAPP &&
        conversation.credentialId != null &&
        message.externalId != null;

      let isRemove: boolean;

      if (isWhatsApp) {
        // WhatsApp: customer has 1 reaction slot (userId = their phone = conversation.externalId)
        // and the org has 1 reaction slot shared across all team members.
        // Preserve the customer's reaction; only replace among org members.
        const myExisting = await prisma.messageReaction.findUnique({
          where: { messageId_userId: { messageId: input.messageId, userId } },
        });
        isRemove = myExisting?.emoji === input.emoji;
        await prisma.messageReaction.deleteMany({
          where: { messageId: input.messageId, userId: { not: conversation.externalId } },
        });
        if (!isRemove) {
          await prisma.messageReaction.create({
            data: { messageId: input.messageId, userId, emoji: input.emoji },
          });
        }
      } else {
        const existing = await prisma.messageReaction.findUnique({
          where: { messageId_userId: { messageId: input.messageId, userId } },
        });
        isRemove = existing?.emoji === input.emoji;
        if (isRemove) {
          await prisma.messageReaction.delete({
            where: { messageId_userId: { messageId: input.messageId, userId } },
          });
        } else {
          await prisma.messageReaction.upsert({
            where: { messageId_userId: { messageId: input.messageId, userId } },
            create: { messageId: input.messageId, userId, emoji: input.emoji },
            update: { emoji: input.emoji },
          });
        }
      }

      if (isWhatsApp) {
        const { accessToken, phoneNumberId } = await resolveCredential(conversation.credentialId ?? "");
        await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: conversation.externalId,
            type: "reaction",
            reaction: {
              message_id: message.externalId,
              emoji: isRemove ? "" : input.emoji,
            },
          }),
        });
      }
    }),

  toggleStar: organizationProcedure
    .input(z.object({ messageId: z.string(), starred: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.message.updateMany({
        where: {
          id: input.messageId,
          conversation: { organizationId: ctx.organizationId },
        },
        data: { starred: input.starred },
      });
      if (result.count === 0) throw new Error("Message not found");
      return { starred: input.starred };
    }),

  getTags: organizationProcedure.query(async ({ ctx }) => {
    await prisma.conversationTag.updateMany({
      where: { organizationId: ctx.organizationId, createdById: null },
      data: { createdById: ctx.auth.user.id },
    });
    return prisma.conversationTag.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { conversations: true } } },
    });
  }),

  createTag: organizationProcedure
    .input(z.object({ name: z.string().min(1).max(50), color: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const last = await prisma.conversationTag.findFirst({
        where: { organizationId: ctx.organizationId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      return prisma.conversationTag.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          color: input.color,
          sortOrder: (last?.sortOrder ?? -1) + 1,
          createdById: ctx.auth.user.id,
        },
        include: { createdBy: { select: { name: true, email: true } } },
      });
    }),

  updateTag: organizationProcedure
    .input(z.object({ tagId: z.string(), name: z.string().min(1).max(50).optional(), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { tagId, ...data } = input;
      return prisma.conversationTag.updateMany({
        where: { id: tagId, organizationId: ctx.organizationId },
        data,
      });
    }),

  deleteTag: organizationProcedure
    .input(z.object({ tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.conversationTag.deleteMany({
        where: { id: input.tagId, organizationId: ctx.organizationId },
      });
    }),

  reorderTags: organizationProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.conversationTag.updateMany({
            where: { id, organizationId: ctx.organizationId },
            data: { sortOrder: index },
          }),
        ),
      );
    }),

  getConversationTags: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignments = await prisma.conversationTagAssignment.findMany({
        where: {
          conversationId: input.conversationId,
          conversation: { organizationId: ctx.organizationId },
        },
        include: { tag: true },
      });
      return assignments.map((a) => a.tag);
    }),

  addTagToConversation: organizationProcedure
    .input(z.object({ conversationId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await prisma.conversationTag.findFirst({
        where: { id: input.tagId, organizationId: ctx.organizationId },
      });
      if (!tag) throw new Error("Tag not found");
      await prisma.conversationTagAssignment.upsert({
        where: { conversationId_tagId: { conversationId: input.conversationId, tagId: input.tagId } },
        create: { conversationId: input.conversationId, tagId: input.tagId },
        update: {},
      });
    }),

  removeTagFromConversation: organizationProcedure
    .input(z.object({ conversationId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.conversationTagAssignment.deleteMany({
        where: {
          conversationId: input.conversationId,
          tagId: input.tagId,
          conversation: { organizationId: ctx.organizationId },
        },
      });
    }),

  deleteConversation: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
        select: { channel: true },
      });
      if (!conversation) return;

      const platform = conversation.channel.toLowerCase();
      const prefix = `${ctx.organizationId}/${platform}/${input.conversationId}/`;
      const { data: files } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(prefix.slice(0, -1));
      if (files && files.length > 0) {
        await supabase.storage
          .from(MEDIA_BUCKET)
          .remove(files.map((f) => `${prefix}${f.name}`));
      }

      await prisma.conversation.delete({
        where: { id: input.conversationId },
      });
    }),

});

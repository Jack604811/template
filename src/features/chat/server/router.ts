import { ChannelType, MessageRole } from "@/generated/prisma";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";

export const chatRouter = createTRPCRouter({
  getConversations: organizationProcedure
    .input(
      z.object({
        channel: z.nativeEnum(ChannelType).optional(),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { channel, search } = input;
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
        },
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
      return prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { timestamp: "asc" },
        take: 50,
      });
    }),

  sendMessage: organizationProcedure
    .input(z.object({ conversationId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
      });
      if (!conversation) throw new Error("Conversation not found");
      if (!conversation.credentialId) throw new Error("No WhatsApp credential linked to this conversation");

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

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: conversation.externalId,
            type: "text",
            text: { body: input.content },
          }),
        },
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`WhatsApp API error: ${err.slice(0, 200)}`);
      }

      const json = (await res.json()) as { messages?: Array<{ id: string }> };
      const wamid = json.messages?.[0]?.id;

      const now = new Date();
      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            externalId: wamid,
            role: MessageRole.ASSISTANT,
            content: input.content,
            timestamp: now,
          },
        }),
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageText: input.content, lastMessageAt: now },
        }),
      ]);

      return message;
    }),

  markAsRead: organizationProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.conversation.updateMany({
        where: { id: input.conversationId, organizationId: ctx.organizationId },
        data: { unreadCount: 0 },
      });
    }),
});

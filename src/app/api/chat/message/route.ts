import { type NextRequest, NextResponse } from "next/server";
import { ChannelType, MessageRole } from "@/generated/prisma";
import prisma from "@/lib/db";

// External services (n8n, automations) POST here to log outgoing messages
// Body: { apiKey, phone, content, channelType? }
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { apiKey, phone, content, channelType } = body as {
    apiKey?: string;
    phone?: string;
    content?: string;
    channelType?: string;
  };

  if (!apiKey || !phone || !content) {
    return NextResponse.json({ error: "Missing apiKey, phone, or content" }, { status: 400 });
  }

  // Find the organization by API key stored in credentials
  const credential = await prisma.credential.findFirst({
    where: { id: apiKey },
  });

  if (!credential) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const channel = (channelType as ChannelType | undefined) ?? ChannelType.WHATSAPP;
  const normalizedPhone = phone.replace(/\D/g, "");

  const conversation = await prisma.conversation.findFirst({
    where: {
      organizationId: credential.organizationId,
      channel,
      externalId: { in: [phone, normalizedPhone] },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const now = new Date();
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content,
      timestamp: now,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageText: content, lastMessageAt: now },
  });

  return NextResponse.json({ id: message.id });
}

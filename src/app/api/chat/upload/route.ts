import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { MEDIA_BUCKET, supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file || !conversationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 413 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId },
    select: { organizationId: true, channel: true },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: conversation.organizationId,
        userId: session.user.id,
      },
    },
  });
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const platform = conversation.channel.toLowerCase();
  const path = `${conversation.organizationId}/${platform}/${conversationId}/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, mimeType: file.type, filename: safeName });
}

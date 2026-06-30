import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { MEDIA_BUCKET, supabase } from "@/lib/supabase";

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 403 });

  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { url } = await req.json() as { url?: string };
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Extract the storage path from the public URL
  const marker = `/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  const path = url.slice(idx + marker.length);

  // Only allow deletion within the org's own folder
  if (!path.startsWith(`${orgId}/`))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 403 });

  const member = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const path = `${orgId}/quick-replies/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, mimeType: file.type, filename: safeName });
}

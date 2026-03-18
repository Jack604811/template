import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CredentialType } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId;
  if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 403 });

  const formData = await req.formData();
  const credentialId = formData.get("credentialId") as string | null;
  const file = formData.get("file") as File | null;

  if (!credentialId || !file) {
    return NextResponse.json({ error: "credentialId and file are required" }, { status: 400 });
  }

  const credential = await prisma.credential.findUnique({
    where: { id: credentialId, organizationId: orgId },
  });
  if (!credential || credential.type !== CredentialType.WHATSAPP) {
    return NextResponse.json({ error: "WhatsApp credential not found" }, { status: 404 });
  }

  let accessToken: string;
  try {
    const raw = decrypt(credential.value).trim();
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { value?: string };
      accessToken = typeof parsed.value === "string" ? parsed.value.trim() : "";
    } else {
      accessToken = raw;
    }
  } catch {
    return NextResponse.json({ error: "Invalid credential" }, { status: 500 });
  }
  if (!accessToken) return NextResponse.json({ error: "Access token missing" }, { status: 500 });

  const fileBytes = await file.arrayBuffer();
  const fileSize = fileBytes.byteLength;
  const fileType = file.type;

  // Step 1: Create upload session
  const sessionRes = await fetch(
    `https://graph.facebook.com/v22.0/app/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(fileType)}&access_token=${accessToken}`,
    { method: "POST" },
  );
  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    let msg = err;
    try {
      const j = JSON.parse(err) as { error?: { message?: string } };
      msg = j?.error?.message ?? err;
    } catch { /* ignore */ }
    return NextResponse.json({ error: `Upload session failed: ${msg}` }, { status: 500 });
  }
  const sessionData = (await sessionRes.json()) as { id?: string };
  const uploadSessionId = sessionData.id;
  if (!uploadSessionId) {
    return NextResponse.json({ error: "No upload session ID returned" }, { status: 500 });
  }

  // Step 2: Upload file bytes
  const uploadRes = await fetch(`https://graph.facebook.com/v22.0/${uploadSessionId}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_offset: "0",
      "Content-Type": fileType,
    },
    body: fileBytes,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    let msg = err;
    try {
      const j = JSON.parse(err) as { error?: { message?: string } };
      msg = j?.error?.message ?? err;
    } catch { /* ignore */ }
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }
  const uploadData = (await uploadRes.json()) as { h?: string };
  const handle = uploadData.h;
  if (!handle) {
    return NextResponse.json({ error: "No media handle returned from Meta" }, { status: 500 });
  }

  return NextResponse.json({ handle });
}

import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CredentialType } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type WhatsAppCredentialValue = {
  value: string;
  phoneNumberId: string;
};

// WhatsApp simple-upload size limits per type
const SIZE_LIMITS: Record<string, number> = {
  "video": 16 * 1024 * 1024,   // 16 MB
  "image": 5 * 1024 * 1024,    // 5 MB
  "audio": 16 * 1024 * 1024,   // 16 MB
  "document": 100 * 1024 * 1024, // 100 MB
};

// Use resumable upload for files above this threshold to avoid (#100) Invalid parameter
const RESUMABLE_THRESHOLD = 5 * 1024 * 1024; // 5 MB

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
  let phoneNumberId: string;

  try {
    const raw = decrypt(credential.value).trim();
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as WhatsAppCredentialValue;
      accessToken = typeof parsed.value === "string" ? parsed.value.trim() : "";
      phoneNumberId = typeof parsed.phoneNumberId === "string" ? parsed.phoneNumberId.trim() : "";
    } else {
      return NextResponse.json({ error: "Credential missing Phone Number ID" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid credential" }, { status: 500 });
  }

  if (!accessToken) return NextResponse.json({ error: "Access token missing" }, { status: 500 });
  if (!phoneNumberId) return NextResponse.json({ error: "Phone Number ID missing in credential" }, { status: 400 });

  const fileBytes = await file.arrayBuffer();
  const fileSize = fileBytes.byteLength;

  // Remap common unsupported video MIME types
  const MIME_REMAP: Record<string, string> = {
    "video/quicktime": "video/mp4",
    "video/x-mp4": "video/mp4",
    "video/x-m4v": "video/mp4",
  };
  const rawMime = file.type || "application/octet-stream";
  const mimeType = MIME_REMAP[rawMime] ?? rawMime;

  // Enforce hard size limits
  const mediaCategory = mimeType.split("/")[0];
  const hardLimit = SIZE_LIMITS[mediaCategory];
  if (hardLimit && fileSize > hardLimit) {
    const mb = Math.round(fileSize / 1024 / 1024);
    const limitMb = Math.round(hardLimit / 1024 / 1024);
    return NextResponse.json(
      { error: `File too large (${mb} MB). WhatsApp allows max ${limitMb} MB for ${mediaCategory}.` },
      { status: 400 },
    );
  }

  // ── Large files: use resumable upload → convert handle → media ID ──────────
  if (fileSize > RESUMABLE_THRESHOLD) {
    // Step 1: Create upload session
    const sessionRes = await fetch(
      `https://graph.facebook.com/v22.0/app/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(mimeType)}&access_token=${accessToken}`,
      { method: "POST" },
    );
    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      let msg = err;
      try { msg = (JSON.parse(err) as { error?: { message?: string } })?.error?.message ?? err; } catch { /* ignore */ }
      return NextResponse.json({ error: `Upload session failed: ${msg}` }, { status: 500 });
    }
    const sessionData = (await sessionRes.json()) as { id?: string };
    const uploadSessionId = sessionData.id;
    if (!uploadSessionId) return NextResponse.json({ error: "No upload session ID returned" }, { status: 500 });

    // Step 2: Upload file bytes
    const uploadRes = await fetch(`https://graph.facebook.com/v22.0/${uploadSessionId}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: "0",
        "Content-Type": mimeType,
      },
      body: fileBytes,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      let msg = err;
      try { msg = (JSON.parse(err) as { error?: { message?: string } })?.error?.message ?? err; } catch { /* ignore */ }
      return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
    }
    const uploadData = (await uploadRes.json()) as { h?: string };
    const handle = uploadData.h;
    if (!handle) return NextResponse.json({ error: "No handle returned from upload" }, { status: 500 });

    // Step 3: Register handle as a WhatsApp media object → get numeric media ID
    const regForm = new FormData();
    regForm.append("messaging_product", "whatsapp");
    regForm.append("file_handle", handle);

    const regRes = await fetch(
      `https://graph.facebook.com/v22.0/${encodeURIComponent(phoneNumberId)}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: regForm,
      },
    );
    if (!regRes.ok) {
      const err = await regRes.text();
      let msg = err;
      try { msg = (JSON.parse(err) as { error?: { message?: string } })?.error?.message ?? err; } catch { /* ignore */ }
      return NextResponse.json({ error: `Media registration failed: ${msg}` }, { status: 500 });
    }
    const regData = (await regRes.json()) as { id?: string };
    const id = regData.id;
    if (!id) return NextResponse.json({ error: "No media ID returned after registration" }, { status: 500 });

    return NextResponse.json({ id });
  }

  // ── Small files: direct multipart upload ───────────────────────────────────
  const uploadForm = new FormData();
  uploadForm.append("messaging_product", "whatsapp");
  uploadForm.append("file", new Blob([fileBytes], { type: mimeType }), file.name);

  const uploadRes = await fetch(
    `https://graph.facebook.com/v22.0/${encodeURIComponent(phoneNumberId)}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: uploadForm,
    },
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    let msg = err;
    try {
      const j = JSON.parse(err) as { error?: { message?: string } };
      msg = j?.error?.message ?? err;
    } catch { /* ignore */ }
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }

  const data = (await uploadRes.json()) as { id?: string };
  const id = data.id;
  if (!id) {
    return NextResponse.json({ error: "No media ID returned from Meta" }, { status: 500 });
  }

  return NextResponse.json({ id });
}

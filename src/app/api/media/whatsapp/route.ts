import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");
  const conversationId = searchParams.get("conversationId");

  if (!mediaId || !conversationId) {
    return new NextResponse("Missing params", { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organization: { members: { some: { userId: session.user.id } } },
    },
  });

  if (!conversation) {
    console.error(`[media] conversation not found: ${conversationId} for user ${session.user.id}`);
    return new NextResponse("Not found", { status: 404 });
  }

  if (!conversation.credentialId) {
    console.error(`[media] conversation ${conversationId} has no credentialId`);
    return new NextResponse("No credential linked", { status: 404 });
  }

  const credential = await prisma.credential.findUnique({
    where: { id: conversation.credentialId },
  });

  if (!credential) {
    console.error(`[media] credential ${conversation.credentialId} not found`);
    return new NextResponse("Credential not found", { status: 404 });
  }

  let accessToken = "";
  try {
    const raw = decrypt(credential.value).trim();
    const parsed = raw.startsWith("{")
      ? (JSON.parse(raw) as { value?: string })
      : null;
    accessToken = parsed?.value?.trim() ?? raw;
  } catch (e) {
    console.error("[media] failed to decrypt credential", e);
    return new NextResponse("Failed to decrypt credential", { status: 500 });
  }

  // Step 1: resolve the temporary download URL from the media ID
  const urlRes = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!urlRes.ok) {
    const body = await urlRes.text();
    console.error(`[media] Meta URL resolve failed ${urlRes.status}:`, body.slice(0, 200));
    return new NextResponse("Failed to get media URL from Meta", { status: 502 });
  }

  const meta = (await urlRes.json()) as { url?: string };
  if (!meta.url) {
    console.error("[media] Meta returned no URL:", JSON.stringify(meta));
    return new NextResponse("No URL returned by Meta", { status: 502 });
  }

  // Step 2: download the actual file and stream it to the client
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!fileRes.ok) {
    console.error(`[media] file download failed ${fileRes.status}`);
    return new NextResponse("Failed to download media", { status: 502 });
  }

  const contentType = fileRes.headers.get("Content-Type") ?? "application/octet-stream";

  return new NextResponse(fileRes.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

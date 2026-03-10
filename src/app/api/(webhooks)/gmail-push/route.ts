import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

/** Decode base64url to string (works in Node 14+). */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  return Buffer.from(padded, "base64").toString("utf-8");
}

/**
 * Gmail Push webhook: receives Pub/Sub notifications when a watched mailbox changes.
 * @see https://developers.google.com/workspace/gmail/api/guides/push
 * Payload: message.data is base64url-encoded JSON { emailAddress, historyId }.
 * We look up GmailWatch by emailAddress and send an Inngest event to process.
 * Respond 200 quickly so Pub/Sub acknowledges the message.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: {
        data?: string;
        messageId?: string;
        publishTime?: string;
      };
      subscription?: string;
    };

    const rawData = body.message?.data;
    if (!rawData || typeof rawData !== "string") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let decoded: string;
    try {
      decoded = decodeBase64Url(rawData);
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let payload: { emailAddress?: string; historyId?: string };
    try {
      payload = JSON.parse(decoded) as {
        emailAddress?: string;
        historyId?: string;
      };
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const emailAddress = payload.emailAddress?.trim();
    const historyId =
      payload.historyId != null ? String(payload.historyId).trim() : "";
    if (!emailAddress || !historyId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const watch = await prisma.gmailWatch.findFirst({
      where: {
        emailAddress: emailAddress.toLowerCase(),
      },
      select: { credentialId: true },
    });

    if (!watch) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await inngest.send({
      name: "gmail/push.received",
      data: {
        credentialId: watch.credentialId,
        historyId,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Gmail push webhook error:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

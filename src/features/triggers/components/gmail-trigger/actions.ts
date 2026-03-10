"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { CredentialType } from "@/generated/prisma";
import { gmailChannel } from "@/inngest/channels/gmail";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

export type GmailTriggerToken = Realtime.Token<
  typeof gmailChannel,
  ["status"]
>;

export async function fetchGmailTriggerRealtimeToken(): Promise<GmailTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: gmailChannel(),
    topics: ["status"],
  });

  return token;
}

/**
 * Register (or renew) a Gmail Pub/Sub watch for a given credential immediately.
 * Called when a user selects a credential on a GMAIL_TRIGGER node so push
 * notifications start arriving without waiting for the hourly cron.
 */
export async function registerGmailWatch(
  credentialId: string,
): Promise<{ ok: boolean; error?: string }> {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName?.trim()) {
    return { ok: false, error: "GMAIL_PUBSUB_TOPIC not configured" };
  }

  const credential = await prisma.credential.findUnique({
    where: { id: credentialId, type: CredentialType.GMAIL },
    include: { gmailWatch: true },
  });
  if (!credential) return { ok: false, error: "Credential not found" };

  // Skip if watch is still valid for more than 1 day
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const existing = credential.gmailWatch;
  if (existing?.expirationMs && Number(existing.expirationMs) > Date.now() + ONE_DAY_MS) {
    return { ok: true };
  }

  let tokens: { access_token: string; refresh_token: string | null; expiry_date: number };
  try {
    tokens = JSON.parse(decrypt(credential.value)) as typeof tokens;
  } catch {
    return { ok: false, error: "Invalid credential value" };
  }

  // Refresh token if expiring soon
  if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 60_000 && tokens.refresh_token) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (clientId && clientSecret) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { access_token: string; expires_in: number };
        tokens = {
          access_token: body.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + body.expires_in * 1000,
        };
        await prisma.credential.update({
          where: { id: credentialId },
          data: { value: encrypt(JSON.stringify(tokens)) },
        });
      }
    }
  }

  // Get the user's email address and current historyId
  const profileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!profileRes.ok) return { ok: false, error: `Profile fetch failed: ${profileRes.status}` };
  const profile = (await profileRes.json()) as { emailAddress?: string; historyId?: string };
  const emailAddress = profile.emailAddress?.trim();
  if (!emailAddress) return { ok: false, error: "Could not get email address" };

  // Register the watch
  const watchRes = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({ topicName }),
    },
  );

  if (!watchRes.ok) {
    const errText = await watchRes.text();
    console.error("Gmail watch registration failed:", watchRes.status, errText);
    return { ok: false, error: `Watch failed: ${watchRes.status}` };
  }

  const watchBody = (await watchRes.json()) as { historyId?: string; expiration?: string };
  const expirationMs = watchBody.expiration ? Number(watchBody.expiration) : null;
  const historyId = watchBody.historyId?.toString() ?? null;

  await prisma.gmailWatch.upsert({
    where: { credentialId },
    create: {
      credentialId,
      emailAddress: emailAddress.toLowerCase(),
      historyId,
      expirationMs: expirationMs != null ? BigInt(expirationMs) : null,
    },
    update: {
      emailAddress: emailAddress.toLowerCase(),
      historyId,
      expirationMs: expirationMs != null ? BigInt(expirationMs) : null,
    },
  });

  return { ok: true };
}

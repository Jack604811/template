import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

export async function GET(request: Request) {
  const session = await requireAuth();
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return NextResponse.redirect(
      new URL("/select-organization", getBaseUrl()),
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/credentials?error=gmail_oauth_${error}`, getBaseUrl()),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/credentials?error=gmail_oauth_missing_params", getBaseUrl()),
    );
  }

  let decodedState: { organizationId: string; credentialId?: string };
  try {
    decodedState = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8"),
    ) as { organizationId: string };
  } catch {
    return NextResponse.redirect(
      new URL("/credentials?error=gmail_oauth_invalid_state", getBaseUrl()),
    );
  }

  if (decodedState.organizationId !== organizationId) {
    return NextResponse.redirect(
      new URL("/credentials?error=gmail_oauth_organization_mismatch", getBaseUrl()),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/credentials/gmail/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/credentials?error=missing_google_client", baseUrl),
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    return NextResponse.redirect(
      new URL(
        `/credentials?error=gmail_oauth_token_failed&message=${encodeURIComponent(err.slice(0, 100))}`,
        baseUrl,
      ),
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiryDate =
    typeof tokens.expires_in === "number"
      ? Date.now() + tokens.expires_in * 1000
      : 0;

  const value = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: expiryDate,
  });

  const userEmail = await fetchGmailUserEmail(tokens.access_token);
  const credentialName = userEmail ?? "Gmail account";

  if (decodedState.credentialId) {
    // Re-authorize: update the existing credential's token
    await prisma.credential.update({
      where: { id: decodedState.credentialId, organizationId, type: CredentialType.GMAIL },
      data: { value: encrypt(value) },
    });
  } else {
    await prisma.credential.create({
      data: {
        name: credentialName,
        organizationId,
        type: CredentialType.GMAIL,
        value: encrypt(value),
      },
    });
  }

  return NextResponse.redirect(new URL("/credentials?gmail_connected=1", baseUrl));
}

async function fetchGmailUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
}

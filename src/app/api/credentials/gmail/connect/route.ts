import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export async function GET() {
  const session = await requireAuth();
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return NextResponse.redirect(new URL("/select-organization", getBaseUrl()));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = getBaseUrl();
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/credentials?error=missing_google_client", baseUrl),
    );
  }

  const redirectUri = `${baseUrl}/api/credentials/gmail/callback`;
  const state = Buffer.from(
    JSON.stringify({ organizationId }),
    "utf-8",
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
}

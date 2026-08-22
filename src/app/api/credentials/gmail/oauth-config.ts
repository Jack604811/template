import { CredentialType } from "@/generated/prisma";
import type { OAuthProviderConfig } from "@/lib/oauth-connect";

export const gmailOAuthConfig: OAuthProviderConfig = {
  credentialType: CredentialType.GMAIL,
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  clientIdEnv: "GOOGLE_CLIENT_ID",
  clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  redirectPath: "/api/credentials/gmail/callback",
  extraAuthParams: { access_type: "offline", prompt: "consent" },
  buildCredentialValue: (tokens) =>
    JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date:
        typeof tokens.expires_in === "number"
          ? Date.now() + tokens.expires_in * 1000
          : 0,
    }),
  fetchDisplayName: async (accessToken) => {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { email?: string };
      return data.email ?? null;
    } catch {
      return null;
    }
  },
  defaultName: "Gmail account",
  errorPrefix: "gmail_oauth",
  successParam: "gmail_connected",
};

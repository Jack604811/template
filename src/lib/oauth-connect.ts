import { NextResponse } from "next/server";
import type { CredentialType } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";

/**
 * Shared OAuth2 authorization-code flow for credential connections. Extracted from
 * the Gmail connect/callback routes so a new integration (Instagram, TikTok, etc.)
 * only needs a provider config + two thin route files, not a re-derived OAuth dance.
 */

export type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  [key: string]: unknown;
};

export interface OAuthProviderConfig {
  credentialType: CredentialType;
  /** Provider's authorization endpoint, e.g. "https://accounts.google.com/o/oauth2/v2/auth". */
  authorizeUrl: string;
  /** Provider's token exchange endpoint. */
  tokenUrl: string;
  scopes: string[];
  /** Env var names holding the app's client id/secret for this provider. */
  clientIdEnv: string;
  clientSecretEnv: string;
  /** This provider's callback route path, e.g. "/api/credentials/gmail/callback". */
  redirectPath: string;
  /** Extra static query params for the authorize URL (e.g. Google's access_type/prompt). */
  extraAuthParams?: Record<string, string>;
  /** Builds the JSON string stored (encrypted) as the credential's value. */
  buildCredentialValue: (tokens: OAuthTokenResponse) => string;
  /** Optional lookup for a human-friendly credential name; falls back to defaultName. */
  fetchDisplayName?: (accessToken: string) => Promise<string | null>;
  defaultName: string;
  /** Prefix used for redirect error query params, e.g. "gmail_oauth". */
  errorPrefix: string;
  /** Query param set to "1" on success, e.g. "gmail_connected". */
  successParam: string;
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
}

export function createOAuthConnectHandler(config: OAuthProviderConfig) {
  return async function GET(request: Request) {
    const session = await requireAuth();
    const organizationId = session.session.activeOrganizationId;
    const baseUrl = getBaseUrl();
    if (!organizationId) {
      return NextResponse.redirect(new URL("/select-organization", baseUrl));
    }

    const clientId = process.env[config.clientIdEnv];
    if (!clientId) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=missing_${config.errorPrefix}_client`,
          baseUrl,
        ),
      );
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");

    const redirectUri = `${baseUrl}${config.redirectPath}`;
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        ...(credentialId ? { credentialId } : {}),
      }),
      "utf-8",
    ).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
      ...(config.extraAuthParams ?? {}),
    });

    return NextResponse.redirect(`${config.authorizeUrl}?${params.toString()}`);
  };
}

export function createOAuthCallbackHandler(config: OAuthProviderConfig) {
  return async function GET(request: Request) {
    const session = await requireAuth();
    const organizationId = session.session.activeOrganizationId;
    const baseUrl = getBaseUrl();
    if (!organizationId) {
      return NextResponse.redirect(new URL("/select-organization", baseUrl));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/credentials?error=${config.errorPrefix}_${error}`, baseUrl),
      );
    }
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${config.errorPrefix}_missing_params`,
          baseUrl,
        ),
      );
    }

    let decodedState: { organizationId: string; credentialId?: string };
    try {
      decodedState = JSON.parse(
        Buffer.from(state, "base64url").toString("utf-8"),
      ) as { organizationId: string; credentialId?: string };
    } catch {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${config.errorPrefix}_invalid_state`,
          baseUrl,
        ),
      );
    }

    if (decodedState.organizationId !== organizationId) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${config.errorPrefix}_organization_mismatch`,
          baseUrl,
        ),
      );
    }

    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    const redirectUri = `${baseUrl}${config.redirectPath}`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=missing_${config.errorPrefix}_client`,
          baseUrl,
        ),
      );
    }

    const tokenResponse = await fetch(config.tokenUrl, {
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
          `/credentials?error=${config.errorPrefix}_token_failed&message=${encodeURIComponent(err.slice(0, 100))}`,
          baseUrl,
        ),
      );
    }

    const tokens = (await tokenResponse.json()) as OAuthTokenResponse;
    const value = config.buildCredentialValue(tokens);
    const displayName = config.fetchDisplayName
      ? await config.fetchDisplayName(tokens.access_token)
      : null;
    const credentialName = displayName ?? config.defaultName;

    if (decodedState.credentialId) {
      await prisma.credential.update({
        where: {
          id: decodedState.credentialId,
          organizationId,
          type: config.credentialType,
        },
        data: { value: encrypt(value) },
      });
    } else {
      await prisma.credential.create({
        data: {
          name: credentialName,
          organizationId,
          type: config.credentialType,
          value: encrypt(value),
        },
      });
    }

    return NextResponse.redirect(
      new URL(`/credentials?${config.successParam}=1`, baseUrl),
    );
  };
}

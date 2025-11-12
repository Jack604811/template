import { Polar } from "@polar-sh/sdk";

/**
 * Polar client for subscription management
 * 
 * Only initialized if POLAR_ACCESS_TOKEN is available.
 * If not configured, premium features will be disabled.
 */
export const polarClient = process.env.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      server: "production",
    })
  : null;

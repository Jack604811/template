import { createOAuthCallbackHandler } from "@/lib/oauth-connect";
import { gmailOAuthConfig } from "../oauth-config";

export const GET = createOAuthCallbackHandler(gmailOAuthConfig);

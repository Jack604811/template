import { createOAuthConnectHandler } from "@/lib/oauth-connect";
import { gmailOAuthConfig } from "../oauth-config";

export const GET = createOAuthConnectHandler(gmailOAuthConfig);

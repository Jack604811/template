import { createGateway } from "ai";

/**
 * AI Gateway provider for unified access to multiple AI models (OpenAI, Anthropic, Google, etc.).
 * Uses AI_GATEWAY_API_KEY from environment.
 */
export const aiGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

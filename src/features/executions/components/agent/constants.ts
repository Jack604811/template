/**
 * Models supported by Vercel AI Gateway (Agent node).
 * Align with https://vercel.com/docs/ai-gateway/models-and-providers
 */
export const AGENT_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
  { value: "anthropic/claude-sonnet-4.5", label: "Anthropic Claude Sonnet 4.5" },
  { value: "anthropic/claude-opus-4.6", label: "Anthropic Claude Opus 4.6" },
  { value: "openai/gpt-4o", label: "OpenAI GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
] as const;

export type AgentMcpToolOption = {
  name: string;
  description: string;
};

export type AgentToolItem =
  | { type: "native"; value: string }
  | { type: "mcp"; serverId: string; label?: string; tools: { name: string }[] };

export type AgentNativeToolId = "webSearch";

export const AGENT_NATIVE_TOOLS: {
  id: AgentNativeToolId;
  name: string;
  description: string;
}[] = [
  {
    id: "webSearch",
    name: "Web Search",
    description: "Search the web for current information",
  },
];

export const AGENT_MCP_TOOL_ID = "mcpServer" as const;

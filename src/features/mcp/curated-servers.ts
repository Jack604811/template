export type CuratedMcpServer = {
  id: string;
  label: string;
  description: string;
  logo: string;
  prefillUrl?: string;
};

export const CURATED_MCP_SERVERS: readonly CuratedMcpServer[] = [
  {
    id: "github",
    label: "GitHub",
    description: "Access repositories, issues, pull requests, and code search",
    logo: "/logos/github.svg",
    prefillUrl: "https://api.githubcopilot.com/mcp/",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Read and send messages, manage channels and workspaces",
    logo: "/logos/slack.svg",
  },
  {
    id: "discord",
    label: "Discord",
    description: "Read and send messages, manage servers and channels",
    logo: "/logos/discord.svg",
  },
  {
    id: "google-drive",
    label: "Google Drive",
    description: "Search, read, and manage files in Google Drive",
    logo: "/logos/drive.svg",
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Manage payments, customers, and billing via Stripe",
    logo: "/logos/stripe.svg",
    prefillUrl: "https://mcp.stripe.com/",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Access OpenAI APIs and manage models and assistants",
    logo: "/logos/openai.svg",
  },
];

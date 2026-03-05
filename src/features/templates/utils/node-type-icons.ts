import {
  Bot,
  GitBranch,
  GlobeIcon,
  type LucideIcon,
} from "lucide-react";
import { NodeType } from "@/generated/prisma";

export type NodeIcon = string | LucideIcon;

/**
 * Maps NodeType to app icons/logos
 * Filters out INITIAL and MANUAL_TRIGGER as they are not apps
 */
export const nodeTypeToIcon: Record<NodeType, NodeIcon | null> = {
  // Triggers (filtered out - not apps)
  [NodeType.INITIAL]: null,
  [NodeType.MANUAL_TRIGGER]: null,
  [NodeType.WEBHOOK_TRIGGER]: "/logos/webhooks.svg",
  [NodeType.GOOGLE_FORM_TRIGGER]: "/logos/googleform.svg",
  [NodeType.STRIPE_TRIGGER]: "/logos/stripe.svg",
  
  // Execution nodes (apps)
  [NodeType.HTTP_REQUEST]: GlobeIcon,
  [NodeType.IF_ELSE]: GitBranch,
  [NodeType.GEMINI]: "/logos/gemini.svg",
  [NodeType.OPENAI]: "/logos/openai.svg",
  [NodeType.ANTHROPIC]: "/logos/anthropic.svg",
  [NodeType.DISCORD]: "/logos/discord.svg",
  [NodeType.SLACK]: "/logos/slack.svg",
  [NodeType.AGENT]: Bot,
};

/**
 * Get icon for a node type
 * Returns null for INITIAL and MANUAL_TRIGGER
 */
export const getNodeTypeIcon = (nodeType: NodeType): NodeIcon | null => {
  return nodeTypeToIcon[nodeType] ?? null;
};

/**
 * Extract unique app node types from a list of nodes
 * Filters out INITIAL and MANUAL_TRIGGER
 */
export const extractAppNodeTypes = (nodes: Array<{ type: NodeType }>): NodeType[] => {
  const uniqueTypes = new Set<NodeType>();
  
  nodes.forEach((node) => {
    if (
      node.type !== NodeType.INITIAL &&
      node.type !== NodeType.MANUAL_TRIGGER &&
      nodeTypeToIcon[node.type] !== null
    ) {
      uniqueTypes.add(node.type);
    }
  });
  
  return Array.from(uniqueTypes);
};


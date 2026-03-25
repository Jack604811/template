import type { NodeTypes } from "@xyflow/react";
import { InitialNode } from "@/components/initial-node";
import { AgentNode } from "@/features/executions/components/agent/node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { GmailNode } from "@/features/executions/components/gmail/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { IfElseNode } from "@/features/executions/components/if-else/node";
import { JavascriptNode } from "@/features/executions/components/javascript/node";
import { OpenAiNode } from "@/features/executions/components/openai/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { WhatsAppNode } from "@/features/executions/components/whatsapp/node";
import { BoldTriggerNode } from "@/features/triggers/components/bold-trigger/node";
import { GmailTriggerNode } from "@/features/triggers/components/gmail-trigger/node";
import { GoogleFormTrigger } from "@/features/triggers/components/google-form-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { WebhookTrigger } from "@/features/triggers/components/webhook-trigger/node";
import { WhatsAppTriggerNode } from "@/features/triggers/components/whatsapp-trigger/node";
import { NodeType } from "@/generated/prisma";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.IF_ELSE]: IfElseNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTrigger,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.AGENT]: AgentNode,
  [NodeType.BOLD_TRIGGER]: BoldTriggerNode,
  [NodeType.GMAIL]: GmailNode,
  [NodeType.GMAIL_TRIGGER]: GmailTriggerNode,
  [NodeType.WHATSAPP]: WhatsAppNode,
  [NodeType.WHATSAPP_TRIGGER]: WhatsAppTriggerNode,
  [NodeType.JAVASCRIPT]: JavascriptNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;

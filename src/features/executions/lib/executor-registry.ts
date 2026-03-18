import { boldTriggerExecutor } from "@/features/triggers/components/bold-trigger/executor";
import { gmailTriggerExecutor } from "@/features/triggers/components/gmail-trigger/executor";
import { whatsappTriggerExecutor } from "@/features/triggers/components/whatsapp-trigger/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { NodeType } from "@/generated/prisma";
import { agentExecutor } from "../components/agent/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { discordExecutor } from "../components/discord/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { gmailExecutor } from "../components/gmail/executor";
import { whatsappExecutor } from "../components/whatsapp/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { ifElseExecutor } from "../components/if-else/executor";
import { openAiExecutor } from "../components/openai/executor";
import { slackExecutor } from "../components/slack/executor";
import type { NodeExecutor } from "../types";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.IF_ELSE]: ifElseExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.OPENAI]: openAiExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.SLACK]: slackExecutor,
  [NodeType.AGENT]: agentExecutor,
  [NodeType.BOLD_TRIGGER]: boldTriggerExecutor,
  [NodeType.GMAIL]: gmailExecutor,
  [NodeType.GMAIL_TRIGGER]: gmailTriggerExecutor,
  [NodeType.WHATSAPP]: whatsappExecutor,
  [NodeType.WHATSAPP_TRIGGER]: whatsappTriggerExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};

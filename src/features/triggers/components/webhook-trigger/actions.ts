"use server";

import { inngest } from "@/inngest/client";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

export interface WebhookData {
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
  method: string;
  path: string;
  raw: string;
}

export interface WebhookTriggerNodeData {
  webhookId?: string;
}

export interface WebhookEvent {
  id: string;
  timestamp: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
}

export interface WebhookEventsResponse {
  events: WebhookEvent[];
}

export type WebhookTriggerToken = Realtime.Token<
  typeof webhookTriggerChannel,
  ["status"]
>;

export async function fetchWebhookTriggerRealtimeToken(): Promise<WebhookTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: webhookTriggerChannel(),
    topics: ["status"],
  });

  return token;
}


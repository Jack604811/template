"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import { inngest } from "@/inngest/client";

export interface WebhookData {
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
  method: string;
  path: string;
  raw: string;
}

export interface WebhookStoredSchema {
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
}

export interface WebhookTriggerNodeData {
  webhookId?: string;
  webhookSchema?: WebhookStoredSchema;
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

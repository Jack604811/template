"use server";

import { createId } from "@paralleldrive/cuid2";
import type { WebhookEvent } from "./actions";

const webhookEvents = new Map<string, WebhookEvent[]>();

const MAX_EVENTS_PER_WEBHOOK = 20;
const MAX_EVENTS_TO_RETURN = 10;

export async function storeWebhookEvent(
  webhookId: string,
  data: {
    method: string;
    body: unknown;
    headers: Record<string, string>;
    query: Record<string, string>;
  },
): Promise<void> {
  const events = webhookEvents.get(webhookId) || [];

  events.push({
    id: createId(),
    timestamp: new Date().toISOString(),
    ...data,
  });

  if (events.length > MAX_EVENTS_PER_WEBHOOK) {
    events.shift();
  }

  webhookEvents.set(webhookId, events);
}

export async function getWebhookEvents(
  webhookId: string,
): Promise<WebhookEvent[]> {
  const events = webhookEvents.get(webhookId) || [];
  return events.slice(-MAX_EVENTS_TO_RETURN);
}

export async function clearWebhookEvents(webhookId: string): Promise<void> {
  webhookEvents.delete(webhookId);
}


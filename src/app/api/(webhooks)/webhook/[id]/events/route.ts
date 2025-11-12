import { type NextRequest, NextResponse } from "next/server";
import {
  getWebhookEvents,
  clearWebhookEvents,
} from "@/features/triggers/components/webhook-trigger/webhook-storage";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Get webhook events for testing/debugging
 * Returns the last 10 events for the specified webhook
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: webhookId } = await context.params;

  const events = await getWebhookEvents(webhookId);

  return NextResponse.json({ events });
}

/**
 * Clear webhook events for testing/debugging
 * Removes all stored events for the specified webhook
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id: webhookId } = await context.params;

  await clearWebhookEvents(webhookId);

  return NextResponse.json({ success: true });
}


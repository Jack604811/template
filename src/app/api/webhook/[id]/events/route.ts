import { type NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";

// In-memory storage for webhook events (in production, use Redis or similar)
const webhookEvents = new Map<string, Array<{
  id: string;
  timestamp: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
}>>();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: webhookId } = await context.params;
  
  const events = webhookEvents.get(webhookId) || [];
  
  return NextResponse.json({
    events: events.slice(-10), // Return last 10 events
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: webhookId } = await context.params;
  
  webhookEvents.delete(webhookId);
  
  return NextResponse.json({ success: true });
}

// Helper function to store an event (called from webhook route)
export function storeWebhookEvent(
  webhookId: string,
  data: {
    method: string;
    body: unknown;
    headers: Record<string, string>;
    query: Record<string, string>;
  },
) {
  const events = webhookEvents.get(webhookId) || [];
  
  events.push({
    id: createId(),
    timestamp: new Date().toISOString(),
    ...data,
  });
  
  // Keep only last 20 events
  if (events.length > 20) {
    events.shift();
  }
  
  webhookEvents.set(webhookId, events);
}


"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { executionContextChannel } from "@/inngest/channels/execution-context";
import { inngest } from "@/inngest/client";

export type ExecutionContextToken = Realtime.Token<
  typeof executionContextChannel,
  ["context-update"]
>;

export async function fetchExecutionContextRealtimeToken(): Promise<ExecutionContextToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: executionContextChannel(),
    topics: ["context-update"],
  });

  return token;
}

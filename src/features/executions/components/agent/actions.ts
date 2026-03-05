"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { agentChannel } from "@/inngest/channels/agent";
import { inngest } from "@/inngest/client";

export type AgentToken = Realtime.Token<
  typeof agentChannel,
  ["status"]
>;

export async function fetchAgentRealtimeToken(): Promise<AgentToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: agentChannel(),
    topics: ["status"],
  });

  return token;
}

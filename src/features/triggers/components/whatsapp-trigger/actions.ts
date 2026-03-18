"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { whatsappTriggerChannel } from "@/inngest/channels/whatsapp-trigger";
import { inngest } from "@/inngest/client";

export type WhatsAppTriggerToken = Realtime.Token<
  typeof whatsappTriggerChannel,
  ["status"]
>;

export async function fetchWhatsAppTriggerRealtimeToken(): Promise<WhatsAppTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: whatsappTriggerChannel(),
    topics: ["status"],
  });

  return token;
}

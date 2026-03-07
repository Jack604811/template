"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { NodeType } from "@/generated/prisma";
import { boldTriggerChannel } from "@/inngest/channels/bold-trigger";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";

export type BoldTriggerToken = Realtime.Token<
  typeof boldTriggerChannel,
  ["status"]
>;

export async function fetchBoldTriggerRealtimeToken(): Promise<BoldTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: boldTriggerChannel(),
    topics: ["status"],
  });

  return token;
}

/**
 * Check whether a boldId is already in use by a different node.
 * Returns true if the id is available (unique), false if taken.
 */
export async function checkBoldIdUnique(boldId: string, currentNodeId: string): Promise<boolean> {
  const conflict = await prisma.node.findFirst({
    where: {
      type: NodeType.BOLD_TRIGGER,
      id: { not: currentNodeId },
      data: { path: ["boldId"], equals: boldId },
    },
    select: { id: true },
  });

  return conflict === null;
}

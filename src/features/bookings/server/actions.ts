"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { bookingChannel } from "@/inngest/channels/booking";
import { inngest } from "@/inngest/client";

export type BookingToken = Realtime.Token<
  typeof bookingChannel,
  ["update"]
>;

/**
 * Fetch realtime token for a specific booking
 * 
 * Note: getSubscriptionToken doesn't support pattern matching for server-side filtering.
 * The bookingId parameter is used for client-side filtering in the hook.
 * This means clients receive all booking updates and filter by bookingId on the client.
 */
export async function fetchBookingRealtimeToken(bookingId: string): Promise<BookingToken> {
  // Note: bookingId is used for client-side filtering in useBookingRealtime hook
  // Server-side filtering via pattern matching is not available with getSubscriptionToken
  const token = await getSubscriptionToken(inngest, {
    channel: bookingChannel(),
    topics: ["update"],
  });

  return token;
}

/**
 * Fetch realtime token for all booking updates (no specific booking filter)
 * Used for calendar/list views that need to update when any booking changes
 */
export async function fetchAllBookingsRealtimeToken(): Promise<BookingToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: bookingChannel(),
    topics: ["update"], // Subscribe to all update events without pattern filter
  });

  return token;
}

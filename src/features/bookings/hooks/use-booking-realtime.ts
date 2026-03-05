import { useQueryClient } from "@tanstack/react-query";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { fetchBookingRealtimeToken } from "@/features/bookings/server/actions";
import { BOOKING_CHANNEL_NAME } from "@/inngest/channels/booking";

/**
 * Hook to subscribe to real-time updates for a specific booking
 * Updates the getOne query cache when the booking is updated
 * Gracefully handles WebSocket connection failures silently
 */
export function useBookingRealtime(bookingId: string) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [hasError, setHasError] = useState(false);

  // Suppress WebSocket errors from console
  useEffect(() => {
    const originalError = console.error;
    const errorListener = (event: ErrorEvent) => {
      if (
        event.message?.includes("WebSocket") ||
        event.message?.includes("realtime") ||
        event.error?.message?.includes("WebSocket")
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", errorListener);

    // Override console.error to filter WebSocket errors
    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      if (
        typeof firstArg === "string" &&
        (firstArg.includes("WebSocket") || firstArg.includes("realtime"))
      ) {
        // Suppress WebSocket errors silently
        return;
      }
      originalError(...args);
    };

    return () => {
      window.removeEventListener("error", errorListener);
      console.error = originalError;
    };
  }, []);

  const { data, error } = useInngestSubscription({
    refreshToken: async () => {
      try {
        return await fetchBookingRealtimeToken(bookingId);
      } catch (err) {
        // Silently fail - real-time updates are optional
        setHasError(true);
        throw err; // Let the hook handle the error
      }
    },
    enabled: !!bookingId && !hasError, // Disable if we had an error
  });

  // Silently handle errors without logging
  useEffect(() => {
    if (error) {
      setHasError(true);
    }
  }, [error]);

  useEffect(() => {
    if (!data?.length || !bookingId) {
      return;
    }

    // Find the latest update message for this booking
    // Note: Server-side filtering by bookingId should prevent receiving updates for other bookings,
    // but we keep this client-side check as a defensive fallback
    const latestUpdate = data
      .filter(
        (msg) =>
          msg.kind === "data" &&
          msg.channel === BOOKING_CHANNEL_NAME &&
          msg.topic === "update" &&
          msg.data.bookingId === bookingId,
      )
      .sort((a, b) => {
        if (a.kind === "data" && b.kind === "data") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        return 0;
      })[0];

    if (latestUpdate?.kind === "data") {
      // Update React Query cache with the new booking data
      // Replace the entire booking object since we receive the full booking from the server
      const bookingData = latestUpdate.data.data as Awaited<ReturnType<typeof trpc.bookings.getOne.query>>;
      queryClient.setQueryData(
        trpc.bookings.getOne.queryKey({ id: bookingId }),
        bookingData,
      );
    }
  }, [data, bookingId, queryClient, trpc]);
}

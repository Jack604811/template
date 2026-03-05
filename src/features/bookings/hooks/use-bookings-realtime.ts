import { useQueryClient } from "@tanstack/react-query";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { fetchAllBookingsRealtimeToken } from "@/features/bookings/server/actions";
import { BOOKING_CHANNEL_NAME } from "@/inngest/channels/booking";

/**
 * Hook to subscribe to real-time updates for all bookings
 * Updates the getMany query cache when any booking is updated
 * Gracefully handles WebSocket connection failures silently
 */
export function useBookingsRealtime() {
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

  // Subscribe to all booking updates (no specific bookingId pattern)
  const { data, error } = useInngestSubscription({
    refreshToken: async () => {
      try {
        return await fetchAllBookingsRealtimeToken();
      } catch (err) {
        // Silently fail - real-time updates are optional
        setHasError(true);
        // Return a minimal token structure to prevent further errors
        throw err; // Let the hook handle the error
      }
    },
    enabled: !hasError, // Disable if we had an error
  });

  // Silently handle errors without logging
  useEffect(() => {
    if (error) {
      setHasError(true);
    }
  }, [error]);

  useEffect(() => {
    if (!data?.length) {
      return;
    }

    // Process all booking update messages
    const updates = data
      .filter(
        (msg) =>
          msg.kind === "data" &&
          msg.channel === BOOKING_CHANNEL_NAME &&
          msg.topic === "update",
      )
      .map((msg) => {
        if (msg.kind === "data") {
          return msg.data;
        }
        return null;
      })
      .filter(Boolean);

    if (updates.length === 0) {
      return;
    }

    // Update all getMany queries in the cache
    // This will update the calendar view and any list views
    // Match any query that starts with ["bookings", "getMany"]
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.length >= 2 &&
            key[0] === "bookings" &&
            key[1] === "getMany"
          );
        },
      },
      (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object") {
          return oldData;
        }

        const data = oldData as {
          items: Array<{ id: string; [key: string]: unknown }>;
          totalCount?: number;
          [key: string]: unknown;
        };

        // Update each booking in the list if it was updated
        const updatedItems = data.items.map((item) => {
          const update = updates.find((u) => u?.bookingId === item.id);
          if (update?.data) {
            return {
              ...item,
              ...update.data,
            };
          }
          return item;
        });

        // Check if any new bookings were added (not in current list)
        const existingIds = new Set(data.items.map((item) => item.id));
        const newBookings = updates
          .filter((u) => u?.data && !existingIds.has(u.data.id))
          .map((u) => u?.data);

        return {
          ...data,
          items: newBookings.length > 0 ? [...updatedItems, ...newBookings] : updatedItems,
          totalCount:
            data.totalCount !== undefined
              ? data.totalCount + newBookings.length
              : updatedItems.length + newBookings.length,
        };
      },
    );
  }, [data, queryClient, trpc]);
}

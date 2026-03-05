import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.bookings.getMany>;

/**
 * Prefetch all bookings
 */
export const prefetchBookings = (params: Input) => {
  return prefetch(trpc.bookings.getMany.queryOptions(params));
};

/**
 * Prefetch a single booking
 */
export const prefetchBooking = (id: string) => {
  return prefetch(trpc.bookings.getOne.queryOptions({ id }));
};


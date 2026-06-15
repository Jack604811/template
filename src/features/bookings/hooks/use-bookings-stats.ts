import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useBookingsParams } from "./use-bookings-params";

export const useSuspenseBookingsStats = () => {
  const trpc = useTRPC();
  const [params] = useBookingsParams();
  return useSuspenseQuery(
    trpc.bookings.getStats.queryOptions({
      startDate: params.startDate ?? undefined,
      endDate: params.endDate ?? undefined,
    }),
  );
};

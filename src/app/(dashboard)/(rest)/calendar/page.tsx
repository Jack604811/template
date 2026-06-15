import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  CalendarContainer,
  CalendarError,
  CalendarContent,
  CalendarLoading,
} from "@/features/bookings/components/booking-calendar/calendar";
import { bookingsParamsLoader } from "@/features/bookings/server/params-loader";
import { prefetchBookings } from "@/features/bookings/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();

  const params = await bookingsParamsLoader(searchParams);
  
  // Prefetch bookings - errors are handled gracefully by React Query
  // If prefetch fails, component will fetch on client side
  try {
    await prefetchBookings({
      ...params,
      startDate: params.startDate ?? undefined,
      endDate: params.endDate ?? undefined,
    });
  } catch {
    // Silently handle prefetch errors - prevents "Unauthorized" errors from breaking SSR
    // Component will fetch data on client side via useSuspenseBookings
  }

  return (
    <CalendarContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<CalendarError />}>
          <Suspense fallback={<CalendarLoading />}>
            <CalendarContent />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </CalendarContainer>
  );
};

export default Page;

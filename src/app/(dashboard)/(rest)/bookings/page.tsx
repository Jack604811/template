import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  BookingsContainer,
  BookingsError,
  BookingsList,
  BookingsLoading,
} from "@/features/bookings/components/bookings";
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
  prefetchBookings(params);

  return (
    <BookingsContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<BookingsError />}>
          <Suspense fallback={<BookingsLoading />}>
            <BookingsList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </BookingsContainer>
  );
};

export default Page;

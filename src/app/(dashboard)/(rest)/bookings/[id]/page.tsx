import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { prefetchBooking } from "@/features/bookings/server/prefetch";
import { BookingDetailsPage } from "@/features/bookings/components/booking-details-page";
import { BookingsLoading, BookingsError } from "@/features/bookings/components/bookings";

type Props = {
  params: Promise<{ id: string }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { id } = await params;
  
  // Prefetch booking - errors are handled gracefully by React Query
  // If prefetch fails, component will fetch on client side
  try {
    await prefetchBooking(id);
  } catch {
    // Silently handle prefetch errors - prevents "Unauthorized" errors from breaking SSR
    // Component will fetch data on client side via useSuspenseBooking
  }

  return (
    <div className="h-full">
      <HydrateClient>
        <ErrorBoundary fallback={<BookingsError />}>
          <Suspense fallback={<BookingsLoading />}>
            <BookingDetailsPage bookingId={id} />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
};

export default Page;


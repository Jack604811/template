import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BookingDetailsPage } from "@/features/bookings/components/booking-details-page";
import { BookingsError, BookingsLoading } from "@/features/bookings/components/bookings";
import { prefetchBooking } from "@/features/bookings/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { id } = await params;

  try {
    await prefetchBooking(id);
  } catch {
    // Client will fetch
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

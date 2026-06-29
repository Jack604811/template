export const dynamic = "force-dynamic";

import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookingsListActions,
  BookingsListItems,
  BookingsListStats,
  BookingsListStatsCarousel,
} from "@/features/bookings/components/bookings-list-page";
import { bookingsParamsLoader } from "@/features/bookings/server/params-loader";
import { prefetchBookings } from "@/features/bookings/server/prefetch";
import {
  prefetchCurrentOrganization,
  prefetchOrganizations,
} from "@/features/organizations/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

type Props = {
  searchParams: Promise<SearchParams>;
};

const StatsLoading = () => (
  <div className="hidden sm:flex items-center py-5">
    {([88, 96, 72, 96] as const).map((w, idx) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: positional skeleton
      <div key={idx} className="flex items-center">
        {idx > 0 && <div className="w-px bg-border flex-shrink-0" style={{ height: 66 }} />}
        <div className="flex flex-col gap-2 px-6 min-w-[160px]">
          <Skeleton className="h-[10px]" style={{ width: w }} />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    ))}
  </div>
);

const ListLoading = () => (
  <div className="px-4">
    <Skeleton className="h-[11px] w-32 mt-6 mb-2 ml-1" />
    {Array.from({ length: 12 }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
      <div key={i} className="flex items-center gap-3 py-2.5 -mx-4 px-5">
        <Skeleton style={{ width: 50, height: 62, minWidth: 50 }} className="rounded-lg" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-[14px] w-36" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

const Page = async ({ searchParams }: Props) => {
  await requireAuth();

  const params = await bookingsParamsLoader(searchParams);
  prefetchOrganizations();
  prefetchCurrentOrganization();
  prefetchBookings({ ...params, startDate: params.startDate ?? undefined, endDate: params.endDate ?? undefined });

  return (
    <div className="flex flex-col h-full">
      <h1 className="hidden sm:block px-4 pt-6 pb-2 text-2xl font-bold tracking-tight">Reservas</h1>
      <HydrateClient>
        <ErrorBoundary fallback={<div className="p-4 text-sm text-destructive">Error loading stats</div>}>
          <Suspense fallback={<StatsLoading />}>
            <BookingsListStats />
          </Suspense>
          <Suspense fallback={null}>
            <BookingsListStatsCarousel />
          </Suspense>
        </ErrorBoundary>
        <BookingsListActions />
        <ErrorBoundary fallback={<div className="p-4 text-sm text-destructive">Error loading bookings</div>}>
          <Suspense fallback={<ListLoading />}>
            <BookingsListItems />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
};

export default Page;

import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookablesListActions,
  BookablesListItems,
} from "@/features/bookables/components/bookables-list-page";
import { bookablesParamsLoader } from "@/features/bookables/server/params-loader";
import { prefetchBookables, prefetchCollections } from "@/features/bookables/server/prefetch";
import {
  prefetchCurrentOrganization,
  prefetchOrganizations,
} from "@/features/organizations/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

type Props = {
  searchParams: Promise<SearchParams>;
};

const ListLoading = () => (
  <div className="px-4">
    {Array.from({ length: 12 }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
      <div key={i} className="flex items-center gap-3 py-2.5 -mx-4 px-5">
        <Skeleton style={{ width: 64, height: 64, minWidth: 64 }} className="rounded-lg" />
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

  const params = await bookablesParamsLoader(searchParams);
  prefetchOrganizations();
  prefetchCurrentOrganization();
  prefetchCollections();
  prefetchBookables({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    collectionId: params.collectionId ?? undefined,
  });

  return (
    <div className="flex flex-col h-full">
      <h1 className="hidden sm:block px-4 pt-6 pb-2 text-2xl font-bold tracking-tight">Servicios</h1>
      <HydrateClient>
        <BookablesListActions />
        <ErrorBoundary fallback={<div className="p-4 text-sm text-destructive">Error loading services</div>}>
          <Suspense fallback={<ListLoading />}>
            <BookablesListItems />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
};

export default Page;

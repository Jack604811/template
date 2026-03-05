import {
  BookablesContainer,
  BookablesList,
  BookablesLoading,
  BookablesError,
} from "@/features/bookables/components/bookables";
import { bookablesParamsLoader } from "@/features/bookables/server/params-loader";
import { prefetchCollections } from "@/features/bookables/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();

  const params = await bookablesParamsLoader(searchParams);
  await prefetchCollections();

  return (
    <BookablesContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<BookablesError />}>
          <Suspense fallback={<BookablesLoading />}>
            <BookablesList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </BookablesContainer>
  );
};

export default Page;


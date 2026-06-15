import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { NewBookablePage } from "@/features/bookables/components/new-bookable-page";
import { BookablesLoading, BookablesError } from "@/features/bookables/components/bookables";

const Page = async () => {
  await requireAuth();

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<BookablesError />}>
        <Suspense fallback={<BookablesLoading />}>
          <NewBookablePage />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;

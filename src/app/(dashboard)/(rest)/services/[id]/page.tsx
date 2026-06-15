import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { prefetchBookable } from "@/features/bookables/server/prefetch";
import { BookableDetailsPage } from "@/features/bookables/components/bookable-details-page";
import { BookablesLoading, BookablesError } from "@/features/bookables/components/bookables";

type Props = {
  params: Promise<{ id: string }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { id } = await params;
  
  try {
    await prefetchBookable(id);
  } catch {
    // Silently handle prefetch errors - component will fetch on client side
  }

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<BookablesError />}>
        <Suspense fallback={<BookablesLoading />}>
          <BookableDetailsPage bookableId={id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;

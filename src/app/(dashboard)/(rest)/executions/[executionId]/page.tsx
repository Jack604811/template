import { ExecutionView } from "@/features/executions/components/execution";
import { ExecutionHeaderClient } from "@/features/executions/components/execution-header-client";
import { ExecutionsError, ExecutionsLoading } from "@/features/executions/components/executions";
import { prefetchExecution } from "@/features/executions/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps {
  params: Promise<{
    executionId: string;
  }>
};

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  
  const { executionId } = await params;
  prefetchExecution(executionId);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<ExecutionsError />}>
        <Suspense fallback={<ExecutionsLoading />}>
          <ExecutionHeaderClient executionId={executionId} />
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:px-10 md:py-6 h-full">
              <div className="mx-auto max-w-screen-md w-full flex flex-col gap-y-8 h-full">
                <ExecutionView executionId={executionId} />
              </div>
            </div>
          </main>
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  )
};

export default Page;

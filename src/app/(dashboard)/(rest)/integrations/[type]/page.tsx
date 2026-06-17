import { prefetchCredentials } from "@/features/credentials/server/prefetch";
import { IntegrationDetailsPage } from "@/features/integrations/components/integration-details-page";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

type Props = { params: Promise<{ type: string }> };

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { type } = await params;
  try {
    await prefetchCredentials({ pageSize: 100 });
  } catch {
    // client will fetch
  }

  return (
    <HydrateClient>
      <IntegrationDetailsPage type={type.toUpperCase()} />
    </HydrateClient>
  );
};

export default Page;

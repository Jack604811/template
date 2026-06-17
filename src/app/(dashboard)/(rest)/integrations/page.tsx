import { prefetchCredentials } from "@/features/credentials/server/prefetch";
import { IntegrationsPage } from "@/features/integrations/components/integrations-page";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

const Page = async () => {
  await requireAuth();
  try {
    await prefetchCredentials({ pageSize: 100 });
  } catch {
    // Client will fetch
  }

  return (
    <HydrateClient>
      <IntegrationsPage />
    </HydrateClient>
  );
};

export default Page;

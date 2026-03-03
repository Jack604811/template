import { requireAuth } from "@/lib/auth-utils";
import { OrganizationSettingsView } from "@/features/organizations/components/organization-settings-view";
import { prefetchCurrentOrganization, prefetchOrganizationMembers, prefetchOrganizations } from "@/features/organizations/server/prefetch";
import { prefetchCustomFields } from "@/features/custom-fields/server/prefetch";
import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components";

const Page = async () => {
  const session = await requireAuth();
  
  // Prefetch organization data
  await prefetchOrganizations();
  const currentOrgId = session.session.activeOrganizationId;
  
  if (currentOrgId) {
    await prefetchOrganizationMembers(currentOrgId);
    await prefetchCustomFields();
  }

  return (
    <Suspense fallback={<LoadingView />}>
      <OrganizationSettingsView />
    </Suspense>
  );
};

export default Page;


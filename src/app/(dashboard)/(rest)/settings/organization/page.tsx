import { requireAuth } from "@/lib/auth-utils";
import { OrganizationSettingsView } from "@/features/organizations/components/organization-settings-view";
import { prefetchOrganizationInvitations, prefetchOrganizationMembers, prefetchOrganizations } from "@/features/organizations/server/prefetch";
import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components";

const Page = async () => {
  const session = await requireAuth();
  
  // Prefetch organization data
  await prefetchOrganizations();
  const currentOrgId = session.session.activeOrganizationId;
  
  if (currentOrgId) {
    await prefetchOrganizationMembers(currentOrgId);
    await prefetchOrganizationInvitations(currentOrgId);
  }

  return (
    <Suspense fallback={<LoadingView />}>
      <OrganizationSettingsView />
    </Suspense>
  );
};

export default Page;


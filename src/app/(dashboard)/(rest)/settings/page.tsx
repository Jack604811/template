import { Suspense } from "react";
import { LoadingView } from "@/components/entity-components";
import { prefetchCustomFields } from "@/features/custom-fields/server/prefetch";
import { SettingsPage } from "@/features/organizations/components/settings-page";
import {
  prefetchCurrentOrganization,
  prefetchOrganizationMembers,
  prefetchOrganizations,
} from "@/features/organizations/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";

const Page = async () => {
  const session = await requireAuth();

  await prefetchOrganizations();
  const currentOrgId = session.session.activeOrganizationId;

  if (currentOrgId) {
    await prefetchCurrentOrganization();
    await prefetchOrganizationMembers(currentOrgId);
    await prefetchCustomFields();
  }

  return (
    <Suspense fallback={<LoadingView />}>
      <SettingsPage />
    </Suspense>
  );
};

export default Page;

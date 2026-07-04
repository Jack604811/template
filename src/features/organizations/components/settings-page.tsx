"use client";

import { memo } from "react";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCurrentOrganization,
  useSuspenseOrganizations,
} from "../hooks/use-organizations";
import type { OrgRole } from "../utils/roles";
import { DesktopSettings } from "./settings/desktop-settings";
import { MobileSettings } from "./settings/mobile-settings";

export const SettingsPage = memo(() => {
  const isMobile = useIsMobile();
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const { hasActiveSubscription } = useHasActiveSubscription();

  const membership = memberships.find((m) => m.organization.id === currentOrgId);
  const org = membership?.organization;
  const role = (membership?.role ?? "readonly") as OrgRole;
  const plan = hasActiveSubscription ? "Pro" : "Free";

  if (!org || !currentOrgId) return null;

  if (isMobile) {
    return <MobileSettings orgName={org.name} orgId={currentOrgId} role={role} plan={plan} />;
  }

  return <DesktopSettings orgName={org.name} orgId={currentOrgId} role={role} plan={plan} />;
});
SettingsPage.displayName = "SettingsPage";

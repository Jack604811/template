import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

/**
 * Prefetch user's organizations
 */
export const prefetchOrganizations = () => {
  return prefetch(trpc.organizations.getMany.queryOptions());
};

/**
 * Prefetch current organization
 */
export const prefetchCurrentOrganization = () => {
  return prefetch(trpc.organizations.getCurrent.queryOptions());
};

/**
 * Prefetch organization members (for settings page)
 */
export const prefetchOrganizationMembers = (organizationId: string) => {
  return prefetch(trpc.organizations.getMembers.queryOptions({ organizationId }));
};


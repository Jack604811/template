import { prefetch, trpc } from "@/trpc/server";

/**
 * Prefetch all organization custom fields
 */
export const prefetchCustomFields = () => {
  return prefetch(trpc.customFields.getMany.queryOptions());
};

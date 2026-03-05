import { prefetch, trpc } from "@/trpc/server";

/**
 * Prefetch templates (system + user)
 */
export const prefetchTemplates = () => {
  return prefetch(trpc.templates.getMany.queryOptions());
};

/**
 * Prefetch template categories
 */
export const prefetchTemplateCategories = () => {
  return prefetch(trpc.templates.getCategories.queryOptions());
};

/**
 * Prefetch user templates
 */
export const prefetchUserTemplates = () => {
  return prefetch(trpc.templates.getUser.queryOptions());
};


import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";
import { bookablesParamsParser } from "../params";

type CollectionsInput = inferInput<typeof trpc.bookableCollections.getMany>;
type BookablesInput = inferInput<typeof trpc.bookables.getMany>;

/**
 * Prefetch all collections
 */
export const prefetchCollections = () => {
  return prefetch(trpc.bookableCollections.getMany.queryOptions());
};

/**
 * Prefetch a single collection
 */
export const prefetchCollection = (id: string) => {
  return prefetch(trpc.bookableCollections.getOne.queryOptions({ id }));
};

/**
 * Prefetch bookables for a collection
 */
export const prefetchBookables = (params: BookablesInput) => {
  return prefetch(trpc.bookables.getMany.queryOptions(params));
};

/**
 * Prefetch a single bookable
 */
export const prefetchBookable = (id: string) => {
  return prefetch(trpc.bookables.getOne.queryOptions({ id }));
};


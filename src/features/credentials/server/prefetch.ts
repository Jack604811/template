import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.credentials.getMany>;

/**
 * Prefetch all credentials
 */
export const prefetchCredentials = async (params: Input) => {
  return await prefetch(trpc.credentials.getMany.queryOptions(params));
};

/**
 * Prefetch a single credential
 */
export const prefetchCredential = async (id: string) => {
  return await prefetch(trpc.credentials.getOne.queryOptions({ id }));
};

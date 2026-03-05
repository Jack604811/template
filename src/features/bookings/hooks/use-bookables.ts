import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

/**
 * Hook to find or create a bookable
 */
export const useFindOrCreateBookable = () => {
  const trpc = useTRPC();

  return useMutation(trpc.bookables.findOrCreate.mutationOptions());
};


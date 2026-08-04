"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export const useCompleteOnboarding = () => {
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation(
    trpc.onboarding.complete.mutationOptions({
      onSuccess: () => {
        router.push("/chat");
      },
      onError: (error) => {
        toast.error(`Failed to complete onboarding: ${error.message}`);
      },
    })
  );
};

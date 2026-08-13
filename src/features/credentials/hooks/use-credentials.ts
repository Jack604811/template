import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCredentialsParams } from "./use-credentials-params";
import type { CredentialType } from "@/generated/prisma";

/**
 * Hook to fetch all credentials using suspense
 */
export const useSuspenseCredentials = () => {
  const trpc = useTRPC();
  const [params] = useCredentialsParams();
  
  return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params));
};

/**
 * Hook to create a new credentials
 */
export const useCreateCredential = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.credentials.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Credential "${data.name}" created`);
        queryClient.invalidateQueries(
          trpc.credentials.getMany.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create credential: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to remove a credential
 */
export const useRemoveCredential = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.credentials.remove.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Credential "${data.name}" removed`);
        queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.credentials.getOne.queryFilter({ id: data.id }),
        );
      }
    })
  )
}

/**
 * Hook to fetch a single credential using suspense
 */
export const useSuspenseCredential = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.credentials.getOne.queryOptions({ id }));
};

/**
 * Hook to update a credential
 */
export const useUpdateCredential = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.credentials.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Credential "${data.name}" saved`);
        queryClient.invalidateQueries(
          trpc.credentials.getMany.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.credentials.getOne.queryOptions({ id: data.id }),
        );
        queryClient.invalidateQueries(
          trpc.credentials.getOneForEdit.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to save credential: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to fetch a single credential with decrypted value for editing.
 * Only use when the edit dialog is open to avoid exposing decrypted secrets.
 */
export const useCredentialForEdit = (id: string | undefined, enabled: boolean) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.credentials.getOneForEdit.queryOptions({ id: id ?? "" }),
    enabled: Boolean(id && enabled),
  });
};

/**
 * Hook to fetch approved WhatsApp templates for a credential (requires credential to have WABA ID).
 */
export const useWhatsAppTemplates = (credentialId: string | undefined, enabled: boolean) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.credentials.getWhatsAppTemplates.queryOptions({ credentialId: credentialId ?? "" }),
    enabled: Boolean(credentialId && enabled),
  });
};

/**
 * Hook to complete the WhatsApp Embedded Signup flow (exchange code, create/update credential).
 */
export const useCompleteWhatsAppEmbeddedSignup = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.credentials.completeWhatsAppEmbeddedSignup.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
      },
    }),
  );
};

/**
 * Hook to fetch credentials by type
 */
export const useCredentialsByType = (type: CredentialType) => {
  const trpc = useTRPC();
  return useQuery(trpc.credentials.getByType.queryOptions({ type }));
};

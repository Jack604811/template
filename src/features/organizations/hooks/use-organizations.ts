"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { startTransition } from "react";

/**
 * Hook to fetch all organizations user is a member of
 */
export const useSuspenseOrganizations = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.organizations.getMany.queryOptions());
};

/**
 * Hook to get current active organization
 */
export const useCurrentOrganization = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.organizations.getCurrent.queryOptions());
};

/**
 * Hook to get current organization with all settings
 */
export const useCurrentOrganizationWithSettings = () => {
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  
  const currentMembership = memberships.find(m => m.organization.id === currentOrgId);
  return currentMembership?.organization || null;
};

/**
 * Hook to get organization members
 */
export const useSuspenseOrganizationMembers = (organizationId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.organizations.getMembers.queryOptions({ organizationId })
  );
};

/**
 * Hook to get pending invitations for an organization
 */
export const useSuspenseOrganizationInvitations = (organizationId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.organizations.getInvitations.queryOptions({ organizationId })
  );
};

/**
 * Hook to switch active organization
 * Automatically resets navigation history and redirects detail pages to list pages
 */
export const useSwitchOrganization = () => {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(
    trpc.organizations.switchOrganization.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        
        // If on workflow editor page, redirect to workflows list
        // Editor pages are at /workflows/[workflowId]
        if (pathname?.startsWith("/calendar/") && pathname !== "/calendar") {
          router.push("/calendar");
        } else {
          // For other pages, reload to refresh all data
          window.location.reload();
        }
      },
      onError: (error) => {
        toast.error(`Failed to switch organization: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to create a new organization
 */
export const useCreateOrganization = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(
    trpc.organizations.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Organization "${data.name}" created`);
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getMany.queryOptions()
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to create organization: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to invite a member to organization
 */
export const useInviteMember = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.organizations.inviteMember.mutationOptions({
      onMutate: async (variables) => {
        const key = trpc.organizations.getInvitations.queryOptions({ organizationId: variables.organizationId }).queryKey;
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        queryClient.setQueryData(key, (old: typeof previous) => {
          const optimistic = {
            id: `optimistic-${Date.now()}`,
            organizationId: variables.organizationId,
            email: variables.email,
            role: variables.role,
            inviterId: "",
            status: "pending",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          };
          return old ? [optimistic, ...old] : [optimistic];
        });
        return { previous, organizationId: variables.organizationId };
      },
      onError: (error, _variables, context) => {
        if (context?.previous !== undefined) {
          const key = trpc.organizations.getInvitations.queryOptions({ organizationId: context.organizationId }).queryKey;
          queryClient.setQueryData(key, context.previous);
        }
        toast.error(error.message);
      },
      onSuccess: (data) => {
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getInvitations.queryOptions({ organizationId: data.organizationId })
          );
        });
      },
    })
  );
};

/**
 * Hook to cancel a pending invitation
 */
export const useCancelInvitation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.organizations.cancelInvitation.mutationOptions({
      onMutate: async (variables) => {
        const key = trpc.organizations.getInvitations.queryOptions({ organizationId: variables.organizationId }).queryKey;
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        queryClient.setQueryData(key, (old: typeof previous) =>
          old ? old.filter((inv) => inv.id !== variables.invitationId) : old
        );
        return { previous, organizationId: variables.organizationId };
      },
      onError: (error, _variables, context) => {
        if (context?.previous !== undefined) {
          const key = trpc.organizations.getInvitations.queryOptions({ organizationId: context.organizationId }).queryKey;
          queryClient.setQueryData(key, context.previous);
        }
        toast.error(error.message);
      },
      onSuccess: (_, variables) => {
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getInvitations.queryOptions({ organizationId: variables.organizationId })
          );
        });
      },
    })
  );
};

/**
 * Hook to remove a member from organization
 */
export const useRemoveMember = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(
    trpc.organizations.removeMember.mutationOptions({
      onSuccess: (_, variables) => {
        toast.success("Member removed");
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getMembers.queryOptions({ 
              organizationId: variables.organizationId 
            })
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to remove member: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to update member role
 */
export const useUpdateMemberRole = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(
    trpc.organizations.updateMemberRole.mutationOptions({
      onSuccess: (data) => {
        toast.success("Member role updated");
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getMembers.queryOptions({ 
              organizationId: data.organizationId 
            })
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to update role: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to update organization name
 */
export const useUpdateOrganizationName = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: currentOrgId } = useCurrentOrganization();
  
  return useMutation(
    trpc.organizations.updateName.mutationOptions({
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(
          trpc.organizations.getMany.queryOptions()
        );
        await queryClient.cancelQueries(
          trpc.organizations.getCurrent.queryOptions()
        );

        // Snapshot previous values
        const previousMany = queryClient.getQueryData(
          trpc.organizations.getMany.queryOptions().queryKey
        );
        const previousCurrent = queryClient.getQueryData(
          trpc.organizations.getCurrent.queryOptions().queryKey
        );

        // Optimistically update cache
        queryClient.setQueryData(
          trpc.organizations.getMany.queryOptions().queryKey,
          (old: typeof previousMany) => {
            if (!old) return old;
            return old.map((membership) =>
              membership.organization.id === currentOrgId
                ? {
                    ...membership,
                    organization: {
                      ...membership.organization,
                      name: variables.name,
                    },
                  }
                : membership
            );
          }
        );

        queryClient.setQueryData(
          trpc.organizations.getCurrent.queryOptions().queryKey,
          (old: typeof previousCurrent) => {
            if (!old) return old;
            return old;
          }
        );

        return { previousMany, previousCurrent };
      },
      onError: (error, _variables, context) => {
        // Rollback on error
        if (context?.previousMany) {
          queryClient.setQueryData(
            trpc.organizations.getMany.queryOptions().queryKey,
            context.previousMany
          );
        }
        if (context?.previousCurrent) {
          queryClient.setQueryData(
            trpc.organizations.getCurrent.queryOptions().queryKey,
            context.previousCurrent
          );
        }
        toast.error(`Failed to update organization: ${error.message}`);
      },
      onSuccess: () => {
        // Invalidate to refetch fresh data (non-blocking)
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getMany.queryOptions()
          );
          queryClient.invalidateQueries(
            trpc.organizations.getCurrent.queryOptions()
          );
        });
      },
    })
  );
};

/**
 * Hook to update organization settings
 */
export const useUpdateOrganizationSettings = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: currentOrgId } = useCurrentOrganization();

  return useMutation(
    trpc.organizations.updateSettings.mutationOptions({
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(
          trpc.organizations.getMany.queryOptions()
        );
        await queryClient.cancelQueries(
          trpc.organizations.getCurrent.queryOptions()
        );

        // Snapshot previous values
        const previousMany = queryClient.getQueryData(
          trpc.organizations.getMany.queryOptions().queryKey
        );
        const previousCurrent = queryClient.getQueryData(
          trpc.organizations.getCurrent.queryOptions().queryKey
        );

        // Optimistically update cache
        queryClient.setQueryData(
          trpc.organizations.getMany.queryOptions().queryKey,
          (old: typeof previousMany) => {
            if (!old) return old;
            return old.map((membership) =>
              membership.organization.id === currentOrgId
                ? {
                    ...membership,
                    organization: {
                      ...membership.organization,
                      ...(variables.country && { country: variables.country }),
                      ...(variables.currency && { currency: variables.currency }),
                      ...(variables.timezone && { timezone: variables.timezone }),
                      ...(variables.weekStart && { weekStart: variables.weekStart }),
                      ...(variables.dateTimeFormat && {
                        dateTimeFormat: variables.dateTimeFormat,
                      }),
                    },
                  }
                : membership
            );
          }
        );

        queryClient.setQueryData(
          trpc.organizations.getCurrent.queryOptions().queryKey,
          (old: typeof previousCurrent) => {
            if (!old) return old;
            // getCurrent returns just the organization ID, so we don't update it here
            return old;
          }
        );

        return { previousMany, previousCurrent };
      },
      onError: (error, _variables, context) => {
        // Rollback on error
        if (context?.previousMany) {
          queryClient.setQueryData(
            trpc.organizations.getMany.queryOptions().queryKey,
            context.previousMany
          );
        }
        if (context?.previousCurrent) {
          queryClient.setQueryData(
            trpc.organizations.getCurrent.queryOptions().queryKey,
            context.previousCurrent
          );
        }
        toast.error(`Failed to update settings: ${error.message}`);
      },
      onSuccess: () => {
        // Invalidate to refetch fresh data (non-blocking)
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.organizations.getMany.queryOptions()
          );
          queryClient.invalidateQueries(
            trpc.organizations.getCurrent.queryOptions()
          );
        });
      },
    })
  );
};


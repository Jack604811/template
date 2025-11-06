"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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
 * Hook to get organization members
 */
export const useSuspenseOrganizationMembers = (organizationId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.organizations.getMembers.queryOptions({ organizationId })
  );
};

/**
 * Hook to switch active organization
 */
export const useSwitchOrganization = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation(
    trpc.organizations.switchOrganization.mutationOptions({
      onSuccess: () => {
        toast.success("Switched organization");
        queryClient.invalidateQueries();
        window.location.reload(); // Reload to refresh all data
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
        queryClient.invalidateQueries(
          trpc.organizations.getMany.queryOptions()
        );
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
      onSuccess: (data) => {
        toast.success(`Invitation sent to ${data.email}`);
        queryClient.invalidateQueries(
          trpc.organizations.getMembers.queryOptions({ 
            organizationId: data.organizationId 
          })
        );
      },
      onError: (error) => {
        toast.error(`Failed to invite member: ${error.message}`);
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
        queryClient.invalidateQueries(
          trpc.organizations.getMembers.queryOptions({ 
            organizationId: variables.organizationId 
          })
        );
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
        queryClient.invalidateQueries(
          trpc.organizations.getMembers.queryOptions({ 
            organizationId: data.organizationId 
          })
        );
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
  
  return useMutation(
    trpc.organizations.updateName.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Organization "${data.name}" updated`);
        queryClient.invalidateQueries(
          trpc.organizations.getMany.queryOptions()
        );
        queryClient.invalidateQueries(
          trpc.organizations.getCurrent.queryOptions()
        );
      },
      onError: (error) => {
        toast.error(`Failed to update organization: ${error.message}`);
      },
    })
  );
};


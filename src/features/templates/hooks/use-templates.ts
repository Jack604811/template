import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook to fetch templates (system + user) using suspense
 */
export const useSuspenseTemplates = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.templates.getMany.queryOptions());
};

/**
 * Hook to fetch templates (system + user) - non-suspense version
 */
export const useTemplates = () => {
  const trpc = useTRPC();
  return useQuery(trpc.templates.getMany.queryOptions());
};

/**
 * Hook to fetch template categories using suspense
 */
export const useSuspenseTemplateCategories = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.templates.getCategories.queryOptions());
};

/**
 * Hook to fetch template categories
 */
export const useTemplateCategories = () => {
  const trpc = useTRPC();
  return useQuery(trpc.templates.getCategories.queryOptions());
};

/**
 * Hook to create workflow from template
 */
export const useCreateFromTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.createFrom.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow "${data.name}" created from template`);
        queryClient.invalidateQueries(
          trpc.workflows.getMany.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create workflow from template: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to save workflow as template
 */
export const useSaveTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.save.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workflow saved as template "${data.name}"`);
        queryClient.invalidateQueries(trpc.templates.getMany.queryOptions());
        queryClient.invalidateQueries(
          trpc.templates.getUser.queryOptions(),
        );
        queryClient.invalidateQueries(
          trpc.workflows.getMany.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to save as template: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to create a template category
 */
export const useCreateTemplateCategory = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.createCategory.mutationOptions({
      onSuccess: () => {
        toast.success("Category created");
        queryClient.invalidateQueries(
          trpc.templates.getCategories.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create category: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to remove template status from a workflow
 */
export const useRemoveTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Template removed");
        queryClient.invalidateQueries(
          trpc.workflows.getMany.queryOptions({}),
        );
        queryClient.invalidateQueries(trpc.templates.getMany.queryOptions());
        queryClient.invalidateQueries(
          trpc.templates.getUser.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to remove template: ${error.message}`);
      },
    }),
  );
};


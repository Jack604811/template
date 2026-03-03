"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  EmptyView,
  EntityContainer, 
  EntityItem, 
  EntityList, 
  EntityPagination, 
  EntitySearch,
  ErrorView,
  LoadingView
} from "@/components/entity-components";
import { WorkflowsListHeader } from "./workflows-list-header";
import { useCreateWorkflow, useRemoveWorkflow, useDuplicateWorkflow, useSuspenseWorkflows } from "../hooks/use-workflows"
import { useRemoveTemplate, useSaveTemplate } from "@/features/templates/hooks/use-templates"
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useRouter } from "next/navigation";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Workflow } from "@/generated/prisma";
import { WorkflowIcon, FileTextIcon, CopyIcon, TrashIcon, XIcon } from "lucide-react";
import type { EntityMenuGroup } from "@/components/entity-components";
import { WorkflowTemplateDialog } from "./workflow-template-dialog";
import { Badge } from "@/components/ui/badge";

export const WorkflowsSearch = () => {
  const [params, setParams] = useWorkflowsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search workflows"
    />
  );
};

export const WorkflowsList = () => {
  const workflows = useSuspenseWorkflows();

  return (
    <EntityList
      items={workflows.data.items}
      getKey={(workflow) => workflow.id}
      renderItem={(workflow) => <WorkflowItem data={workflow} />}
      emptyView={<WorkflowsEmpty />}
    />
  )
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { modal } = useUpgradeModal();

  const handleCreate = () => {
    setDialogOpen(true);
  }

  return (
    <>
      {modal}
      <WorkflowTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <WorkflowsListHeader
        onNew={handleCreate}
        disabled={disabled}
      />
    </>
  );
};

export const WorkflowsPagination = () => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();

  return (
    <EntityPagination
      disabled={workflows.isFetching}
      totalPages={workflows.data.totalPages}
      page={workflows.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const WorkflowsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <WorkflowsHeader />
      <div className="flex-1 overflow-auto">
        <EntityContainer
          search={<WorkflowsSearch />}
          pagination={<WorkflowsPagination />}
        >
          {children}
        </EntityContainer>
      </div>
    </div>
  );
};

export const WorkflowsLoading = () => {
  return <LoadingView message="Loading workflows..." />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Error loading workflows" />;
};

export const WorkflowsEmpty = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { modal } = useUpgradeModal();

  const handleCreate = () => {
    setDialogOpen(true);
  };

  return (
    <>
      {modal}
      <WorkflowTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EmptyView
        onNew={handleCreate}
        message="You haven't created any workflows yet. Get started by creating your first workflow"
      />
    </>
  );
};

export const WorkflowItem = ({
  data,
}: { 
  data: Workflow
}) => {
  const router = useRouter();
  const removeWorkflow = useRemoveWorkflow();
  const duplicateWorkflow = useDuplicateWorkflow();
  const removeTemplate = useRemoveTemplate();
  const saveTemplate = useSaveTemplate();

  const handleSaveAsTemplate = () => {
    saveTemplate.mutate({
      workflowId: data.id,
    });
  };

  const handleRemoveTemplate = () => {
    removeTemplate.mutate(
      { workflowId: data.id },
      {
        onSuccess: () => {
          // Workflow is now a regular workflow, not a template
        },
      }
    );
  };

  const handleDuplicate = () => {
    duplicateWorkflow.mutate(
      { id: data.id },
      {
        onSuccess: (duplicated) => {
          router.push(`/workflows/${duplicated.id}`);
        },
      }
    );
  };

  const handleDelete = () => {
    removeWorkflow.mutate(
      { id: data.id },
      {
        onSuccess: () => {
          router.push("/workflows");
        },
      }
    );
  };

  const menuGroups: EntityMenuGroup[] = [
    {
      items: [
        ...(data.isTemplate
          ? [
              {
                label: "Remove Template",
                icon: XIcon,
                onClick: handleRemoveTemplate,
                disabled: removeTemplate.isPending,
              },
            ]
          : [
              {
                label: "Save as Template",
                icon: FileTextIcon,
                onClick: handleSaveAsTemplate,
              },
            ]),
        {
          label: "Duplicate Workflow",
          icon: CopyIcon,
          onClick: handleDuplicate,
          disabled: duplicateWorkflow.isPending,
        },
      ],
    },
    {
      separator: true,
      items: [
        {
          label: "Delete Workflow",
          icon: TrashIcon,
          onClick: handleDelete,
          variant: "destructive",
          disabled: removeWorkflow.isPending,
        },
      ],
    },
  ];

  return (
      <EntityItem
        href={`/workflows/${data.id}`}
        title={
          <div className="flex items-center gap-2">
            <span>{data.name}</span>
            {data.isTemplate && (
              <Badge variant="secondary" className="text-xs font-normal">
                Template
              </Badge>
            )}
          </div>
        }
        subtitle={
          <>
            Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
            &bull; Created{" "}
            {formatDistanceToNow(data.createdAt, { addSuffix: true })}
          </>
        }
        image={
          <div className="size-8 flex items-center justify-center">
            <WorkflowIcon className="size-5 text-muted-foreground" />
          </div>
        }
        menuGroups={menuGroups}
      />
  );
};
"use client";

import { formatDistanceToNow } from "date-fns";
import { 
  EmptyView,
  EntityContainer, 
  EntityItem, 
  EntityList, 
  EntityPagination, 
  ErrorView,
  LoadingView
} from "@/components/entity-components";
import { useSuspenseExecutions } from "../hooks/use-executions"
import { useExecutionsParams } from "../hooks/use-executions-params";
import { ExecutionsListHeader } from "./executions-list-header";
import type { Execution } from "@/generated/prisma";
import { ExecutionStatus } from "@/generated/prisma";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from "lucide-react";

export const ExecutionsList = ({ 
  workflowId, 
  disableNavigation = false 
}: { 
  workflowId?: string;
  disableNavigation?: boolean;
}) => {
  const executions = useSuspenseExecutions(workflowId);

  return (
    <EntityList
      items={executions.data.items}
      getKey={(execution) => execution.id}
      renderItem={(execution) => (
        <ExecutionItem 
          data={execution} 
          disableNavigation={disableNavigation} 
        />
      )}
      emptyView={<ExecutionsEmpty />}
    />
  );
};

export const ExecutionsPagination = ({ workflowId }: { workflowId?: string }) => {
  const executions = useSuspenseExecutions(workflowId);
  const [params, setParams] = useExecutionsParams();

  return (
    <EntityPagination
      disabled={executions.isFetching}
      totalPages={executions.data.totalPages}
      page={executions.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const ExecutionsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ExecutionsListHeader />
      <div className="flex-1 overflow-auto">
        <EntityContainer
          pagination={<ExecutionsPagination />}
        >
          {children}
        </EntityContainer>
      </div>
    </div>
  );
};

export const ExecutionsLoading = () => {
  return <LoadingView message="Loading executions..." />;
};

export const ExecutionsError = () => {
  return <ErrorView message="Error loading executions" />;
};

export const ExecutionsEmpty = () => {
  return (
    <EmptyView
      message="You haven't created any executions yet. Get started by running your first workflow"
    />
  );
};

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;
  }
}

const formatStatus = (status: ExecutionStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ExecutionItem = ({
  data,
  disableNavigation = false,
}: { 
  data: Execution & {
    workflow: {
      id: string;
      name: string;
    };
  };
  disableNavigation?: boolean;
}) => {
  const duration = data.completedAt
    ? Math.round(
      (new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000,
    )
    : null;

  const subtitle = (
    <>
      {data.workflow.name} &bull; Started{" "}
      {formatDistanceToNow(data.startedAt, { addSuffix: true })}
      {duration !== null && <> &bull; Took {duration}s </>}
    </>
  );

  return (
    <EntityItem
      href={disableNavigation ? undefined : `/executions/${data.id}`}
      title={formatStatus(data.status)}
      subtitle={subtitle}
      image={
        <div className="size-8 flex items-center justify-center">
          {getStatusIcon(data.status)}
        </div>
      }
      className={disableNavigation ? "cursor-default hover:shadow-none" : undefined}
    />
  )
};

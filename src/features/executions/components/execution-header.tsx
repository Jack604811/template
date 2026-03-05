"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ExecutionStatus } from "@/generated/prisma";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";

interface ExecutionHeaderProps {
  executionId: string;
  status?: ExecutionStatus;
  workflowName?: string;
}

export const ExecutionHeader = ({ executionId, status, workflowName }: ExecutionHeaderProps) => {
  const { handleBreadcrumbClick } = useDetailPageNavigation("/executions");

  const formatStatus = (status: ExecutionStatus) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
      <SidebarTrigger />
      <div className="flex flex-row items-center justify-between gap-x-4 w-full">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link 
                  prefetch 
                  href="/executions"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBreadcrumbClick();
                  }}
                >
                  Executions
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {executionId.slice(0, 8)}
            </BreadcrumbItem>
            {status && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <Badge variant="outline" className="text-xs">
                    {formatStatus(status)}
                  </Badge>
                </BreadcrumbItem>
              </>
            )}
            {workflowName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="text-muted-foreground">
                  {workflowName}
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
};

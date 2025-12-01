"use client";

import { memo, useState, Suspense, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  ExecutionsList, 
  ExecutionsLoading, 
  ExecutionsError,
  ExecutionsPagination,
} from "@/features/executions/components/executions";

interface EditorExecutionListProps {
  workflowId: string;
}

const PANEL_CLASSES = "fixed right-2 top-16 bottom-2 w-[420px] bg-background rounded-xl border shadow-sm z-50 flex flex-col";

const ExecutionsPanel = memo(({ workflowId }: { workflowId: string }) => {
  return (
    <div
      className={PANEL_CLASSES}
      role="dialog"
      aria-label="Workflow executions"
      aria-modal="false"
    >
      <ErrorBoundary fallback={<ExecutionsError />}>
        <Suspense fallback={<ExecutionsLoading />}>
          <div className="flex h-full flex-col px-4 py-3 space-y-4">
            <div className="flex-1 overflow-y-auto pr-1">
              <ExecutionsList workflowId={workflowId} />
            </div>
            <ExecutionsPagination workflowId={workflowId} />
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

ExecutionsPanel.displayName = "ExecutionsPanel";

export const EditorExecutionList = memo(({ workflowId }: EditorExecutionListProps) => {
  const [executionsOpen, setExecutionsOpen] = useState(false);
  const isClient = typeof window !== "undefined";
  const prevWorkflowIdRef = useRef(workflowId);

  const handleToggle = useCallback(() => {
    setExecutionsOpen((prev) => !prev);
  }, []);

  // Close panel when workflowId changes
  useEffect(() => {
    if (prevWorkflowIdRef.current !== workflowId) {
      setExecutionsOpen(false);
      prevWorkflowIdRef.current = workflowId;
    }
  }, [workflowId]);

  useEffect(() => {
    if (!executionsOpen || !isClient) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExecutionsOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [executionsOpen, isClient]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hover:bg-inherit"
        onClick={handleToggle}
        aria-expanded={executionsOpen}
        aria-controls="executions-panel"
      >
        <HistoryIcon className="size-4" />
        Executions
      </Button>
      {executionsOpen && isClient && createPortal(
        <ExecutionsPanel workflowId={workflowId} />,
        document.body
      )}
    </>
  );
});

EditorExecutionList.displayName = "EditorExecutionList";


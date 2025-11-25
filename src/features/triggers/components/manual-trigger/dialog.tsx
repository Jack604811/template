"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExecuteWorkflowButton } from "@/features/editor/components/execute-workflow-button";
import { useParams } from "next/navigation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ManualTriggerDialog = ({
  open,
  onOpenChange
}: Props) => {
  const { workflowId } = useParams() as { workflowId: string };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Trigger</DialogTitle>
          <DialogDescription>
            Configure settings for the manual trigger node.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Used to manually execute a workflow. Click the button below to run it now.
          </p>
          
          <div className="flex justify-center">
             <ExecuteWorkflowButton workflowId={workflowId} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

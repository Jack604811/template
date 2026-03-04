import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { PlayIcon } from "lucide-react";

export const ExecuteWorkflowButton = ({
  workflowId,
  nodeId,
}: {
  workflowId: string;
  nodeId?: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering node click/drag if used inside a node
    executeWorkflow.mutate({ id: workflowId, triggerNodeId: nodeId });
  };

  return (
    <Button 
      className="rounded-xl"
      onClick={handleExecute} 
      disabled={executeWorkflow.isPending} 
      size="lg"
    >
      <PlayIcon className="size-5" />
      Execute Workflow
    </Button>
  );
};

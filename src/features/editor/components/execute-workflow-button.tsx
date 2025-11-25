import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { PlayIcon } from "lucide-react";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering node click/drag if used inside a node
    executeWorkflow.mutate({ id: workflowId });
  };

  return (
    <Button 
      onClick={handleExecute} 
      disabled={executeWorkflow.isPending} 
      size="lg"
    >
      <PlayIcon className="size-4" />
      Execute workflow
    </Button>
  );
};

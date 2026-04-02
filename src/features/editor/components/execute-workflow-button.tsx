import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/features/editor/store/workflow-store";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { PlayIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export const ExecuteWorkflowButton = ({
  workflowId,
  nodeId,
}: {
  workflowId: string;
  nodeId?: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const { nodes, edges } = useWorkflowStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges })),
  );

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation();
    executeWorkflow.mutate({
      id: workflowId,
      triggerNodeId: nodeId,
      nodes,
      edges,
    });
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

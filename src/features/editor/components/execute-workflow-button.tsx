import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { useAtomValue } from "jotai";
import { PlayIcon } from "lucide-react";
import { editorAtom } from "../store/atoms";

export const ExecuteWorkflowButton = ({
  workflowId,
  nodeId,
}: {
  workflowId: string;
  nodeId?: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const editor = useAtomValue(editorAtom);

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering node click/drag if used inside a node
    const nodes = editor?.getNodes();
    const edges = editor?.getEdges();
    executeWorkflow.mutate({
      id: workflowId,
      triggerNodeId: nodeId,
      ...(nodes && edges ? { nodes, edges } : {}),
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

import { NodeProps, NodeToolbar, Position } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { MousePointerIcon } from "lucide-react";
import { ManualTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";
import { ExecuteWorkflowButton } from "@/features/editor/components/execute-workflow-button";
import { useParams } from "next/navigation";

export const ManualTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { workflowId } = useParams() as { workflowId: string };

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MANUAL_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchManualTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  return (
    <>
      <NodeToolbar position={Position.Left} align="center" offset={10}>
        <ExecuteWorkflowButton 
          workflowId={workflowId}  
        />
      </NodeToolbar>

      <ManualTriggerDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <BaseTriggerNode
        {...props}
        icon={MousePointerIcon}
        name="When clicking 'Execute workflow'"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
});

import type { NodeExecutor } from "@/features/executions/types";
import { boldTriggerChannel } from "@/inngest/channels/bold-trigger";

export const boldTriggerExecutor: NodeExecutor = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    boldTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("bold-trigger", async () => context);

    await publish(
      boldTriggerChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      boldTriggerChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};

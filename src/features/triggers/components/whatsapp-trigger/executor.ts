import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { whatsappTriggerChannel } from "@/inngest/channels/whatsapp-trigger";

type WhatsAppTriggerData = {
  credentialId?: string;
};

export const whatsappTriggerExecutor: NodeExecutor = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(whatsappTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const triggerData = data as WhatsAppTriggerData;

    // If context already has a "whatsapp" key (set by webhook handler via initialData), pass through.
    if (context && "whatsapp" in context) {
      const result = await step.run("whatsapp-trigger-passthrough", async () => context);
      await publish(whatsappTriggerChannel().status({ nodeId, status: "success" }));
      return result;
    }

    // Manual run: return placeholder data so variable picker works in the editor.
    if (!triggerData.credentialId) {
      await publish(whatsappTriggerChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("WhatsApp trigger: No credential configured");
    }

    const placeholder = await step.run("whatsapp-trigger-manual", async () => ({
      ...context,
      whatsapp: {
        messageId: "wamid.placeholder",
        from: "1234567890",
        senderName: "Test User",
        phoneNumberId: "",
        displayPhoneNumber: "",
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: "text",
        text: "Hello (manual test run)",
      },
    }));

    await publish(whatsappTriggerChannel().status({ nodeId, status: "success" }));
    return placeholder;
  } catch (error) {
    await publish(whatsappTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

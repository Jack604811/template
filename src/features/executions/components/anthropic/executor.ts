import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);

  return safeString;
});

type AnthropicData = {
  variableName?: string;
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const anthropicExecutor: NodeExecutor<AnthropicData> = async ({
  data,
  nodeId,
  organizationId,
  context,
  step,
  publish,
}) => {
  await publish(
    anthropicChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const errorMessage = "Anthropic node: Variable name is missing";
    await publish(anthropicChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  if (!data.credentialId) {
    const errorMessage = "Anthropic node: Credential is required";
    await publish(anthropicChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  if (!data.userPrompt) {
    const errorMessage = "Anthropic node: User prompt is missing";
    await publish(anthropicChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant.";
  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const credential = await prisma.credential.findUnique({
    where: { id: data.credentialId, organizationId },
  });

  if (!credential) {
    const errorMessage = "Anthropic node: Credential not found";
    await publish(anthropicChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  const anthropic = createAnthropic({
    apiKey: decrypt(credential.value),
  });

  try {
    const { steps } = await step.ai.wrap(
      "anthropic-generate-text",
      generateText,
      {
        model: anthropic("claude-sonnet-4-5"),
        system: systemPrompt,
        prompt: userPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      },
    );

    const text =
      steps[0].content[0].type === "text"
        ? steps[0].content[0].text
        : "";

    await publish(
      anthropicChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: {
        text,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await publish(anthropicChannel().status({ nodeId, status: "error", errorMessage }));
    throw error;
  }
};

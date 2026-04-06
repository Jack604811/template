import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { openAiChannel } from "@/inngest/channels/openai";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);

  return safeString;
});

type OpenAiData = {
  variableName?: string;
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const openAiExecutor: NodeExecutor<OpenAiData> = async ({
  data,
  nodeId,
  organizationId,
  context,
  step,
  publish,
}) => {
  await publish(
    openAiChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const errorMessage = "OpenAi node: Variable name is missing";
    await publish(openAiChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  if (!data.credentialId) {
    const errorMessage = "OpenAi node: Credential is required";
    await publish(openAiChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  if (!data.userPrompt) {
    const errorMessage = "OpenAi node: User prompt is missing";
    await publish(openAiChannel().status({ nodeId, status: "error", errorMessage }));
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
    const errorMessage = "OpenAI node: Credential not found";
    await publish(openAiChannel().status({ nodeId, status: "error", errorMessage }));
    throw new NonRetriableError(errorMessage);
  }

  const openai = createOpenAI({
    apiKey: decrypt(credential.value),
  });

  try {
    const { steps } = await step.ai.wrap(
      "openai-generate-text",
      generateText,
      {
        model: openai("gpt-4"),
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
      openAiChannel().status({
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
    await publish(openAiChannel().status({ nodeId, status: "error", errorMessage }));
    throw error;
  }
};

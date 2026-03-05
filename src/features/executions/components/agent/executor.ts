import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { generateText, type ToolSet, Output } from "ai";
import { createMCPClient } from "@ai-sdk/mcp";
import { webSearch } from "@exalabs/ai-sdk";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import type { NodeExecutor } from "@/features/executions/types";
import type { AgentToolItem } from "@/features/executions/components/agent/constants";
import { agentChannel } from "@/inngest/channels/agent";
import { aiGateway } from "@/lib/ai-gateway";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  if (context == null) return new Handlebars.SafeString("");
  try {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
  } catch {
    return new Handlebars.SafeString("");
  }
});

type AgentData = {
  variableName?: string;
  instructions?: string;
  userPrompt?: string;
  model?: string;
  tools?: AgentToolItem[];
  outputFormat?: "text" | "json";
  responseSchema?: Record<string, unknown> | string | null;
};

const DEFAULT_AGENT_VARIABLE_NAME = "Agent";

export const agentExecutor: NodeExecutor<AgentData> = async ({
  data,
  nodeId,
  organizationId,
  context,
  step,
  publish,
}) => {
  await publish(
    agentChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const variableName =
    typeof data.variableName === "string" && data.variableName.trim().length > 0
      ? data.variableName.trim()
      : DEFAULT_AGENT_VARIABLE_NAME;

  if (!data.userPrompt) {
    await publish(agentChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Agent node: Prompt is required");
  }

  const compileTemplate = (template: string | undefined, ctx: Record<string, unknown>) => {
    const value = typeof template === "string" ? template.trim() : "";
    if (!value) return "";
    try {
      const compiled = Handlebars.compile(value)(ctx);
      if (compiled == null || String(compiled) === "undefined") return "";
      return typeof compiled === "string" ? compiled : String(compiled);
    } catch {
      return value;
    }
  };

  // UI "Instructions" textarea → system prompt (no default)
  const systemPrompt = compileTemplate(data.instructions, context);

  // Optional separate user prompt field
  const userMessage = compileTemplate(data.userPrompt, context);

  const model = data.model ?? "anthropic/claude-sonnet-4.5";
  const selectedTools = data.tools ?? [];
  const outputFormat = data.outputFormat ?? "text";
  const rawSchema = data.responseSchema ?? null;
  const responseSchema =
    typeof rawSchema === "string"
      ? (() => {
          try {
            return rawSchema.trim() ? (JSON.parse(rawSchema) as Record<string, unknown>) : null;
          } catch {
            return null;
          }
        })()
      : rawSchema;

  let result: { text?: string; output?: Record<string, unknown>; isJson: boolean };
  try {
    result = await step.run("agent-generate", async () => {
    const toolsRecord: Record<string, unknown> = {};
    const mcpClients: Awaited<ReturnType<typeof createMCPClient>>[] = [];

    try {
      // Native tools
      for (const t of selectedTools) {
        if (t.type === "native" && t.value === "webSearch") {
          toolsRecord.webSearch = webSearch();
          break;
        }
      }

      // MCP tools
      for (const t of selectedTools) {
        if (t.type !== "mcp") continue;
        const server = await prisma.mcpServer.findFirst({
          where: {
            id: t.serverId,
            organizationId,
          },
        });
        if (!server) continue;
        const apiKey =
          server.token != null && server.token !== ""
            ? decrypt(server.token)
            : undefined;
        const mcpClient = await createMCPClient({
          transport: {
            type: "http",
            url: server.url,
            headers:
              apiKey != null
                ? { Authorization: `Bearer ${apiKey}` }
                : undefined,
          },
        });
        mcpClients.push(mcpClient);
        const toolSet = await mcpClient.tools();
        for (const { name } of t.tools) {
          if (toolSet[name]) toolsRecord[name] = toolSet[name] as unknown;
        }
      }

      const toolList =
        Object.keys(toolsRecord).length > 0
          ? `\n**Available tools:**\n${Object.keys(toolsRecord).map((n) => `- ${n}`).join("\n")}`
          : "";
      const system = `${systemPrompt}${toolList}`.trim();

      const hasTools = Object.keys(toolsRecord).length > 0;
      const useJsonOutput =
        outputFormat === "json" &&
        responseSchema != null &&
        typeof responseSchema === "object" &&
        Object.keys(responseSchema).length > 0;

      const generateOptions = {
        model: aiGateway(model),
        system: system,
        messages: [{ role: "user" as const, content: userMessage }],
        ...(hasTools && {
          tools: toolsRecord as unknown as ToolSet,
          maxSteps: 5,
        }),
        ...(useJsonOutput && {
          experimental_output: Output.object({
            schema: convertJsonSchemaToZod(responseSchema),
          }),
        }),
      };

      const response = await generateText(generateOptions);

      if (useJsonOutput && "experimental_output" in response) {
        const out = response.experimental_output as Record<string, unknown>;
        return { output: out, isJson: true };
      }
      return { text: response.text, isJson: false };
    } finally {
      for (const client of mcpClients) {
        await client.close();
      }
    }
  });
  } catch (error) {
    await publish(
      agentChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }

  await publish(
    agentChannel().status({
      nodeId,
      status: "success",
    }),
  );

  if (result.isJson) {
    return {
      ...context,
      [variableName]: result.output,
    };
  }
  return {
    ...context,
    [variableName]: { text: result.text },
  };
};

import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { generateText, type ToolSet, Output, stepCountIs } from "ai";
import { createMCPClient } from "@ai-sdk/mcp";
import { webSearch } from "@exalabs/ai-sdk";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import type { NodeExecutor } from "@/features/executions/types";
import type { AgentToolItem } from "@/features/executions/components/agent/constants";
import { agentChannel, type AgentToolCallEvent, type AgentToolResultEvent } from "@/inngest/channels/agent";
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
  step: _step,
  publish,
}) => {
  // Single "loading" publish — uses step ID `publish:agent-execution`
  await publish(
    agentChannel().update({ nodeId, status: "loading" }),
  );

  const variableName =
    typeof data.variableName === "string" && data.variableName.trim().length > 0
      ? data.variableName.trim()
      : DEFAULT_AGENT_VARIABLE_NAME;

  if (!data.userPrompt) {
    // This would be a second publish on the same channel — wrap in NonRetriableError
    // so Inngest doesn't retry, and skip the publish to avoid duplicate step ID.
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

  const systemPrompt = compileTemplate(data.instructions, context);
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
        where: { id: t.serverId, organizationId },
      });
      if (!server) continue;
      const apiKey =
        server.token != null && server.token !== "" ? decrypt(server.token) : undefined;
      const mcpClient = await createMCPClient({
        transport: {
          type: "http",
          url: server.url,
          headers: apiKey != null ? { Authorization: `Bearer ${apiKey}` } : undefined,
        },
      });
      mcpClients.push(mcpClient);
      const toolSet = await mcpClient.tools();
      // Register ALL tools from the server — the model selects which to use
      // based on the prompt. The t.tools list is only used as a UI label/preview.
      for (const [name, tool] of Object.entries(toolSet)) {
        toolsRecord[name] = tool as unknown;
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

    const zodSchema = useJsonOutput ? convertJsonSchemaToZod(responseSchema) : undefined;

    // Inngest's publish() uses the channel name as the step ID:
    //   step.run(`publish:agent-execution`, ...)
    // Calling publish() more than once per channel per function run causes
    // "duplicate step ID" errors and infinite replay loops.
    // Solution: run generateText fully, collect all tool activity, then
    // publish ONCE with status=success + all data bundled together.
    const response = await generateText({
      model: aiGateway(model),
      system: system || undefined,
      messages: [{ role: "user" as const, content: userMessage }],
      ...(hasTools && {
        tools: toolsRecord as unknown as ToolSet,
        stopWhen: stepCountIs(2),
      }),
      ...(useJsonOutput &&
        zodSchema && {
          experimental_output: Output.object({ schema: zodSchema }),
        }),
    });

    // Collect all tool calls and results from every step
    const toolCalls: AgentToolCallEvent[] = [];
    const toolResults: AgentToolResultEvent[] = [];
    for (const step of response.steps) {
      for (const tc of step.toolCalls) {
        toolCalls.push({ toolName: tc.toolName, toolCallId: tc.toolCallId });
      }
      for (const tr of step.toolResults) {
        toolResults.push({
          toolName: tr.toolName,
          toolCallId: tr.toolCallId,
          result: tr.output as unknown,
        });
      }
    }

    // Single publish call — avoids duplicate step ID errors
    await publish(
      agentChannel().update({
        nodeId,
        status: "success",
        text: response.text,
        toolCalls,
        toolResults,
      }),
    );

    if (useJsonOutput && "experimental_output" in response) {
      const out = response.experimental_output as Record<string, unknown>;
      return { ...context, [variableName]: out };
    }

    return { ...context, [variableName]: { text: response.text } };
  } catch (error) {
    // Do NOT publish error status — that would be a third publish on the same
    // channel (after "loading"), causing another duplicate step ID error.
    // The Inngest onFailure handler in functions.ts will mark the execution failed.
    throw error;
  } finally {
    for (const client of mcpClients) {
      await client.close();
    }
  }
};

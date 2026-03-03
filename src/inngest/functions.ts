import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { anthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { geminiChannel } from "./channels/gemini";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { agentChannel } from "./channels/agent";
import { openAiChannel } from "./channels/openai";
import { slackChannel } from "./channels/slack";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { inngest } from "./client";
import { topologicalSort } from "./utils";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event, step }) => {
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      stripeTriggerChannel(),
      webhookTriggerChannel(),
      geminiChannel(),
      openAiChannel(),
      anthropicChannel(),
      discordChannel(),
      slackChannel(),
      agentChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or workflow ID is missing");
    }

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

    const { sortedNodes, connections } = await step.run(
      "prepare-workflow",
      async () => {
        const workflow = await prisma.workflow.findUniqueOrThrow({
          where: { id: workflowId },
          include: {
            nodes: true,
            connections: true,
          },
        });

        return {
          sortedNodes: topologicalSort(workflow.nodes, workflow.connections),
          connections: workflow.connections,
        };
      },
    );

    const organizationId = await step.run("find-organization-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: {
          organizationId: true,
        },
      });

      return workflow.organizationId;
    });

    // Initialize context with any initial data from the trigger
    let context = event.data.initialData || {};

    const triggerNodeId = event.data.triggerNodeId as string | undefined;

    // Find the trigger node to check if it's a manual trigger
    const triggerNode = triggerNodeId
      ? sortedNodes.find((node) => node.id === triggerNodeId)
      : undefined;

    // Check if this is a manual execution (MANUAL_TRIGGER or INITIAL)
    const isManualExecution =
      triggerNode?.type === NodeType.MANUAL_TRIGGER ||
      triggerNode?.type === NodeType.INITIAL;

    const nodesToExecute = triggerNodeId
      ? (() => {
          const queue = [triggerNodeId];
          const reachable = new Set<string>(queue);

          while (queue.length > 0) {
            const current = queue.shift();
            if (!current) break;
            for (const connection of connections) {
              if (connection.fromNodeId === current && !reachable.has(connection.toNodeId)) {
                reachable.add(connection.toNodeId);
                queue.push(connection.toNodeId);
              }
            }
          }

          return sortedNodes.filter(
            (node) =>
              reachable.has(node.id) &&
              // Allow the actual trigger node to execute (it needs to initialize context)
              (node.id === triggerNodeId ||
                // When manually executing, exclude other MANUAL_TRIGGER nodes
                !(isManualExecution && (node.type === NodeType.MANUAL_TRIGGER || node.type === NodeType.INITIAL))),
          );
        })()
      : sortedNodes;

    // Execute each node
    for (const node of nodesToExecute) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        organizationId,
        context,
        step,
        publish,
      });
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });

    return {
      workflowId,
      result: context,
    };
  },
);

import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { anthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { geminiChannel } from "./channels/gemini";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { httpRequestChannel } from "./channels/http-request";
import { ifElseChannel } from "./channels/if-else";
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
    onFailure: async ({ event }) => {
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
      ifElseChannel(),
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

    const { sortedNodes, connections } = await step.run("prepare-workflow", async () => {
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
    });

    const organizationId = await step.run("find-organization-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: {
          organizationId: true,
        },
      });

      return workflow.organizationId;
    });

    // Initialize context with initial data from the trigger (template behavior: run all nodes, context flows through)
    let context = event.data.initialData ?? {};

    // Determine starting nodes (no incoming connections)
    const nodesWithIncoming = new Set(connections.map((c) => c.toNodeId));
    const nodesToExecute = new Set<string>();

    for (const node of sortedNodes) {
      if (!nodesWithIncoming.has(node.id)) {
        nodesToExecute.add(node.id);
      }
    }

    if (nodesToExecute.size === 0 && sortedNodes.length > 0) {
      nodesToExecute.add(sortedNodes[0]!.id);
    }

    // Execute nodes respecting conditional branches
    for (const node of sortedNodes) {
      if (!nodesToExecute.has(node.id)) {
        continue;
      }

      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        organizationId,
        context,
        step,
        publish,
      });

      const outgoing = connections.filter((c) => c.fromNodeId === node.id);

      let nextNodeIds: string[];
      if (node.type === NodeType.IF_ELSE) {
        const branches =
          (context.__conditionBranches as Record<string, string> | undefined) ??
          {};
        const branchKey = branches[node.id] ?? "else";
        nextNodeIds = outgoing
          .filter((c) => c.fromOutput === branchKey)
          .map((c) => c.toNodeId);
      } else {
        nextNodeIds = outgoing.map((c) => c.toNodeId);
      }

      for (const id of nextNodeIds) {
        nodesToExecute.add(id);
      }
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

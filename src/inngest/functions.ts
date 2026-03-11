import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { agentChannel } from "./channels/agent";
import { anthropicChannel } from "./channels/anthropic";
import { boldTriggerChannel } from "./channels/bold-trigger";
import { discordChannel } from "./channels/discord";
import { geminiChannel } from "./channels/gemini";
import { gmailChannel } from "./channels/gmail";
import { gmailTriggerChannel } from "./channels/gmail-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { httpRequestChannel } from "./channels/http-request";
import { ifElseChannel } from "./channels/if-else";
import { manualTriggerChannel } from "./channels/manual-trigger";
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
      boldTriggerChannel(),
      gmailChannel(),
      gmailTriggerChannel(),
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
        const workflowSnapshot = event.data.workflowSnapshot as
          | {
              nodes: {
                id: string;
                type?: string | null;
                data?: Record<string, unknown>;
              }[];
              edges: {
                source: string;
                target: string;
                sourceHandle?: string | null;
                targetHandle?: string | null;
              }[];
            }
          | undefined;

        if (
          workflowSnapshot &&
          Array.isArray(workflowSnapshot.nodes) &&
          Array.isArray(workflowSnapshot.edges)
        ) {
          const snapshotNodes = workflowSnapshot.nodes.map((node) => ({
            id: node.id,
            type: node.type ?? "unknown",
            data: node.data ?? {},
          }));
          const snapshotConnections = workflowSnapshot.edges.map((edge) => ({
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          }));

          return {
            sortedNodes: topologicalSort(
              snapshotNodes as unknown as Parameters<typeof topologicalSort>[0],
              snapshotConnections as unknown as Parameters<
                typeof topologicalSort
              >[1],
            ),
            connections: snapshotConnections,
          };
        }

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

    // Initialize context with initial data from the trigger (template behavior: run all nodes, context flows through)
    let context = event.data.initialData ?? {};

    const triggerNodeId =
      typeof event.data.triggerNodeId === "string" &&
      event.data.triggerNodeId.trim().length > 0
        ? event.data.triggerNodeId
        : undefined;

    // Determine starting nodes:
    // - If triggerNodeId is provided, run only the reachable path from that node.
    // - Otherwise, run all root nodes (nodes without incoming connections).
    const nodesWithIncoming = new Set(connections.map((c) => c.toNodeId));
    const nodesToExecute = new Set<string>();

    if (triggerNodeId) {
      nodesToExecute.add(triggerNodeId);
    } else {
      for (const node of sortedNodes) {
        if (!nodesWithIncoming.has(node.id)) {
          nodesToExecute.add(node.id);
        }
      }
    }

    const firstNode = sortedNodes[0];
    if (nodesToExecute.size === 0 && firstNode) {
      nodesToExecute.add(firstNode.id);
    }

    // Execute nodes respecting conditional branches
    let executionError: unknown;
    for (const node of sortedNodes) {
      if (!nodesToExecute.has(node.id)) {
        continue;
      }

      const executor = getExecutor(node.type as NodeType);
      try {
        context = await executor({
          data: node.data as Record<string, unknown>,
          nodeId: node.id,
          organizationId,
          context,
          step,
          publish,
        });
      } catch (err) {
        executionError = err;
        break;
      }

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

    if (executionError) {
      // Save whatever partial context we accumulated so the variable picker
      // can show real values even when a run fails mid-way.
      if (Object.keys(context).length > 0) {
        await step.run("save-partial-context", async () => {
          return prisma.execution.update({
            where: { inngestEventId, workflowId },
            data: { output: context },
          });
        });
      }
      throw executionError;
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

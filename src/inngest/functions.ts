import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { saveSession, type ChatMessage } from "@/lib/chat-session";
import prisma from "@/lib/db";
import { agentChannel } from "./channels/agent";
import { anthropicChannel } from "./channels/anthropic";
import { boldTriggerChannel } from "./channels/bold-trigger";
import { discordChannel } from "./channels/discord";
import { executionContextChannel } from "./channels/execution-context";
import { geminiChannel } from "./channels/gemini";
import { gmailChannel } from "./channels/gmail";
import { whatsappChannel } from "./channels/whatsapp";
import { whatsappTriggerChannel } from "./channels/whatsapp-trigger";
import { gmailTriggerChannel } from "./channels/gmail-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { httpRequestChannel } from "./channels/http-request";
import { ifElseChannel } from "./channels/if-else";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { openAiChannel } from "./channels/openai";
import { slackChannel } from "./channels/slack";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import type { StepTools } from "@/features/executions/types";
import { inngest } from "./client";
import { topologicalSort } from "./utils";

function mergeParallelContexts(
  base: Record<string, unknown>,
  results: Record<string, unknown>[],
): Record<string, unknown> {
  const merged = { ...base };
  for (const result of results) {
    for (const [key, val] of Object.entries(result)) {
      if (
        typeof val === "object" && val !== null && !Array.isArray(val) &&
        typeof merged[key] === "object" && merged[key] !== null && !Array.isArray(merged[key])
      ) {
        merged[key] = { ...(merged[key] as Record<string, unknown>), ...(val as Record<string, unknown>) };
      } else {
        merged[key] = val;
      }
    }
  }
  return merged;
}

function prefixNodeStep(step: StepTools, nodeId: string): StepTools {
  return new Proxy(step, {
    get(target, prop, receiver) {
      if (prop === "run") {
        return (id: string, fn: () => Promise<unknown>) =>
          target.run(`${nodeId}/${id}`, fn);
      }
      if (prop === "ai") {
        const ai = Reflect.get(target, prop, receiver) as {
          wrap: (id: string, fn: unknown, ...args: unknown[]) => unknown;
        };
        return new Proxy(ai, {
          get(aiTarget, aiProp, aiReceiver) {
            if (aiProp === "wrap") {
              return (id: string, fn: unknown, ...args: unknown[]) =>
                aiTarget.wrap(`${nodeId}/${id}`, fn, ...args);
            }
            return Reflect.get(aiTarget, aiProp, aiReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as StepTools;
}

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
      whatsappChannel(),
      whatsappTriggerChannel(),
      executionContextChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or workflow ID is missing");
    }

    // Single setup step: create execution + load workflow + get org ID in parallel.
    // Previously 3 sequential steps (3 Inngest round-trips); now 1 (saves ~600–1000ms).
    const { sortedNodes, connections, organizationId } = await step.run(
      "setup",
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
          const [workflow] = await Promise.all([
            prisma.workflow.findUniqueOrThrow({
              where: { id: workflowId },
              select: { organizationId: true },
            }),
            prisma.execution.upsert({
              where: { inngestEventId },
              create: { workflowId, inngestEventId },
              update: {},
            }),
          ]);

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
              snapshotConnections as unknown as Parameters<typeof topologicalSort>[1],
            ),
            connections: snapshotConnections,
            organizationId: workflow.organizationId,
          };
        }

        const [workflow] = await Promise.all([
          prisma.workflow.findUniqueOrThrow({
            where: { id: workflowId },
            include: { nodes: true, connections: true },
          }),
          prisma.execution.upsert({
            where: { inngestEventId },
            create: { workflowId, inngestEventId },
            update: {},
          }),
        ]);

        return {
          sortedNodes: topologicalSort(workflow.nodes, workflow.connections),
          connections: workflow.connections,
          organizationId: workflow.organizationId,
        };
      },
    );

    let context = event.data.initialData ?? {};

    const triggerNodeId =
      typeof event.data.triggerNodeId === "string" &&
      event.data.triggerNodeId.trim().length > 0
        ? event.data.triggerNodeId
        : undefined;

    // Build O(1) lookup indexes
    const outgoingMap = new Map<string, typeof connections>();
    const predecessorMap = new Map<string, Set<string>>();
    const nodeMap = new Map(sortedNodes.map((n) => [n.id, n]));

    for (const node of sortedNodes) {
      outgoingMap.set(node.id, []);
      predecessorMap.set(node.id, new Set());
    }
    for (const conn of connections) {
      outgoingMap.get(conn.fromNodeId)?.push(conn);
      predecessorMap.get(conn.toNodeId)?.add(conn.fromNodeId);
    }

    // Determine starting nodes
    const TRIGGER_TYPES = new Set<string>([
      NodeType.INITIAL,
      NodeType.MANUAL_TRIGGER,
      NodeType.GOOGLE_FORM_TRIGGER,
      NodeType.STRIPE_TRIGGER,
      NodeType.WEBHOOK_TRIGGER,
      NodeType.BOLD_TRIGGER,
      NodeType.GMAIL_TRIGGER,
      NodeType.WHATSAPP_TRIGGER,
    ]);
    const nodesWithIncoming = new Set(connections.map((c) => c.toNodeId));
    const startNodeIds = new Set<string>();

    if (triggerNodeId) {
      startNodeIds.add(triggerNodeId);
    } else {
      // Only start from trigger-type root nodes so that disconnected non-trigger
      // nodes (whose incoming edges were removed) are never treated as entry points.
      for (const node of sortedNodes) {
        if (!nodesWithIncoming.has(node.id) && TRIGGER_TYPES.has(node.type)) {
          startNodeIds.add(node.id);
        }
      }
    }
    const firstNode = sortedNodes[0];
    if (startNodeIds.size === 0 && firstNode) startNodeIds.add(firstNode.id);

    // BFS reachability — nodes disconnected from the start are never executed
    const reachableNodes = new Set<string>(startNodeIds);
    const bfsQueue = [...startNodeIds];
    while (bfsQueue.length > 0) {
      const id = bfsQueue.shift();
      if (!id) break;
      for (const conn of (outgoingMap.get(id) ?? [])) {
        if (!reachableNodes.has(conn.toNodeId)) {
          reachableNodes.add(conn.toNodeId);
          bfsQueue.push(conn.toNodeId);
        }
      }
    }

    // Parallel batch execution
    const pendingNodes = new Set<string>(startNodeIds);
    const completedNodes = new Set<string>();
    let executionError: unknown;

    while (pendingNodes.size > 0 && !executionError) {
      // Nodes ready when all reachable predecessors are already completed
      const readyBatch = [...pendingNodes].filter((nodeId) => {
        const preds = predecessorMap.get(nodeId) ?? new Set<string>();
        return [...preds]
          .filter((p) => reachableNodes.has(p))
          .every((p) => completedNodes.has(p));
      });

      if (readyBatch.length === 0) break;

      for (const id of readyBatch) pendingNodes.delete(id);

      const batchSnapshot = context;

      const batchResults = await Promise.all(
        readyBatch.map(async (nodeId) => {
          const node = nodeMap.get(nodeId);
          if (!node) return { nodeId, node: null, newContext: batchSnapshot, error: new Error(`Node ${nodeId} not found`) };
          const executor = getExecutor(node.type as NodeType);
          try {
            const newContext = await executor({
              data: node.data as Record<string, unknown>,
              nodeId: node.id,
              organizationId,
              context: batchSnapshot,
              step: prefixNodeStep(step, nodeId),
              publish,
            });
            return { nodeId, node, newContext, error: null as unknown };
          } catch (err) {
            return { nodeId, node, newContext: batchSnapshot, error: err };
          }
        }),
      );

      const successResults = batchResults.filter((r) => r.error === null);
      const failResult = batchResults.find((r) => r.error !== null);

      if (successResults.length > 0) {
        context = mergeParallelContexts(context, successResults.map((r) => r.newContext));
        await publish(executionContextChannel()["context-update"]({ workflowId, context }));
      }

      if (failResult) {
        executionError = failResult.error;
        break;
      }

      // Unlock downstream nodes
      for (const { nodeId, node } of successResults) {
        if (!node) continue;
        completedNodes.add(nodeId);
        const outgoing = outgoingMap.get(nodeId) ?? [];
        let nextIds: string[];
        if (node.type === NodeType.IF_ELSE) {
          const branches =
            (context.__conditionBranches as Record<string, string> | undefined) ?? {};
          const branchKey = branches[nodeId] ?? "else";
          nextIds = outgoing
            .filter((c) => c.fromOutput === branchKey)
            .map((c) => c.toNodeId);
        } else {
          nextIds = outgoing.map((c) => c.toNodeId);
        }
        for (const id of nextIds) {
          if (reachableNodes.has(id) && !completedNodes.has(id)) {
            pendingNodes.add(id);
          }
        }
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

    // Persist chat session if this was a WhatsApp chat flow
    const chatFrom = typeof context.__chatFrom === "string" ? context.__chatFrom : null;
    if (chatFrom) {
      await step.run("save-chat-session", async () => {
        const userText =
          typeof (context.whatsapp as { text?: string } | undefined)?.text === "string"
            ? (context.whatsapp as { text: string }).text
            : "";
        let agentText = "";
        for (const [key, val] of Object.entries(context)) {
          if (!key.startsWith("__") && key !== "whatsapp" && typeof (val as { text?: string })?.text === "string") {
            agentText = (val as { text: string }).text;
            break;
          }
        }
        const history = Array.isArray(context.__chatHistory)
          ? (context.__chatHistory as ChatMessage[])
          : [];
        const updated: ChatMessage[] = [...history];
        if (userText) updated.push({ role: "user", content: userText });
        if (agentText) updated.push({ role: "assistant", content: agentText });
        if (updated.length > history.length) {
          await saveSession(chatFrom, updated);
        }
      });
    }

    return {
      workflowId,
      result: context,
    };
  },
);

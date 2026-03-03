"use client";

import { useQuery } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import type {
  WebhookStoredSchema,
  WebhookTriggerNodeData,
} from "@/features/triggers/components/webhook-trigger/actions";
import { useTRPC } from "@/trpc/client";
import type { NodeVariables, VariableEntry } from "../types/variables";

type WorkflowPageParams = {
  workflowId: string;
};

const formatPreview = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    const stringified = JSON.stringify(value, null, 2);
    if (!stringified) {
      return "Object";
    }
    return stringified.length > 120
      ? `${stringified.slice(0, 117)}…`
      : stringified;
  } catch {
    return "Object";
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

function buildWebhookPayloadFromSchema(
  schema: WebhookStoredSchema,
): Record<string, unknown> {
  return {
    body: schema.body,
    headers: schema.headers,
    query: schema.query,
    method: "POST",
    path: "",
    raw: "",
  };
}

const collectPredecessorNodeIds = (
  edges: Edge[],
  currentNodeId: string,
): Set<string> => {
  const visited = new Set<string>();
  const queue: string[] = [currentNodeId];

  // Use BFS to traverse backwards through all edges
  // This collects ALL predecessors in the execution chain, not just direct ones
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      continue;
    }

    for (const edge of edges) {
      if (edge.target !== nodeId) {
        continue;
      }

      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  // Exclude the current node from the result
  visited.delete(currentNodeId);

  return visited;
};

const buildVariableTree = (
  value: unknown,
  path: string[],
  options: { isRoot?: boolean } = {},
): VariableEntry => {
  const preview = formatPreview(value);
  const template = options.isRoot
    ? `{{json ${path[0] ?? ""}}}`
    : `{{${path.join(".")}}}`;

  if (Array.isArray(value)) {
    const children = value.map((item, index) => {
      const childPath = [...path, String(index)];
      return buildVariableTree(item, childPath);
    });

    return {
      key: path[path.length - 1] ?? "",
      path,
      value,
      preview,
      template,
      children,
    };
  }

  if (isRecord(value)) {
    const children = Object.entries(value).map(([key, childValue]) => {
      const childPath = [...path, key];
      return buildVariableTree(childValue, childPath);
    });

    return {
      key: path[path.length - 1] ?? "",
      path,
      value,
      preview,
      template,
      children,
    };
  }

  return {
    key: path[path.length - 1] ?? "",
    path,
    value,
    preview,
    template,
  };
};

const nodeLabelFromType = (node: Node): string => {
  if (typeof node.type === "string") {
    const humanReadable = node.type
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return humanReadable;
  }

  return "Node";
};

/**
 * Sort nodes by their position in the workflow canvas
 * Nodes with smaller x (left side) appear first, then by y (top to bottom)
 * This matches the visual workflow order (execution flows left to right)
 */
const sortNodesByPosition = (nodes: Node[]): Node[] => {
  return [...nodes].sort((a, b) => {
    const aX = typeof a.position?.x === "number" ? a.position.x : 0;
    const aY = typeof a.position?.y === "number" ? a.position.y : 0;
    const bX = typeof b.position?.x === "number" ? b.position.x : 0;
    const bY = typeof b.position?.y === "number" ? b.position.y : 0;

    // Sort by x-position first (left to right)
    if (aX !== bX) {
      return aX - bX;
    }

    // If x is equal, sort by y-position (top to bottom)
    return aY - bY;
  });
};

const deriveNodeVariables = (
  nodes: Node[],
  context: Record<string, unknown> | null | undefined,
  predecessors: Set<string>,
): NodeVariables[] => {
  const result: NodeVariables[] = [];

  const relevantNodes = nodes.filter((node) => predecessors.has(node.id));

  // Sort nodes by position (execution order: left to right, top to bottom)
  const sortedNodes = sortNodesByPosition(relevantNodes);

  for (const node of sortedNodes) {
    const variableName = String(
      (node.data?.variableName as string | undefined) ?? "",
    ).trim();

    const contextValue =
      variableName && context ? context[variableName] : undefined;

    const rootEntry =
      variableName && contextValue !== undefined
        ? buildVariableTree(contextValue, [variableName], { isRoot: true })
        : undefined;

    const variables =
      rootEntry?.children && rootEntry.children.length > 0
        ? rootEntry.children
        : [];

    result.push({
      nodeId: node.id,
      nodeLabel: variableName || nodeLabelFromType(node),
      variableName,
      variables,
      rootEntry,
    });
  }

  return result;
};

export interface UseWorkflowVariablesResult {
  isLoading: boolean;
  isFetching: boolean;
  variables: NodeVariables[];
  refetch: () => Promise<void>;
}

export const useWorkflowVariables = (
  currentNodeId: string,
): UseWorkflowVariablesResult => {
  const { getNodes, getEdges } = useReactFlow();
  const params = useParams<WorkflowPageParams>();
  const trpc = useTRPC();

  const workflowId = params.workflowId;

  const query = useQuery({
    ...trpc.executions.getLastExecutionContext.queryOptions({
      workflowId,
    }),
    enabled: Boolean(workflowId),
  });

  useEffect(() => {
    if (query.error) {
      toast.error("Unable to load workflow variables");
    }
  }, [query.error]);

  const edges = getEdges();
  const nodes = getNodes();

  const predecessors = useMemo(
    () => collectPredecessorNodeIds(edges, currentNodeId),
    [edges, currentNodeId],
  );

  const variables = useMemo(() => {
    const context = query.data?.context as Record<string, unknown> | undefined;

    const derived = deriveNodeVariables(nodes, context, predecessors);
    const existingNames = new Set(
      derived
        .map((nodeVariables) => nodeVariables.variableName)
        .filter((value): value is string => Boolean(value)),
    );

    const webhookTriggerNode = nodes.find(
      (n) => n.type === "WEBHOOK_TRIGGER" && predecessors.has(n.id),
    );
    const webhookEntry = webhookTriggerNode
      ? derived.find((d) => d.nodeId === webhookTriggerNode.id)
      : undefined;

    if (webhookEntry) {
      const webhookValue =
        context && "webhook" in context
          ? (context.webhook as Record<string, unknown>)
          : null;
      const schema = (webhookTriggerNode?.data as WebhookTriggerNodeData)
        ?.webhookSchema;

      const source =
        webhookValue ?? (schema ? buildWebhookPayloadFromSchema(schema) : null);
      if (source) {
        const rootEntry = buildVariableTree(source, ["webhook"], {
          isRoot: true,
        });
        webhookEntry.variables = rootEntry.children ?? [];
        webhookEntry.rootEntry = rootEntry;
        webhookEntry.variableName = "webhook";
        webhookEntry.nodeLabel = "Webhook";
      }
    }

    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (key === "webhook") continue;
        if (existingNames.has(key)) {
          continue;
        }

        const rootEntry = buildVariableTree(value, [key], { isRoot: true });

        derived.push({
          nodeId: `context:${key}`,
          nodeLabel: key,
          variableName: key,
          variables: rootEntry.children ?? [],
          rootEntry,
        });
      }
    }

    return derived;
  }, [nodes, predecessors, query.data?.context]);

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    variables,
    refetch: async () => {
      await query.refetch();
    },
  };
};

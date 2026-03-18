import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import type { Node, Edge } from "@xyflow/react";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { NodeType } from "@/generated/prisma";
import { sendWorkflowExecution } from "@/inngest/utils";

const VALID_NODE_TYPES = new Set<string>(Object.values(NodeType));

function toNodeType(value: string | null | undefined): NodeType {
  if (value == null || value === "") {
    throw new Error("Node type is required");
  }
  if (!VALID_NODE_TYPES.has(value)) {
    throw new Error(`Invalid node type: "${value}". Expected one of: ${[...VALID_NODE_TYPES].join(", ")}`);
  }
  return value as NodeType;
}
import { copyWorkflowStructure } from "../utils/workflow-copy";

export const workflowsRouter = createTRPCRouter({
  execute: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        triggerNodeId: z.string().optional(),
        initialData: z.record(z.string(), z.unknown()).optional(),
        nodes: z
          .array(
            z.object({
              id: z.string(),
              type: z.string().nullish(),
              data: z.record(z.string(), z.any()).optional(),
            }),
          )
          .optional(),
        edges: z
          .array(
            z.object({
              source: z.string(),
              target: z.string(),
              sourceHandle: z.string().nullish(),
              targetHandle: z.string().nullish(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workflow = await prisma.workflow.findFirstOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      await sendWorkflowExecution({
        workflowId: input.id,
        initialData: input.initialData,
        triggerNodeId: input.triggerNodeId,
        ...(input.nodes && input.edges
          ? {
              workflowSnapshot: {
                nodes: input.nodes,
                edges: input.edges,
              },
            }
          : {}),
      });

      return workflow;
    }),
  create: organizationProcedure.mutation(({ ctx }) => {
    return prisma.workflow.create({
      data: {
        name: generateSlug(3),
        organizationId: ctx.organizationId,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
    });
  }),
  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.workflow.delete({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      })
    }),
  duplicate: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the original workflow with nodes and connections
      const originalWorkflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          nodes: true,
          connections: true,
        },
      });

      // Create new workflow with copied name
      return await prisma.workflow.create({
        data: copyWorkflowStructure(originalWorkflow, {
          name: `${originalWorkflow.name} (Copy)`,
          organizationId: ctx.organizationId,
        }),
      });
    }),
  update: organizationProcedure
    .input(
      z.object({ 
        id: z.string(), 
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string().nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.any()).optional(),
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;

      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id, organizationId: ctx.organizationId },
      });

      // Transaction to ensure consistency
      return await prisma.$transaction(async (tx) => {
        // Delete existing nodes and connections (cascade deletes connections)
        await tx.node.deleteMany({
          where: { workflowId: id },
        });

        // Create nodes (validate type against Prisma NodeType enum)
        await tx.node.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name: node.type || "unknown",
            type: toNodeType(node.type ?? undefined),
            position: node.position,
            data: node.data || {},
          })),
        });

        // Create connections
        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });

        // Update workflow's updateAt timestamp
        await tx.workflow.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        return workflow;
      });
    }),
  updateName: organizationProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, organizationId: ctx.organizationId },
      });

      // If this workflow is a template, update the template name as well
      if (workflow.isTemplate) {
        return await prisma.workflow.update({
          where: { id: input.id, organizationId: ctx.organizationId },
          data: { 
            name: input.name,
            templateName: input.name,
          },
        });
      }

      return await prisma.workflow.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { name: input.name },
      });
    }),
  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: { nodes: true, connections: true },
      });

      // Transform server nodes to react-flow compatible nodes
      const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number, y: number },
        data: (node.data as Record<string, unknown>) || {},
      }));

      // Transform server connections to react-flow compatible edges
      const edges: Edge[] = workflow.connections.map((connection) => ({
        id: connection.id,
        source: connection.fromNodeId,
        target: connection.toNodeId,
        sourceHandle: connection.fromOutput,
        targetHandle: connection.toInput,
      }));

      return {
        id: workflow.id,
        name: workflow.name,
        isTemplate: workflow.isTemplate,
        nodes,
        edges,
      };
    }),
  getMany: organizationProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { 
            organizationId: ctx.organizationId,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.workflow.count({
          where: {
            organizationId: ctx.organizationId,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});

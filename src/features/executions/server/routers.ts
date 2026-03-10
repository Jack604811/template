import z from "zod";
import { PAGINATION } from "@/config/constants";
import { ExecutionStatus } from "@/generated/prisma";
import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";

function hasContext(output: unknown): output is Record<string, unknown> {
  return (
    typeof output === "object" &&
    output !== null &&
    !Array.isArray(output) &&
    Object.keys(output as object).length > 0
  );
}

export const executionsRouter = createTRPCRouter({
  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return prisma.execution.findUniqueOrThrow({
        where: {
          id: input.id,
          workflow: {
            organizationId: ctx.organizationId,
          },
        },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
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
        workflowId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, workflowId } = input;

      const whereClause = {
        workflow: {
          organizationId: ctx.organizationId,
          ...(workflowId ? { id: workflowId } : {}),
        },
      };

      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: {
            startedAt: "desc",
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.execution.count({
          where: whereClause,
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
  getLastExecutionContext: organizationProcedure
    .input(
      z.object({
        workflowId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1) Last successful execution
      const successful = await prisma.execution.findFirst({
        where: {
          workflowId: input.workflowId,
          workflow: { organizationId: ctx.organizationId },
          status: ExecutionStatus.SUCCESS,
        },
        orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
        select: {
          id: true,
          workflowId: true,
          completedAt: true,
          output: true,
        },
      });

      if (successful?.output && hasContext(successful.output)) {
        return {
          executionId: successful.id,
          workflowId: successful.workflowId,
          completedAt: successful.completedAt,
          context: successful.output as Record<string, unknown>,
        };
      }

      // 2) Fallback: latest execution by startedAt with any non-empty output (Prisma Json filters are unreliable)
      const latest = await prisma.execution.findFirst({
        where: {
          workflowId: input.workflowId,
          workflow: { organizationId: ctx.organizationId },
        },
        orderBy: [{ startedAt: "desc" }],
        select: {
          id: true,
          workflowId: true,
          completedAt: true,
          output: true,
        },
      });

      if (!latest?.output || !hasContext(latest.output)) {
        return null;
      }

      return {
        executionId: latest.id,
        workflowId: latest.workflowId,
        completedAt: latest.completedAt,
        context: latest.output as Record<string, unknown>,
      };
    }),
});

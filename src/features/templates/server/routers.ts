import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { copyWorkflowStructure } from "@/features/workflows/utils/workflow-copy";

export const templatesRouter = createTRPCRouter({
  getMany: protectedProcedure.query(async ({ ctx }) => {
    // Get system templates (public templates)
    const systemTemplates = await prisma.workflow.findMany({
      where: {
        isTemplate: true,
        isPublicTemplate: true,
      },
      include: {
        category: true,
        nodes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get user's private templates
    const userTemplates = await prisma.workflow.findMany({
      where: {
        isTemplate: true,
        isPublicTemplate: false,
        userId: ctx.auth.user.id,
      },
      include: {
        category: true,
        nodes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group system templates by category
    const systemByCategory: Record<string, typeof systemTemplates> = {};
    systemTemplates.forEach((template) => {
      const categoryName = template.category?.name || "Other";
      if (!systemByCategory[categoryName]) {
        systemByCategory[categoryName] = [];
      }
      systemByCategory[categoryName].push(template);
    });

    return {
      system: systemByCategory,
      user: userTemplates,
    };
  }),
  getCategories: protectedProcedure.query(async () => {
    return prisma.templateCategory.findMany({
      orderBy: {
        order: "asc",
      },
    });
  }),
  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, { message: "Category name is required" }),
        description: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Check if category with same name already exists
      const existing = await prisma.templateCategory.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new Error("A category with this name already exists");
      }

      // Get the highest order value
      const lastCategory = await prisma.templateCategory.findFirst({
        orderBy: {
          order: "desc",
        },
      });

      const order = lastCategory ? lastCategory.order + 1 : 0;

      return prisma.templateCategory.create({
        data: {
          name: input.name,
          description: input.description,
          icon: input.icon,
          order,
        },
      });
    }),
  createFrom: organizationProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the template with nodes and connections
      const template = await prisma.workflow.findFirstOrThrow({
        where: {
          id: input.templateId,
          isTemplate: true,
          OR: [
            { isPublicTemplate: true },
            { userId: ctx.auth.user.id, isPublicTemplate: false },
          ],
        },
        include: {
          nodes: true,
          connections: true,
        },
      });

      // Create new workflow from template (not a template itself)
      return await prisma.workflow.create({
        data: copyWorkflowStructure(template, {
          name: template.name,
          templateName: template.name,
          organizationId: ctx.organizationId,
          isTemplate: false,
          isPublicTemplate: false,
        }),
      });
    }),
  save: organizationProcedure
    .input(
      z.object({
        workflowId: z.string(),
        name: z.string().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update the existing workflow to be a template
      // Convert empty strings to undefined to skip updating those fields
      const templateName = input.name && input.name.trim().length > 0 ? input.name.trim() : undefined;
      const categoryId = input.categoryId && input.categoryId.trim().length > 0 ? input.categoryId.trim() : undefined;

      return await prisma.workflow.update({
        where: {
          id: input.workflowId,
          organizationId: ctx.organizationId,
        },
        data: {
          isTemplate: true,
          isPublicTemplate: false,
          userId: ctx.auth.user.id,
          templateName, // Use provided name or undefined to keep current name
          categoryId, // Use provided category or undefined to keep current category
        },
        include: {
          category: true,
        },
      });
    }),
  getUser: protectedProcedure.query(async ({ ctx }) => {
    return prisma.workflow.findMany({
      where: {
        isTemplate: true,
        isPublicTemplate: false,
        userId: ctx.auth.user.id,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),
  remove: organizationProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          organizationId: ctx.organizationId,
        },
      });

      if (!workflow.isTemplate) {
        throw new Error("Workflow is not a template");
      }

      // Only allow removing user's own templates
      if (workflow.isPublicTemplate || workflow.userId !== ctx.auth.user.id) {
        throw new Error("Cannot remove this template");
      }

      return prisma.workflow.update({
        where: {
          id: input.workflowId,
        },
        data: {
          isTemplate: false,
          isPublicTemplate: false,
          templateName: null,
          categoryId: null,
          userId: null,
        },
      });
    }),
});


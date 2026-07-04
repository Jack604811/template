import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";

const QuickReplyStepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image"), url: z.string(), caption: z.string().optional() }),
  z.object({
    type: z.literal("carousel"),
    text: z.string().optional(),
    cards: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        buttonText: z.string().optional(),
        buttonUrl: z.string().optional(),
        quickReplies: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
      }),
    ),
  }),
  z.object({ type: z.literal("document"), url: z.string(), filename: z.string(), caption: z.string().optional() }),
  z.object({
    type: z.literal("cta_url"),
    text: z.string(),
    buttonUrl: z.string(),
    displayText: z.string(),
    headerImageUrl: z.string().optional(),
    footer: z.string().optional(),
  }),
  z.object({
    type: z.literal("location"),
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
  }),
]);

export const quickRepliesRouter = createTRPCRouter({
  getMany: organizationProcedure.query(async ({ ctx }) => {
    const rows = await prisma.quickReply.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortcut: r.shortcut ?? undefined,
      steps: r.steps as z.infer<typeof QuickReplyStepSchema>[],
    }));
  }),

  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1).max(60),
        shortcut: z.string().max(20).optional(),
        steps: z.array(QuickReplyStepSchema).min(1).max(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.quickReply.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          shortcut: input.shortcut ?? null,
          steps: input.steps,
        },
      });
      return {
        id: row.id,
        name: row.name,
        shortcut: row.shortcut ?? undefined,
        steps: input.steps,
      };
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(60),
        shortcut: z.string().max(20).optional(),
        steps: z.array(QuickReplyStepSchema).min(1).max(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.quickReply.updateMany({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { name: input.name, shortcut: input.shortcut ?? null, steps: input.steps },
      });
    }),

  delete: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.quickReply.deleteMany({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),

  reorder: organizationProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.quickReply.updateMany({
            where: { id, organizationId: ctx.organizationId },
            data: { sortOrder: index },
          }),
        ),
      );
    }),
});

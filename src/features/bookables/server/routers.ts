import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import {
  BookableStatus,
  DurationUnit,
  TaxType,
} from "@/generated/prisma";

export const bookableCollectionsRouter = createTRPCRouter({
  getMany: organizationProcedure.query(async ({ ctx }) => {
    const collections = await prisma.bookableCollection.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: {
        order: "asc",
      },
      include: {
        _count: {
          select: {
            bookables: true,
          },
        },
      },
    });

    return collections.map((collection) => ({
      ...collection,
      bookableCount: collection._count.bookables,
    }));
  }),

  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.bookableCollection.findUniqueOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          _count: {
            select: {
              bookables: true,
            },
          },
        },
      });
    }),

  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        icon: z.string().optional(),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.bookableCollection.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
        },
      });
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        icon: z.string().optional().nullable(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return prisma.bookableCollection.update({
        where: {
          id,
          organizationId: ctx.organizationId,
        },
        data,
      });
    }),

  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.bookableCollection.delete({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });
    }),

  duplicate: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await prisma.bookableCollection.findUniqueOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      // Create new collection with same name + " Copy"
      const duplicated = await prisma.bookableCollection.create({
        data: {
          organizationId: ctx.organizationId,
          name: `${original.name} Copy`,
          icon: original.icon,
          order: original.order,
        },
      });


      return duplicated;
    }),
});


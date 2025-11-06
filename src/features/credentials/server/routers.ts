import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import { encrypt } from "@/lib/encryption";

export const credentialsRouter = createTRPCRouter({
  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required")
      })
    )
    .mutation(({ ctx, input }) => {
      const { name, value, type } = input;

      return prisma.credential.create({
        data: {
          name,
          organizationId: ctx.organizationId,
          type,
          value: encrypt(value),
        },
      });
  }),
  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.credential.delete({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      })
    }),
  update: organizationProcedure
    .input(
      z.object({ 
        id: z.string(), 
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required"),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, name, type, value } = input;

      return prisma.credential.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          name,
          type,
          value: encrypt(value),
        }
      });
    }),
  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return prisma.credential.findUniqueOrThrow({
        where: { id: input.id, organizationId: ctx.organizationId },
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
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.credential.findMany({
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
        prisma.credential.count({
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
  getByType: organizationProcedure
    .input(
      z.object({
        type: z.enum(CredentialType),
      })
    )
    .query(({ input, ctx }) => {
      const { type } = input;

      return prisma.credential.findMany({
        where: { type, organizationId: ctx.organizationId },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }),
});

import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { DurationUnit, BookableStatus } from "@/generated/prisma";

export const bookableRouter = createTRPCRouter({
  findOrCreate: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.string().default("service"),
        price: z.number().default(0),
        isMultiDay: z.boolean().default(false),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Try to find existing bookable by name and organization
      let bookable = await prisma.bookable.findFirst({
        where: {
          organizationId: ctx.organizationId,
          name: input.name,
        },
      });

      // If not found, create a new bookable
      if (!bookable) {
        bookable = await prisma.bookable.create({
          data: {
            organizationId: ctx.organizationId,
            // Required fields with defaults
            title: input.name,
            durationValue: 1,
            durationUnit: DurationUnit.HOURS,
            status: BookableStatus.DRAFT,
            // Legacy fields
            name: input.name,
            type: input.type,
            price: input.price,
            isMultiDay: input.isMultiDay,
            icon: input.icon,
          },
        });
      }

      return bookable;
    }),
});


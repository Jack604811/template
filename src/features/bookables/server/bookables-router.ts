import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import {
  BookableStatus,
  DurationUnit,
  MaxAdvanceUnit,
  MinAdvanceUnit,
  TaxType,
} from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";

export const bookablesRouter = createTRPCRouter({
  getMany: organizationProcedure
    .input(
      z.object({
        collectionId: z.string().optional(),
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify collection belongs to organization if collectionId is provided
      if (input.collectionId) {
        await prisma.bookableCollection.findUniqueOrThrow({
          where: {
            id: input.collectionId,
            organizationId: ctx.organizationId,
          },
        });
      }

      const skip = (input.page - 1) * input.pageSize;
      const where = {
        organizationId: ctx.organizationId,
        ...(input.collectionId ? { collectionId: input.collectionId } : {}),
        ...(input.search
          ? {
              OR: [
                { title: { contains: input.search, mode: "insensitive" as const } },
                { name: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [items, totalCount] = await Promise.all([
        prisma.bookable.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.bookable.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / input.pageSize);

      return {
        items,
        page: input.page,
        pageSize: input.pageSize,
        totalCount,
        totalPages,
        hasNextPage: input.page < totalPages,
        hasPreviousPage: input.page > 1,
      };
    }),

  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.bookable.findUniqueOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: { collection: true },
      });
    }),

  create: organizationProcedure
    .input(
      z.object({
        collectionId: z.string().optional().nullable(),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional().nullable(),
        images: z.array(z.any()).default([]),
        basePrice: z.number().default(0),
        priceTiers: z
          .array(
            z.object({
              name: z.string(),
              price: z.number(),
            }),
          )
          .optional(),
        units: z.number().min(1, "Units must be at least 1"),
        allowMultipleGuests: z.boolean().optional(),
        minGuests: z.number().min(0).optional().nullable(),
        maxGuestsPerBooking: z.number().min(1).optional().nullable(),
        status: z.enum(BookableStatus).default(BookableStatus.DRAFT),
        durationValue: z.number().min(1),
        durationUnit: z.enum(DurationUnit),
        minAdvanceValue: z.number().min(0).optional().nullable(),
        minAdvanceUnit: z.nativeEnum(MinAdvanceUnit).optional().nullable(),
        maxAdvanceValue: z.number().min(1).optional().nullable(),
        maxAdvanceUnit: z.nativeEnum(MaxAdvanceUnit).optional().nullable(),
        blockedDates: z.array(z.string()).default([]),
        taxType: z.enum(TaxType).optional().nullable(),
        taxValue: z.number().optional().nullable(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        bufferMinutes: z.number().min(0).optional().nullable(),
        allowMultipleDays: z.boolean().optional(),
        availability: z
          .array(
            z.object({
              day: z.string(),
              ranges: z.array(
                z.object({
                  startTime: z.string(),
                  endTime: z.string(),
                })
              ),
            })
          )
          .optional()
          .nullable(),
        requirePayment: z.boolean().optional(),
        requireDeposit: z.boolean().optional(),
        depositPercent: z.number().min(0).max(100).optional().nullable(),
        successRedirectUrl: z.string().optional().nullable(),
        cancelRedirectUrl: z.string().optional().nullable(),
        hideBookingType: z.boolean().optional(),
        internalNotes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify collection belongs to organization if provided
      if (input.collectionId) {
        await prisma.bookableCollection.findUniqueOrThrow({
          where: {
            id: input.collectionId,
            organizationId: ctx.organizationId,
          },
        });
      }

      // Create bookable
      const { collectionId, description, ...restInput } = input;
      const bookable = await prisma.bookable.create({
        data: {
          ...restInput,
          organizationId: ctx.organizationId,
          collectionId: collectionId || null,
          description: description ?? null,
          images: input.images,
          priceTiers: input.priceTiers ?? undefined,
          blockedDates: input.blockedDates,
          startTime: input.startTime ?? undefined,
          endTime: input.endTime ?? undefined,
          bufferMinutes: input.bufferMinutes ?? undefined,
          allowMultipleDays: input.allowMultipleDays ?? undefined,
          allowMultipleGuests: input.allowMultipleGuests ?? undefined,
          minGuests: input.minGuests ?? undefined,
          maxGuestsPerBooking: input.maxGuestsPerBooking ?? undefined,
          availability: input.availability ?? undefined,
          requirePayment: input.requirePayment ?? undefined,
          requireDeposit: input.requireDeposit ?? undefined,
          depositPercent: input.depositPercent ?? undefined,
          successRedirectUrl: input.successRedirectUrl ?? undefined,
          cancelRedirectUrl: input.cancelRedirectUrl ?? undefined,
          hideBookingType: input.hideBookingType ?? undefined,
          internalNotes: input.internalNotes ?? undefined,
        },
      });

      return prisma.bookable.findUniqueOrThrow({
        where: { id: bookable.id },
      });
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        collectionId: z.string().optional().nullable(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        images: z.array(z.any()).optional(),
        basePrice: z.number().optional(),
        priceTiers: z
          .array(
            z.object({
              name: z.string(),
              price: z.number(),
            }),
          )
          .optional()
          .nullable(),
        units: z.number().optional().nullable(),
        allowMultipleGuests: z.boolean().optional(),
        minGuests: z.number().min(0).optional().nullable(),
        maxGuestsPerBooking: z.number().min(1).optional().nullable(),
        status: z.enum(BookableStatus).optional(),
        durationValue: z.number().min(1).optional(),
        durationUnit: z.enum(DurationUnit).optional(),
        minAdvanceValue: z.number().min(0).optional().nullable(),
        minAdvanceUnit: z.nativeEnum(MinAdvanceUnit).optional().nullable(),
        maxAdvanceValue: z.number().min(1).optional().nullable(),
        maxAdvanceUnit: z.nativeEnum(MaxAdvanceUnit).optional().nullable(),
        blockedDates: z.array(z.string()).optional(),
        taxType: z.enum(TaxType).optional().nullable(),
        taxValue: z.number().optional().nullable(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        bufferMinutes: z.number().min(0).optional().nullable(),
        allowMultipleDays: z.boolean().optional(),
        availability: z
          .array(
            z.object({
              day: z.string(),
              ranges: z.array(
                z.object({
                  startTime: z.string(),
                  endTime: z.string(),
                })
              ),
            })
          )
          .optional()
          .nullable(),
        requirePayment: z.boolean().optional(),
        requireDeposit: z.boolean().optional(),
        depositPercent: z.number().min(0).max(100).optional().nullable(),
        successRedirectUrl: z.string().optional().nullable(),
        cancelRedirectUrl: z.string().optional().nullable(),
        hideBookingType: z.boolean().optional(),
        internalNotes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, collectionId, ...bookableData } = input;

      // Verify bookable belongs to organization
      const existingBookable = await prisma.bookable.findUniqueOrThrow({
        where: {
          id,
          organizationId: ctx.organizationId,
        },
      });

      // Verify new collection if provided
      if (collectionId && collectionId !== existingBookable.collectionId) {
        await prisma.bookableCollection.findUniqueOrThrow({
          where: {
            id: collectionId,
            organizationId: ctx.organizationId,
          },
        });
      }

      // Update bookable (collectionId uses relation API, not raw field)
      await prisma.bookable.update({
        where: { id },
        data: {
          ...bookableData,
          description: input.description !== undefined ? input.description : undefined,
          images: input.images !== undefined ? input.images : undefined,
          priceTiers: input.priceTiers !== undefined ? (input.priceTiers ?? undefined) : undefined,
          blockedDates: input.blockedDates !== undefined ? input.blockedDates : undefined,
          startTime: input.startTime !== undefined ? input.startTime : undefined,
          endTime: input.endTime !== undefined ? input.endTime : undefined,
          bufferMinutes: input.bufferMinutes !== undefined ? input.bufferMinutes : undefined,
          allowMultipleDays: input.allowMultipleDays !== undefined ? input.allowMultipleDays : undefined,
          allowMultipleGuests: input.allowMultipleGuests !== undefined ? input.allowMultipleGuests : undefined,
          minGuests: input.minGuests !== undefined ? input.minGuests : undefined,
          maxGuestsPerBooking: input.maxGuestsPerBooking !== undefined ? input.maxGuestsPerBooking : undefined,
          availability: input.availability !== undefined ? (input.availability ?? undefined) : undefined,
          requirePayment: input.requirePayment !== undefined ? input.requirePayment : undefined,
          requireDeposit: input.requireDeposit !== undefined ? input.requireDeposit : undefined,
          depositPercent: input.depositPercent !== undefined ? input.depositPercent : undefined,
          successRedirectUrl: input.successRedirectUrl !== undefined ? input.successRedirectUrl : undefined,
          cancelRedirectUrl: input.cancelRedirectUrl !== undefined ? input.cancelRedirectUrl : undefined,
          hideBookingType: input.hideBookingType !== undefined ? input.hideBookingType : undefined,
          internalNotes: input.internalNotes !== undefined ? input.internalNotes : undefined,
          collection:
            collectionId !== undefined
              ? collectionId != null
                ? { connect: { id: collectionId } }
                : { disconnect: true }
              : undefined,
        },
      });

      return prisma.bookable.findUniqueOrThrow({
        where: { id },
      });
    }),

  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.bookable.delete({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });
    }),

  duplicate: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await prisma.bookable.findUniqueOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      // Create new bookable with same data but with " Copy" appended to title
      const duplicated = await prisma.bookable.create({
        data: {
          organizationId: ctx.organizationId,
          collectionId: original.collectionId,
          title: `${original.title} Copy`,
          description: original.description,
          images: original.images as Prisma.InputJsonValue,
          basePrice: original.basePrice,
          priceTiers: original.priceTiers ? (original.priceTiers as Prisma.InputJsonValue) : undefined,
          units: original.units,
          allowMultipleGuests: original.allowMultipleGuests,
          minGuests: original.minGuests,
          maxGuestsPerBooking: original.maxGuestsPerBooking,
          status: original.status,
          durationValue: original.durationValue,
          durationUnit: original.durationUnit,
          minAdvanceValue: original.minAdvanceValue,
          minAdvanceUnit: original.minAdvanceUnit,
          maxAdvanceValue: original.maxAdvanceValue,
          maxAdvanceUnit: original.maxAdvanceUnit,
          blockedDates: original.blockedDates as Prisma.InputJsonValue,
          taxType: original.taxType,
          taxValue: original.taxValue,
          startTime: original.startTime,
          endTime: original.endTime,
          bufferMinutes: original.bufferMinutes,
          allowMultipleDays: original.allowMultipleDays,
          availability: original.availability ? (original.availability as Prisma.InputJsonValue) : undefined,
          requirePayment: original.requirePayment,
          requireDeposit: original.requireDeposit,
          depositPercent: original.depositPercent,
          successRedirectUrl: original.successRedirectUrl,
          cancelRedirectUrl: original.cancelRedirectUrl,
          hideBookingType: original.hideBookingType,
          internalNotes: original.internalNotes,
        },
      });

      return prisma.bookable.findUniqueOrThrow({
        where: { id: duplicated.id },
      });
    }),

  getManyByCollection: organizationProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify collection belongs to organization
      await prisma.bookableCollection.findUniqueOrThrow({
        where: {
          id: input.collectionId,
          organizationId: ctx.organizationId,
        },
      });

      const count = await prisma.bookable.count({
        where: {
          collectionId: input.collectionId,
          organizationId: ctx.organizationId,
        },
      });

      return { count };
    }),

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
      // Try to find existing bookable by title or legacy name field
      let bookable = await prisma.bookable.findFirst({
        where: {
          organizationId: ctx.organizationId,
          OR: [
            { title: input.name },
            { name: input.name },
          ],
        },
      });

      // If not found, create a new bookable
      if (!bookable) {
        bookable = await prisma.bookable.create({
          data: {
            organizationId: ctx.organizationId,
            title: input.name,
            name: input.name, // Legacy field for backward compatibility
            type: input.type, // Legacy field
            basePrice: input.price,
            durationValue: input.isMultiDay ? 1 : 2,
            durationUnit: input.isMultiDay ? DurationUnit.DAYS : DurationUnit.HOURS,
            units: 1,
            status: BookableStatus.PUBLISHED,
            images: [],
          },
        });
      }

      return bookable;
    }),
});


import { endOfDay, startOfDay } from "date-fns";
import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { inngest } from "@/inngest/client";
import { bookingChannel } from "@/inngest/channels/booking";
import { CustomFieldDisplayLocation } from "@/generated/prisma";
import {
  buildBookingCustomFieldValuesPayload,
  customFieldValuesToRecord,
} from "@/features/custom-fields/utils";

export const bookingsRouter = createTRPCRouter({
  getStats: organizationProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const start = startOfDay(input.startDate ?? new Date());
      const end = endOfDay(input.endDate ?? new Date());

      const dateFilter = { startTime: { gte: start, lte: end } };

      const [bookingCount, revenueAgg, collectedAgg] = await Promise.all([
        prisma.booking.count({
          where: { organizationId: ctx.organizationId, status: { not: "canceled" }, ...dateFilter },
        }),
        prisma.booking.aggregate({
          where: { organizationId: ctx.organizationId, status: { not: "canceled" }, ...dateFilter },
          _sum: { total: true },
        }),
        prisma.payment.aggregate({
          where: {
            booking: { organizationId: ctx.organizationId, ...dateFilter },
            status: "completed",
          },
          _sum: { amount: true },
        }),
      ]);

      const totalRevenue = revenueAgg._sum.total ?? 0;
      const collected = collectedAgg._sum.amount ?? 0;

      return {
        bookingCount,
        totalRevenue,
        collected,
        pending: Math.max(0, totalRevenue - collected),
      };
    }),

  getMany: organizationProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z.number().default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        collectionId: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = {
        organizationId: ctx.organizationId,
        ...(input.startDate && input.endDate
          ? { startTime: { gte: startOfDay(input.startDate), lte: endOfDay(input.endDate) } }
          : {}),
        ...(input.search
          ? {
              OR: [
                { id: { contains: input.search, mode: "insensitive" as const } },
                { notes: { contains: input.search, mode: "insensitive" as const } },
                {
                  customer: {
                    name: { contains: input.search, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : {}),
        ...(input.collectionId
          ? { bookable: { collectionId: input.collectionId } }
          : {}),
      };

      const result = await prisma.booking.findMany({
        where,
        skip,
        take: input.pageSize,
        orderBy: { startTime: "desc" },
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  bookings: true,
                },
              },
              customFieldValues: {
                include: { field: true },
              },
            },
          },
          bookable: true,
          payments: true,
          customFieldValues: {
            include: { field: true },
          },
        },
      });

      const items = result.map((booking) => {
        const { _count, customFieldValues: customerValues, ...customerWithoutCount } = booking.customer;
        const bookingCount = _count?.bookings || 0;
        return {
          ...booking,
          customFields: customFieldValuesToRecord(booking.customFieldValues),
          customer: {
            ...customerWithoutCount,
            bookingCount,
            customFields: customFieldValuesToRecord(customerValues),
          },
        };
      });

      const totalCount = await prisma.booking.count({ where });

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

  /** Non-canceled bookings overlapping a date for a bookable (for availability checks) */
  getOverlappingForDate: organizationProcedure
    .input(
      z.object({
        bookableId: z.string(),
        date: z.date(),
        excludeBookingId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dayStart = startOfDay(input.date);
      const dayEnd = endOfDay(input.date);
      const bookings = await prisma.booking.findMany({
        where: {
          organizationId: ctx.organizationId,
          bookableId: input.bookableId,
          status: { not: "canceled" },
          ...(input.excludeBookingId
            ? { id: { not: input.excludeBookingId } }
            : {}),
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      });
      return bookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      }));
    }),

  /** Non-canceled bookings overlapping a date range (for calendar date disabling) */
  getOverlappingForDateRange: organizationProcedure
    .input(
      z.object({
        bookableId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        excludeBookingId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rangeStart = startOfDay(input.startDate);
      const rangeEnd = endOfDay(input.endDate);
      const bookings = await prisma.booking.findMany({
        where: {
          organizationId: ctx.organizationId,
          bookableId: input.bookableId,
          status: { not: "canceled" },
          ...(input.excludeBookingId
            ? { id: { not: input.excludeBookingId } }
            : {}),
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { startTime: true, endTime: true },
      });
      return bookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      }));
    }),

  /** Non-canceled bookings overlapping a time range (for end-picker availability) */
  getOverlappingForRange: organizationProcedure
    .input(
      z.object({
        bookableId: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        excludeBookingId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const bookings = await prisma.booking.findMany({
        where: {
          organizationId: ctx.organizationId,
          bookableId: input.bookableId,
          status: { not: "canceled" },
          ...(input.excludeBookingId
            ? { id: { not: input.excludeBookingId } }
            : {}),
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { startTime: true, endTime: true },
      });
      return bookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      }));
    }),

  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  bookings: true,
                },
              },
              customFieldValues: {
                include: { field: true },
              },
            },
          },
          bookable: true,
          payments: true,
          upsells: true,
          customFieldValues: {
            include: { field: true },
          },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const { _count, customFieldValues: customerValues, ...customerWithoutCount } = booking.customer;
      const bookingCount = _count?.bookings || 0;

      return {
        ...booking,
        customFields: customFieldValuesToRecord(booking.customFieldValues),
        customer: {
          ...customerWithoutCount,
          bookingCount,
          customFields: customFieldValuesToRecord(customerValues),
        },
      };
    }),

  create: organizationProcedure
    .input(
      z.object({
        bookableId: z.string(),
        customerId: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        status: z.enum(["pending", "approved", "in_progress", "canceled", "completed"]).default("pending"),
        notes: z.string().optional(),
        customFields: z.record(z.string(), z.unknown()).optional(),
        basePrice: z.number(),
        upsellsTotal: z.number().default(0),
        serviceFee: z.number(),
        tax: z.number(),
        discount: z.number().default(0),
        total: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { customFields, ...bookingData } = input;

      // Find custom fields by identifiers (booking-scoped only)
      const fieldIdentifiers = customFields ? Object.keys(customFields) : [];
      const fields = fieldIdentifiers.length > 0
        ? await prisma.customField.findMany({
            where: {
              identifier: { in: fieldIdentifiers },
              organizationId: ctx.organizationId,
              displayLocation: CustomFieldDisplayLocation.BOOKING,
            },
          })
        : [];

      const fieldMap = new Map(fields.map((f) => [f.identifier, f]));

      const booking = await prisma.$transaction(async (tx) => {
        const newBooking = await tx.booking.create({
          data: {
            ...bookingData,
            organizationId: ctx.organizationId,
          },
          include: {
            customer: {
              include: {
                _count: {
                  select: {
                    bookings: true,
                  },
                },
                customFieldValues: {
                  include: { field: true },
                },
              },
            },
            bookable: true,
            payments: true,
            upsells: true,
            customFieldValues: {
              include: { field: true },
            },
          },
        });

        if (customFields && Object.keys(customFields).length > 0) {
          const data = buildBookingCustomFieldValuesPayload(
            customFields,
            fieldMap,
            newBooking.id,
          );
          if (data.length > 0) {
            await tx.customFieldValue.createMany({ data, skipDuplicates: true });
          }
        }

        return await tx.booking.findFirstOrThrow({
          where: { id: newBooking.id },
          include: {
            customer: {
              include: {
                _count: {
                  select: {
                    bookings: true,
                  },
                },
                customFieldValues: {
                  include: { field: true },
                },
              },
            },
            bookable: true,
            payments: true,
            upsells: true,
            customFieldValues: {
              include: { field: true },
            },
          },
        });
      });

      const { _count, customFieldValues: customerValues, ...customerWithoutCount } = booking.customer;
      const bookingCount = _count?.bookings || 0;

      const bookingDataWithCount = {
        ...booking,
        customFields: customFieldValuesToRecord(booking.customFieldValues),
        customer: {
          ...customerWithoutCount,
          bookingCount,
          customFields: customFieldValuesToRecord(customerValues),
        },
      };

      // Publish realtime update (only when realtime is available, e.g. in Inngest function context)
      const realtime = (inngest as { realtime?: { publish: (opts: unknown) => Promise<unknown> } }).realtime;
      if (realtime?.publish) {
        await realtime.publish({
          channel: bookingChannel(),
          topic: "update",
          data: {
            bookingId: booking.id,
            data: bookingDataWithCount,
          },
        });
      }

      return bookingDataWithCount;
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        bookableId: z.string().optional(),
        customerId: z.string().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        status: z.enum(["pending", "approved", "in_progress", "canceled", "completed"]).optional(),
        notes: z.string().optional(),
        customFields: z.record(z.string(), z.unknown()).optional(),
        basePrice: z.number().optional(),
        upsellsTotal: z.number().optional(),
        serviceFee: z.number().optional(),
        tax: z.number().optional(),
        discount: z.number().optional(),
        total: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, customFields, ...bookingData } = input;

      // Handle custom field values update
      if (customFields !== undefined) {
        const fieldIdentifiers = Object.keys(customFields);
        const fields = fieldIdentifiers.length > 0
          ? await prisma.customField.findMany({
              where: {
                identifier: { in: fieldIdentifiers },
                organizationId: ctx.organizationId,
                displayLocation: CustomFieldDisplayLocation.BOOKING,
              },
            })
          : [];

        const fieldMap = new Map(fields.map((f) => [f.identifier, f]));

        const booking = await prisma.$transaction(async (tx) => {
          await tx.customFieldValue.deleteMany({
            where: { bookingId: id },
          });

          if (Object.keys(customFields).length > 0) {
            const data = buildBookingCustomFieldValuesPayload(
              customFields,
              fieldMap,
              id,
            );
            if (data.length > 0) {
              await tx.customFieldValue.createMany({
                data,
                skipDuplicates: true,
              });
            }
          }

          return await tx.booking.update({
            where: { id, organizationId: ctx.organizationId },
            data: bookingData,
            include: {
              customer: {
                include: {
                  _count: {
                    select: {
                      bookings: true,
                    },
                  },
                  customFieldValues: {
                    include: { field: true },
                  },
                },
              },
              bookable: true,
              payments: true,
              upsells: true,
              customFieldValues: {
                include: { field: true },
              },
            },
          });
        });

        const { _count, customFieldValues: customerValues, ...customerWithoutCount } = booking.customer;
        const bookingCount = _count?.bookings || 0;

        const bookingDataWithCount = {
          ...booking,
          customFields: customFieldValuesToRecord(booking.customFieldValues),
          customer: {
            ...customerWithoutCount,
            bookingCount,
            customFields: customFieldValuesToRecord(customerValues),
          },
        };

        const realtime = (inngest as { realtime?: { publish: (opts: unknown) => Promise<unknown> } }).realtime;
        if (realtime?.publish) {
          await realtime.publish({
            channel: bookingChannel(),
            topic: "update",
            data: {
              bookingId: booking.id,
              data: bookingDataWithCount,
            },
          });
        }

        return bookingDataWithCount;
      }

      // Regular update without custom fields change
      const booking = await prisma.booking.update({
        where: {
          id,
          organizationId: ctx.organizationId,
        },
        data: bookingData,
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  bookings: true,
                },
              },
              customFieldValues: {
                include: { field: true },
              },
            },
          },
          bookable: true,
          payments: true,
          upsells: true,
          customFieldValues: {
            include: { field: true },
          },
        },
      });

      const { _count, customFieldValues: customerValues, ...customerWithoutCount } = booking.customer;
      const bookingCount = _count?.bookings || 0;

      const bookingDataWithCount = {
        ...booking,
        customFields: customFieldValuesToRecord(booking.customFieldValues),
        customer: {
          ...customerWithoutCount,
          bookingCount,
          customFields: customFieldValuesToRecord(customerValues),
        },
      };

      const realtime = (inngest as { realtime?: { publish: (opts: unknown) => Promise<unknown> } }).realtime;
      if (realtime?.publish) {
        await realtime.publish({
          channel: bookingChannel(),
          topic: "update",
          data: {
            bookingId: booking.id,
            data: bookingDataWithCount,
          },
        });
      }

      return bookingDataWithCount;
    }),

  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.booking.delete({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });
    }),

  // Payment mutations
  createPayment: organizationProcedure
    .input(
      z.object({
        bookingId: z.string(),
        method: z.string(),
        amount: z.number(),
        date: z.date(),
        status: z.enum(["pending", "completed"]).default("completed"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify booking exists and belongs to organization
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          organizationId: ctx.organizationId,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const payment = await prisma.payment.create({
        data: {
          bookingId: input.bookingId,
          method: input.method,
          amount: input.amount,
          date: input.date,
          status: input.status,
          notes: input.notes,
        },
      });

      return payment;
    }),

  updatePayment: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        method: z.string().optional(),
        amount: z.number().optional(),
        date: z.date().optional(),
        status: z.enum(["pending", "completed"]).optional(),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify payment exists and belongs to a booking in this organization
      const payment = await prisma.payment.findFirst({
        where: { id },
        include: {
          booking: {
            select: { organizationId: true },
          },
        },
      });

      if (!payment || payment.booking.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      const updated = await prisma.payment.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  removePayment: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify payment exists and belongs to a booking in this organization
      const payment = await prisma.payment.findFirst({
        where: { id: input.id },
        include: {
          booking: {
            select: { organizationId: true },
          },
        },
      });

      if (!payment || payment.booking.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      return prisma.payment.delete({
        where: { id: input.id },
      });
    }),
});


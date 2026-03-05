import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { inngest } from "@/inngest/client";
import { bookingChannel } from "@/inngest/channels/booking";
import { CustomFieldDisplayLocation } from "@/generated/prisma";
import {
  buildCustomerCustomFieldValuesPayload,
  customFieldValuesToRecord,
} from "@/features/custom-fields/utils";

export const customerRouter = createTRPCRouter({
  findOrCreate: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z
          .union([
            z.string().email("Invalid email address"),
            z.literal(""),
            z.null(),
            z.undefined(),
          ])
          .transform((v) =>
            v === "" || v === undefined || v === null ? null : String(v),
          ),
        phone: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Try to find existing customer by name and organization
      let customer = await prisma.customer.findFirst({
        where: {
          organizationId: ctx.organizationId,
          name: input.name,
        },
      });

      // If not found, create a new customer
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            organizationId: ctx.organizationId,
            name: input.name,
            email: input.email,
            phone: input.phone,
          },
        });
      }

      return customer;
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        // Omit from request = leave DB unchanged. z.optional() wraps so missing key => undefined (not run through transform => null).
        email: z.optional(
          z
            .union([
              z.string().email("Invalid email address"),
              z.literal(""),
              z.null(),
            ])
            .transform((v) =>
              v === "" || v === null ? null : String(v),
            ),
        ),
        phone: z.optional(z.string().nullable()),
        streetAddress: z.optional(z.string().nullable()),
        cityCountry: z.optional(z.string().nullable()),
        customFields: z.record(z.string(), z.unknown()).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, customFields, ...data } = input;

      await prisma.customer.findFirstOrThrow({
        where: {
          id,
          organizationId: ctx.organizationId,
        },
      });

      if (customFields != null) {
        const fieldIdentifiers = Object.keys(customFields);
        const fields = fieldIdentifiers.length > 0
          ? await prisma.customField.findMany({
              where: {
                identifier: { in: fieldIdentifiers },
                organizationId: ctx.organizationId,
                displayLocation: CustomFieldDisplayLocation.CUSTOMER,
              },
            })
          : [];

        const fieldMap = new Map(fields.map((f) => [f.identifier, f]));

        await prisma.$transaction(async (tx) => {
          await tx.customFieldValue.deleteMany({
            where: { customerId: id },
          });

          if (Object.keys(customFields).length > 0) {
            const data = buildCustomerCustomFieldValuesPayload(
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
        });
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.streetAddress !== undefined && { streetAddress: data.streetAddress }),
          ...(data.cityCountry !== undefined && { cityCountry: data.cityCountry }),
        },
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
      });

      // Find all bookings for this customer and publish updates
      const bookings = await prisma.booking.findMany({
        where: {
          customerId: id,
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
        },
      });

      await Promise.all(
        bookings.map(async (booking) => {
          const { _count, customFieldValues: customerValues, ...customerWithoutCount } = booking.customer;
          const bookingCount = _count?.bookings || 0;

          const bookingData = {
            ...booking,
            customer: {
              ...customerWithoutCount,
              bookingCount,
              customFields: customFieldValuesToRecord(customerValues),
            },
          };

          const realtime = (inngest as { realtime?: { publish: (opts: unknown) => Promise<unknown> } }).realtime;
          if (realtime?.publish) {
            return realtime.publish({
              channel: bookingChannel(),
              topic: "update",
              data: {
                bookingId: booking.id,
                data: bookingData,
              },
            });
          }
          return Promise.resolve();
        }),
      );

      return {
        ...updatedCustomer,
        customFields: customFieldValuesToRecord(updatedCustomer.customFieldValues),
      };
    }),
});

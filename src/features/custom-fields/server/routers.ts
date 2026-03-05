import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { CustomFieldType, CustomFieldDisplayLocation, type Prisma } from "@/generated/prisma";

export const customFieldsRouter = createTRPCRouter({
  getMany: organizationProcedure.query(async ({ ctx }) => {
    return prisma.customField.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: {
        order: "asc",
      },
    });
  }),

  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.customField.findFirstOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });
    }),

  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.nativeEnum(CustomFieldType),
        options: z.array(z.string()).optional().nullable(),
        defaultValue: z.string().optional().nullable(),
        placeholder: z.string().optional().nullable(),
        required: z.boolean().default(false),
        enabled: z.boolean().default(true),
        displayLocation: z.nativeEnum(CustomFieldDisplayLocation).default(CustomFieldDisplayLocation.BOOKING),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate identifier from name (slugify)
      const slugify = (text: string) => {
        return text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "") // Remove special characters
          .replace(/[\s_-]+/g, "_") // Replace spaces and hyphens with underscores
          .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
      };

      let identifier = slugify(input.name);

      // Ensure identifier uniqueness globally
      const existing = await prisma.customField.findUnique({
        where: { identifier },
      });

      if (existing) {
        let counter = 1;
        let uniqueIdentifier = `${identifier}_${counter}`;
        while (await prisma.customField.findUnique({ where: { identifier: uniqueIdentifier } })) {
          counter++;
          uniqueIdentifier = `${identifier}_${counter}`;
        }
        identifier = uniqueIdentifier;
      }

      // Get max order value
      const maxOrder = await prisma.customField.findFirst({
        where: { organizationId: ctx.organizationId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const order = (maxOrder?.order ?? -1) + 1;

      // Validate options for OPTIONS and MULTISELECT types
      if (
        (input.type === CustomFieldType.OPTIONS ||
          input.type === CustomFieldType.MULTISELECT) &&
        (!input.options || input.options.length === 0)
      ) {
        throw new Error("Options are required for OPTIONS and MULTISELECT field types");
      }

      return prisma.customField.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          identifier,
          order,
          options: input.options ? (input.options as Prisma.InputJsonValue) : undefined,
          defaultValue: input.defaultValue || null,
          placeholder: input.placeholder || null,
          displayLocation: input.displayLocation ?? CustomFieldDisplayLocation.BOOKING,
        },
      });
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        type: z.nativeEnum(CustomFieldType).optional(),
        options: z.array(z.string()).optional().nullable(),
        defaultValue: z.string().optional().nullable(),
        placeholder: z.string().optional().nullable(),
        required: z.boolean().optional(),
        enabled: z.boolean().optional(),
        displayLocation: z.nativeEnum(CustomFieldDisplayLocation).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify field belongs to organization
      const field = await prisma.customField.findFirstOrThrow({
        where: {
          id,
          organizationId: ctx.organizationId,
        },
      });

      // Validate options for OPTIONS and MULTISELECT types
      const finalType = data.type ?? field.type;
      if (
        (finalType === CustomFieldType.OPTIONS ||
          finalType === CustomFieldType.MULTISELECT) &&
        (!data.options || data.options.length === 0)
      ) {
        // Check existing options if not provided
        const existingOptions = field.options as string[] | null;
        if (!existingOptions || existingOptions.length === 0) {
          throw new Error("Options are required for OPTIONS and MULTISELECT field types");
        }
      }

      const { options, defaultValue, placeholder, displayLocation, ...restData } = data;

      return prisma.customField.update({
        where: { id },
        data: {
          ...restData,
          options: options === null 
            ? (field.options === null ? undefined : field.options as Prisma.InputJsonValue)
            : (options ? (options as Prisma.InputJsonValue) : undefined),
          defaultValue: defaultValue === null ? null : defaultValue ?? field.defaultValue,
          placeholder: placeholder === null ? null : placeholder ?? field.placeholder,
          displayLocation: displayLocation ?? field.displayLocation,
        },
      });
    }),

  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify field belongs to organization
      await prisma.customField.findFirstOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      return prisma.customField.delete({
        where: { id: input.id },
      });
    }),

  reorder: organizationProcedure
    .input(
      z.object({
        fieldOrders: z.array(
          z.object({
            id: z.string(),
            order: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all fields belong to organization
      const fieldIds = input.fieldOrders.map((fo) => fo.id);
      const fields = await prisma.customField.findMany({
        where: {
          id: { in: fieldIds },
          organizationId: ctx.organizationId,
        },
      });

      if (fields.length !== fieldIds.length) {
        throw new Error("One or more fields not found");
      }

      // Update all fields in transaction
      await prisma.$transaction(
        input.fieldOrders.map(({ id, order }) =>
          prisma.customField.update({
            where: { id },
            data: { order },
          }),
        ),
      );

      return { success: true };
    }),

  toggleEnabled: organizationProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Verify field belongs to organization
      await prisma.customField.findFirstOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      return prisma.customField.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
    }),
});

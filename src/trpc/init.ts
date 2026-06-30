import { auth } from "@/lib/auth";
import { polarClient } from "@/lib/polar";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import superjson from "superjson";
import prisma from "@/lib/db";
export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    session,
  };
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    /**
     * @see https://trpc.io/docs/server/data-transformers
     */
    transformer: superjson,
  });
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  return next({ ctx: { ...ctx, auth: ctx.session } });
});

export const organizationProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.auth.session.activeOrganizationId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No organization selected",
      });
    }

    // Verify user is member of active org
    const member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.auth.session.activeOrganizationId,
          userId: ctx.auth.user.id,
        },
      },
    });

    if (!member) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not a member of this organization",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organizationId: ctx.auth.session.activeOrganizationId,
        memberRole: member.role,
      },
    });
  },
);

export const adminProcedure = organizationProcedure.use(({ ctx, next }) => {
  if (!["owner", "admin"].includes(ctx.memberRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const editorProcedure = organizationProcedure.use(({ ctx, next }) => {
  if (!["owner", "admin", "editor"].includes(ctx.memberRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Editor access required",
    });
  }
  return next({ ctx });
});

export const livechatProcedure = organizationProcedure.use(({ ctx, next }) => {
  if (!["owner", "admin", "editor", "livechat"].includes(ctx.memberRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Livechat access required",
    });
  }
  return next({ ctx });
});

export const ownerProcedure = organizationProcedure.use(({ ctx, next }) => {
  if (ctx.memberRole !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner access required",
    });
  }
  return next({ ctx });
});

export const premiumProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (!polarClient) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Subscription system not configured",
      });
    }

    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    if (
      !customer.activeSubscriptions ||
      customer.activeSubscriptions.length === 0
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Active subscription required",
      });
    }

    return next({ ctx: { ...ctx, customer } });
  },
);

import { generateSlug } from "random-word-slugs";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import z from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const organizationsRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    // Get user's current organization from session
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    return session?.session.activeOrganizationId || null;
  }),
  
  getMany: protectedProcedure.query(async ({ ctx }) => {
    // Get all orgs user is a member of
    return prisma.member.findMany({
      where: { userId: ctx.auth.user.id },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });
  }),
  
  getMembers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user is member of this org
      const membership = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.auth.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization",
        });
      }

      return prisma.member.findMany({
        where: { organizationId: input.organizationId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      });
    }),
  
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(2);
      
      // Create org and make user owner
      const organization = await prisma.organization.create({
        data: {
          name: input.name,
          slug,
          members: {
            create: {
              userId: ctx.auth.user.id,
              role: "owner",
            },
          },
        },
      });

      return organization;
    }),
  
  switchOrganization: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is member
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
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

      // Update session with new active organization
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: input.organizationId,
        },
      });

      return { success: true };
    }),
  
  inviteMember: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "member"])
    }))
    .mutation(async ({ ctx, input }) => {
      // Check user is owner/admin
      const membership = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.auth.user.id,
          },
        },
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can invite members",
        });
      }

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          inviterId: ctx.auth.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // TODO: Send invitation email

      return invitation;
    }),
  
  removeMember: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      const membership = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.auth.user.id,
          },
        },
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can remove members",
        });
      }

      // Can't remove yourself
      if (input.userId === ctx.auth.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself from the organization",
        });
      }

      // Can't remove the owner
      const targetMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
      });

      if (targetMember?.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the organization owner",
        });
      }

      // Remove member
      await prisma.member.delete({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),
  
  updateMemberRole: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      userId: z.string(),
      role: z.enum(["owner", "admin", "member"])
    }))
    .mutation(async ({ ctx, input }) => {
      // Only owner can update roles
      const membership = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.auth.user.id,
          },
        },
      });

      if (membership?.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can change member roles",
        });
      }

      // Can't change your own role
      if (input.userId === ctx.auth.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      // Update role
      const updatedMember = await prisma.member.update({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      });

      return updatedMember;
    }),

  updateName: adminProcedure
    .input(z.object({ 
      name: z.string().min(1) 
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.organization.update({
        where: { 
          id: ctx.organizationId,
        },
        data: { name: input.name },
      });
    }),

  updateSettings: adminProcedure
    .input(
      z.object({
        timezone: z.string().optional(),
        currency: z.string().optional(),
        country: z.string().optional(),
        weekStart: z.enum(["monday", "sunday"]).optional(),
        dateTimeFormat: z.enum(["12", "24"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Build update data object, only including provided fields
      const updateData: {
        timezone?: string;
        currency?: string;
        country?: string;
        weekStart?: string;
        dateTimeFormat?: string;
      } = {};

      if (input.timezone !== undefined) {
        updateData.timezone = input.timezone;
      }
      if (input.currency !== undefined) {
        updateData.currency = input.currency;
      }
      if (input.country !== undefined) {
        updateData.country = input.country;
      }
      if (input.weekStart !== undefined) {
        updateData.weekStart = input.weekStart;
      }
      if (input.dateTimeFormat !== undefined) {
        updateData.dateTimeFormat = input.dateTimeFormat;
      }

      return prisma.organization.update({
        where: { id: ctx.organizationId },
        data: updateData,
      });
    }),
});


import { headers } from "next/headers";
import { generateSlug } from "random-word-slugs";
import z from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const onboardingRouter = createTRPCRouter({
  complete: protectedProcedure
    .input(
      z.object({
        hearAboutUs: z.enum(["google", "youtube", "instagram", "facebook", "tiktok", "friend"]),
        businessName: z.string().min(1).max(50),
        teamSize: z.enum(["just_me", "2_10", "11_50", "50_plus"]),
        useCase: z.array(z.enum(["support", "automation", "sales", "booking"])).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(2);

      const organization = await prisma.organization.create({
        data: {
          name: input.businessName,
          slug,
          hearAboutUs: input.hearAboutUs,
          teamSize: input.teamSize,
          useCase: input.useCase,
          members: {
            create: {
              userId: ctx.auth.user.id,
              role: "owner",
            },
          },
        },
      });

      await prisma.user.update({
        where: { id: ctx.auth.user.id },
        data: { lastActiveOrganizationId: organization.id },
      });

      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: organization.id },
      });

      return { organizationId: organization.id };
    }),
});

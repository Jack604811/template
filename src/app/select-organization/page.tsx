import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SelectOrganizationView } from "@/features/organizations/components/select-organization-view";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const memberships = await prisma.member.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  // Brand new users with no organization go through onboarding first
  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  // Auto-switch only on fresh login (no org in session yet)
  if (!session.session.activeOrganizationId) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastActiveOrganizationId: true },
    });

    if (user?.lastActiveOrganizationId) {
      const member = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: user.lastActiveOrganizationId,
            userId: session.user.id,
          },
        },
      });

      if (member) {
        await auth.api.setActiveOrganization({
          headers: await headers(),
          body: { organizationId: user.lastActiveOrganizationId },
        });
        redirect("/chat");
      }
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectOrganizationView memberships={memberships} />
    </Suspense>
  );
};

export default Page;

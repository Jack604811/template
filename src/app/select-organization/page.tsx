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

  // If user already has an active organization, redirect to calendar
  if (session.session.activeOrganizationId) {
    redirect("/calendar");
  }

  // Get user's organizations
  const memberships = await prisma.member.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectOrganizationView memberships={memberships} />
    </Suspense>
  );
};

export default Page;

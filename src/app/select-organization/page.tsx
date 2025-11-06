import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SelectOrganizationView } from "@/features/organizations/components/select-organization-view";
import prisma from "@/lib/db";
import { Suspense } from "react";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // If user already has an active organization, redirect to workflows
  if (session.session.activeOrganizationId) {
    redirect("/workflows");
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


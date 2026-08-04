import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id },
  });

  if (membership) {
    redirect(session.session.activeOrganizationId ? "/chat" : "/select-organization");
  }

  return <OnboardingWizard />;
};

export default Page;

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { AcceptInvitationView } from "@/features/organizations/components/accept-invitation-view";
import prisma from "@/lib/db";

interface Props {
  searchParams: Promise<{ id?: string }>;
}

const Page = async ({ searchParams }: Props) => {
  const { id } = await searchParams;

  if (!id) redirect("/");

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { organization: true },
  });

  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return (
      <AuthLayout>
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="font-semibold">Invitación no válida</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta invitación ha expirado o ya fue utilizada.
          </p>
        </div>
      </AuthLayout>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    const existing = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!existing) {
      await prisma.member.create({
        data: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
          role: invitation.role,
        },
      });
    }

    await prisma.invitation.update({
      where: { id },
      data: { status: "accepted" },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveOrganizationId: invitation.organizationId },
    });

    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId: invitation.organizationId },
    });

    redirect("/chat");
  }

  return (
    <AuthLayout>
      <AcceptInvitationView
        invitationId={id}
        invitationEmail={invitation.email}
        organizationName={invitation.organization.name}
        role={invitation.role}
      />
    </AuthLayout>
  );
};

export default Page;

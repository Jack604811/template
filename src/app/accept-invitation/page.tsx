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
        <div className="flex min-h-svh items-center justify-center px-4">
          <div className="text-center">
            <p className="font-semibold">Invitación no válida</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta invitación ha expirado o ya fue utilizada.
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(`/login?id=${id}`);
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

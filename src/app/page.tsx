import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect(session.session.activeOrganizationId ? "/chat" : "/select-organization");
  }

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { Building2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { getRoleLabel } from "../utils/roles";

interface Props {
  invitationId: string;
  invitationEmail: string;
  organizationName: string;
  role: string;
}

export function AcceptInvitationView({ invitationId, organizationName, role }: Props) {
  const router = useRouter();
  const trpc = useTRPC();

  const acceptMutation = useMutation(
    trpc.organizations.acceptInvitation.mutationOptions({
      onSuccess: ({ organizationId }) => {
        authClient.organization.setActive({ organizationId }).finally(() => {
          router.push("/chat");
        });
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logos/logo.svg" alt="Nodebase" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight">Nodebase</span>
          </Link>
        </div>

        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Building2Icon className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{organizationName}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Te han invitado como{" "}
              <span className="font-medium text-foreground">{getRoleLabel(role)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => acceptMutation.mutate({ id: invitationId })}
          disabled={acceptMutation.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {acceptMutation.isPending ? "Aceptando…" : "Aceptar invitación"}
        </button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Cuenta equivocada?{" "}
          <button
            type="button"
            onClick={() => authClient.signOut().then(() => window.location.reload())}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Cerrar sesión
          </button>
        </p>
      </div>
    </div>
  );
}

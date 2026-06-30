"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Building2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { getRoleLabel } from "../utils/roles";

interface Props {
  invitationId: string;
  invitationEmail: string;
  organizationName: string;
  role: string;
}

export function AcceptInvitationView({ invitationId, invitationEmail, organizationName, role }: Props) {
  const router = useRouter();
  const trpc = useTRPC();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(invitationEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => acceptMutation.mutate({ id: invitationId }),
        onError: (ctx) => {
          toast.error(ctx.error.message);
          setLoading(false);
        },
      },
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authClient.signUp.email(
      { email, password, name },
      {
        onSuccess: () => acceptMutation.mutate({ id: invitationId }),
        onError: (ctx) => {
          toast.error(ctx.error.message);
          setLoading(false);
        },
      },
    );
  };

  const isPending = loading || acceptMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Building2Icon className="size-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{organizationName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Te han invitado como <span className="font-medium text-foreground">{getRoleLabel(role)}</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === "login" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === "register" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Registrarse
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={isPending}>
              {isPending ? "Aceptando..." : "Iniciar sesión y aceptar"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email-reg">Correo electrónico</Label>
              <Input
                id="email-reg"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-reg">Contraseña</Label>
              <Input
                id="password-reg"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={isPending}>
              {isPending ? "Aceptando..." : "Crear cuenta y aceptar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

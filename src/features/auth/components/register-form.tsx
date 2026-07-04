"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";

const registerSchema = z
  .object({
    email: z.email("Ingresa un correo válido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("id");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    await authClient.signUp.email(
      { name: values.email, email: values.email, password: values.password },
      {
        onSuccess: () => {
          router.push(invitationId ? `/accept-invitation?id=${invitationId}` : "/chat");
        },
        onError: (ctx) => { toast.error(ctx.error.message); },
      },
    );
  };

  const isPending = form.formState.isSubmitting;

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logos/logo.svg" alt="Nodebase" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight">Nodebase</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Crea tu cuenta</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {invitationId ? "Regístrate para aceptar la invitación" : "Comienza gratis, sin tarjeta de crédito"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Correo electrónico</FormLabel>
                  <FormControl>
                    <input
                      type="email"
                      placeholder="tu@correo.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/60 focus:bg-muted/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
                  <FormControl>
                    <input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/60 focus:bg-muted/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Confirmar contraseña</FormLabel>
                  <FormControl>
                    <input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/60 focus:bg-muted/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 h-auto w-full rounded-xl py-3 text-sm font-semibold"
            >
              {isPending ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={invitationId ? `/login?id=${invitationId}` : "/login"}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

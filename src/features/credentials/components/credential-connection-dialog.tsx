"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Check, Copy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CredentialType } from "@/generated/prisma";
import {
  useCreateCredential,
  useCredentialForEdit,
  useUpdateCredential,
} from "../hooks/use-credentials";
import { getCredentialOption } from "./credential";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.nativeEnum(CredentialType),
  value: z.string(),
  extraValues: z.record(z.string(), z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialType: CredentialType;
  onCredentialCreated?: (credentialId: string) => void;
  existingCredential?: {
    id: string;
    name: string;
    value?: string;
  };
}

type ExtraField = { name: string; label: string; placeholder: string };

function buildDefaultValuesFromDecrypted(
  name: string,
  decryptedValue: string,
  credentialType: CredentialType,
  extraFields: ExtraField[],
): FormValues {
  let primaryValue = "";
  const extraValues: Record<string, string> = Object.fromEntries(
    extraFields.map((f) => [f.name, ""]),
  );

  const trimmed = decryptedValue.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, string>;
      primaryValue = typeof parsed.value === "string" ? parsed.value : "";
      for (const f of extraFields) {
        extraValues[f.name] = typeof parsed[f.name] === "string" ? parsed[f.name] : "";
      }
    } catch {
      primaryValue = trimmed;
    }
  } else {
    primaryValue = trimmed;
  }

  return { name, type: credentialType, value: primaryValue, extraValues };
}

function buildEmptyDefaultValues(
  name: string,
  credentialType: CredentialType,
  extraFields: ExtraField[],
): FormValues {
  return {
    name,
    type: credentialType,
    value: "",
    extraValues: Object.fromEntries(extraFields.map((f) => [f.name, ""])),
  };
}

function CopyField({ label, value }: { label: string; value: string }) {
  const copy = () =>
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado`));

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
        <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-1 h-6 w-6 shrink-0"
          onClick={copy}
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Icon-to-icon connector header shared by both the OAuth permission card and the API-key form. */
function ConnectionHeader({
  appLogo,
  appLabel,
  title,
  description,
}: {
  appLogo: string;
  appLabel: string;
  title: string;
  description: string;
}) {
  return (
    <DialogHeader className="items-center text-center">
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-background shadow-sm">
          <Image src="/logos/logo.svg" alt="Nodebase" width={28} height={28} />
        </div>
        <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm">
          <Image src={appLogo} alt={appLabel} width={32} height={32} className="object-contain" />
        </div>
      </div>
      <DialogTitle className="mt-4 text-lg">{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

function PrivacyNote({ ctaLabel }: { ctaLabel: string }) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Al hacer clic en &quot;{ctaLabel}&quot;, aceptas nuestra{" "}
      <Link href="/privacy-policy" target="_blank" className="underline underline-offset-2">
        Política de Privacidad
      </Link>
      .
    </p>
  );
}

export const CredentialConnectionDialog = ({
  open,
  onOpenChange,
  credentialType,
  onCredentialCreated,
  existingCredential,
}: Props) => {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const app = getCredentialOption(credentialType);
  const isEditMode = !!existingCredential;
  const [preGeneratedId, setPreGeneratedId] = useState<string>(() => crypto.randomUUID());

  useEffect(() => {
    if (open && !isEditMode) setPreGeneratedId(crypto.randomUUID());
  }, [open, isEditMode]);

  const extraFields = useMemo(
    () => (app as { extraFields?: ExtraField[] })?.extraFields ?? [],
    [app],
  );
  const permissions = (app as { permissions?: readonly string[] })?.permissions ?? [];
  const primaryLabel =
    (app as { primaryLabel?: string })?.primaryLabel ?? "API Key";

  const { data: credentialForEdit } = useCredentialForEdit(
    existingCredential?.id,
    open && isEditMode,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildEmptyDefaultValues(
      existingCredential?.name ?? "",
      credentialType,
      extraFields,
    ),
  });

  useEffect(() => {
    if (!open) return;
    if (isEditMode && credentialForEdit) {
      form.reset(
        buildDefaultValuesFromDecrypted(
          credentialForEdit.name,
          credentialForEdit.value,
          credentialType,
          extraFields,
        ),
      );
    } else {
      form.reset(
        buildEmptyDefaultValues(
          existingCredential?.name ?? "",
          credentialType,
          extraFields,
        ),
      );
    }
  }, [open, isEditMode, credentialForEdit, credentialType, existingCredential?.name, extraFields, form]);

  const buildValue = (values: FormValues): string | undefined => {
    const primaryValue = values.value.trim();
    if (isEditMode) {
      const extraAllBlank = extraFields.every(
        (f) => !values.extraValues?.[f.name]?.trim(),
      );
      if (!primaryValue && extraAllBlank) return undefined;
    }
    if (!extraFields.length) return primaryValue || undefined;
    return JSON.stringify({ value: primaryValue, ...values.extraValues });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const serializedValue = buildValue(values);
      const primaryValue = values.value.trim();

      if (serializedValue != null && !primaryValue) {
        form.setError("value", {
          message:
            primaryLabel === "Access Token"
              ? "El access token es obligatorio. Pégalo desde Meta Developer Console (API Setup)."
              : "Este campo es obligatorio.",
        });
        return;
      }
      if (!isEditMode && !serializedValue) {
        form.setError("value", { message: "Este campo es obligatorio." });
        return;
      }

      if (isEditMode && existingCredential) {
        await updateCredential.mutateAsync({
          id: existingCredential.id,
          name: values.name,
          type: credentialType,
          value: serializedValue,
        });
        toast.success(`Credencial de ${app?.label} actualizada`);
      } else {
        const newCredential = await createCredential.mutateAsync({
          id: preGeneratedId,
          name: values.name,
          type: credentialType,
          value: serializedValue ?? "",
        });
        toast.success(`${app?.label} conectado correctamente`);
        onCredentialCreated?.(newCredential.id);
      }

      if (!onCredentialCreated) {
        router.push("/credentials");
      }

      onOpenChange(false);
    } catch {
      // Error handled by hook
    }
  };

  if (!app) return null;

  // OAuth flow — permission-card style (icon pair, "would like to" bullets, consent CTA)
  if (app.authMethod === "oauth") {
    const isGmail = credentialType === CredentialType.GMAIL;
    const connectUrl = isGmail
      ? `/api/credentials/gmail/connect${isEditMode && existingCredential?.id ? `?credentialId=${existingCredential.id}` : ""}`
      : null;
    const ctaLabel = connectUrl
      ? isEditMode
        ? `Reautorizar con ${app.label}`
        : `Conectar con ${app.label}`
      : "Conectar";

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <ConnectionHeader
            appLogo={app.logo}
            appLabel={app.label}
            title={`Conectar ${app.label} a Nodebase`}
            description={app.description}
          />

          {permissions.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Nodebase podrá:</p>
              <ul className="space-y-2">
                {permissions.map((permission) => (
                  <li key={permission} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!connectUrl && (
            <p className="text-center text-sm text-muted-foreground">
              La autenticación OAuth estará disponible pronto.
            </p>
          )}

          <PrivacyNote ctaLabel={ctaLabel} />

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {connectUrl ? (
              <Button asChild>
                <a href={connectUrl}>{ctaLabel}</a>
              </Button>
            ) : (
              <Button disabled>{ctaLabel}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // API key / token flow — same header shell, form + save button
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/whatsapp`
      : "/api/webhooks/whatsapp";

  const isWhatsApp = credentialType === CredentialType.WHATSAPP;
  const isPending = isEditMode ? updateCredential.isPending : createCredential.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <ConnectionHeader
          appLogo={app.logo}
          appLabel={app.label}
          title={isEditMode ? `Editar ${app.label}` : `Conectar ${app.label} a Nodebase`}
          description={isEditMode ? "Actualiza los datos de tu credencial." : app.description}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder={`Mi cuenta de ${app.label}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{primaryLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        isEditMode
                          ? "Deja en blanco para mantener el valor actual"
                          : app.placeholder || "Ingresa tu API key"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {extraFields.map((extraField) => (
              <FormField
                key={extraField.name}
                control={form.control}
                name={`extraValues.${extraField.name}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{extraField.label}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          isEditMode ? "Deja en blanco para mantener el valor actual" : extraField.placeholder
                        }
                        value={typeof field.value === "string" ? field.value : ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            {isWhatsApp && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Configuración del webhook</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Agrega estos valores en Meta → WhatsApp → Configuración → Webhook y suscríbete al campo <strong>messages</strong>.
                    </p>
                  </div>
                  <CopyField label="URL de callback" value={webhookUrl} />
                  <CopyField
                    label="Token de verificación"
                    value={existingCredential?.id ?? preGeneratedId}
                  />
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditMode ? "Guardando..." : "Conectando..."
                  : isEditMode ? "Guardar" : "Conectar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

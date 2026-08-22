"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
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
import { ConnectionDialogShell } from "./connection-dialog-shell";
import type { getCredentialOption } from "./credential";

type AppOption = NonNullable<ReturnType<typeof getCredentialOption>>;
type ExtraField = { name: string; label: string; placeholder: string };

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.nativeEnum(CredentialType),
  value: z.string(),
  extraValues: z.record(z.string(), z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
        extraValues[f.name] =
          typeof parsed[f.name] === "string" ? parsed[f.name] : "";
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
      <div className="flex h-9 min-w-0 items-center rounded-md border bg-muted/50 px-3 text-sm">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialType: CredentialType;
  app: AppOption;
  onCredentialCreated?: (credentialId: string) => void;
  existingCredential?: { id: string; name: string; value?: string };
}

/** API-key / manual token connect form — same shell as OAuth, form body + save button. */
export function ApiKeyConnectionForm({
  open,
  onOpenChange,
  credentialType,
  app,
  onCredentialCreated,
  existingCredential,
}: Props) {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const isEditMode = !!existingCredential;
  const [preGeneratedId, setPreGeneratedId] = useState<string>(() =>
    crypto.randomUUID(),
  );

  useEffect(() => {
    if (open && !isEditMode) setPreGeneratedId(crypto.randomUUID());
  }, [open, isEditMode]);

  const extraFields = useMemo(
    () => (app as { extraFields?: ExtraField[] })?.extraFields ?? [],
    [app],
  );
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
  }, [
    open,
    isEditMode,
    credentialForEdit,
    credentialType,
    existingCredential?.name,
    extraFields,
    form,
  ]);

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
        toast.success(`Credencial de ${app.label} actualizada`);
      } else {
        const newCredential = await createCredential.mutateAsync({
          id: preGeneratedId,
          name: values.name,
          type: credentialType,
          value: serializedValue ?? "",
        });
        toast.success(`${app.label} conectado correctamente`);
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

  const isWhatsApp = credentialType === CredentialType.WHATSAPP;
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/whatsapp`
      : "/api/webhooks/whatsapp";
  const isPending = isEditMode
    ? updateCredential.isPending
    : createCredential.isPending;
  const dialogTitle = isEditMode
    ? `Editar ${app.label}`
    : `Conectar ${app.label} a Nodebase`;

  return (
    <ConnectionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      appLogo={app.logo}
      appLabel={app.label}
      title={dialogTitle}
      description={
        isEditMode ? "Actualiza los datos de tu credencial." : app.description
      }
      ctaLabel={
        isPending
          ? isEditMode
            ? "Guardando..."
            : "Conectando..."
          : isEditMode
            ? "Guardar"
            : "Conectar"
      }
      primaryDisabled={isPending}
      onPrimaryAction={() => form.handleSubmit(onSubmit)()}
    >
      <Form {...form}>
        {/* No <form onSubmit> submit button here — ConnectionDialogShell's footer
            triggers onPrimaryAction directly, which is what actually saves. Keeping
            the <form> wrapper (without a submit button inside it) still gives Enter-to-submit. */}
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
                        isEditMode
                          ? "Deja en blanco para mantener el valor actual"
                          : extraField.placeholder
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
                  <p className="text-sm font-medium">
                    Configuración del webhook
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Agrega estos valores en Meta → WhatsApp → Configuración →
                    Webhook y suscríbete al campo <strong>messages</strong>.
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
        </form>
      </Form>
    </ConnectionDialogShell>
  );
}

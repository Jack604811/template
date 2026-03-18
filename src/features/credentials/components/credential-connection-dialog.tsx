"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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
  name: z.string().min(1, "Name is required"),
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
      .then(() => toast.success(`${label} copied`));

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
              ? "Access token is required. Paste your token from Meta Developer Console (API Setup)."
              : "This field is required.",
        });
        return;
      }
      if (!isEditMode && !serializedValue) {
        form.setError("value", { message: "This field is required." });
        return;
      }

      if (isEditMode && existingCredential) {
        await updateCredential.mutateAsync({
          id: existingCredential.id,
          name: values.name,
          type: credentialType,
          value: serializedValue,
        });
        toast.success(`${app?.label} credential updated successfully`);
      } else {
        const newCredential = await createCredential.mutateAsync({
          name: values.name,
          type: credentialType,
          value: serializedValue ?? "",
        });
        toast.success(`${app?.label} account connected successfully`);
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

  // OAuth flow
  if (app.authMethod === "oauth") {
    const isGmail = credentialType === CredentialType.GMAIL;
    const connectUrl = isGmail
      ? `/api/credentials/gmail/connect${isEditMode && existingCredential?.id ? `?credentialId=${existingCredential.id}` : ""}`
      : null;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Image src={app.logo} alt={app.label} width={28} height={28} className="rounded" />
              <div>
                <DialogTitle>Connect {app.label}</DialogTitle>
                <DialogDescription>{app.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 rounded-lg border py-10 text-center">
            <Image src={app.logo} alt={app.label} width={48} height={48} />
            <p className="text-sm text-muted-foreground">
              {connectUrl
                ? isEditMode
                  ? "You will be redirected to Google to re-authorize access and refresh your token."
                  : "You will be redirected to Google to authorize access."
                : "OAuth authentication will be implemented soon."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {connectUrl ? (
              <Button asChild>
                <a href={connectUrl}>{isEditMode ? "Re-authorize with Google" : "Connect with Google"}</a>
              </Button>
            ) : (
              <Button disabled>Connect</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // API key / token flow
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/whatsapp`
      : "/api/webhooks/whatsapp";

  const isWhatsApp = credentialType === CredentialType.WHATSAPP;
  const isPending = isEditMode ? updateCredential.isPending : createCredential.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Image src={app.logo} alt={app.label} width={28} height={28} className="rounded" />
            <div>
              <DialogTitle>
                {isEditMode ? `Edit ${app.label} credential` : `Connect ${app.label}`}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update your credential details" : app.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`My ${app.label} credential`} {...field} />
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
                          ? "Leave blank to keep existing"
                          : app.placeholder || "Enter your API key"
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
                          isEditMode ? "Leave blank to keep existing" : extraField.placeholder
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
                    <p className="text-sm font-medium">Webhook configuration</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add these in Meta → WhatsApp → Configuration → Webhook, then subscribe to the <strong>messages</strong> field.
                    </p>
                  </div>
                  <CopyField label="Callback URL" value={webhookUrl} />
                  {existingCredential?.id ? (
                    <CopyField label="Verify token" value={existingCredential.id} />
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Verify token</Label>
                      <p className="text-xs text-muted-foreground">
                        Save this credential first to get your verify token.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditMode ? "Updating..." : "Connecting..."
                  : isEditMode ? "Update" : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CredentialType } from "@/generated/prisma";
import { useWhatsAppEmbeddedSignup } from "../hooks/use-whatsapp-embedded-signup";
import { ApiKeyConnectionForm } from "./api-key-connection-form";
import { ConnectionDialogShell } from "./connection-dialog-shell";
import { ConnectionPermissionList } from "./connection-permission-list";
import type { getCredentialOption } from "./credential";

type AppOption = NonNullable<ReturnType<typeof getCredentialOption>>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: AppOption;
  onCredentialCreated?: (credentialId: string) => void;
  existingCredential?: { id: string; name: string; value?: string };
}

/**
 * WhatsApp connection: an auth-style card whose primary button drives Embedded
 * Signup, with a subline that falls back to the manual token form (ApiKeyConnectionForm)
 * — the only credential type with two distinct connect mechanisms.
 */
export function WhatsAppConnectionCard({
  open,
  onOpenChange,
  app,
  onCredentialCreated,
  existingCredential,
}: Props) {
  const router = useRouter();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const isEditMode = !!existingCredential;

  useEffect(() => {
    if (open) setShowManualEntry(false);
  }, [open]);

  const whatsAppSignup = useWhatsAppEmbeddedSignup((credential) => {
    onCredentialCreated?.(credential.id);
    if (!onCredentialCreated) router.push("/credentials");
    onOpenChange(false);
  });

  if (showManualEntry) {
    return (
      <ApiKeyConnectionForm
        open={open}
        onOpenChange={onOpenChange}
        credentialType={CredentialType.WHATSAPP}
        app={app}
        onCredentialCreated={onCredentialCreated}
        existingCredential={existingCredential}
      />
    );
  }

  const ctaLabel = whatsAppSignup.isLoading
    ? "Conectando..."
    : isEditMode
      ? "Reconectar con Meta"
      : "Conectar con Meta";
  const permissions =
    (app as { permissions?: readonly string[] }).permissions ?? [];
  const handleLaunch = () =>
    whatsAppSignup.launch({ existingCredentialId: existingCredential?.id });

  return (
    <ConnectionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      appLogo={app.logo}
      appLabel={app.label}
      title={`Conectar ${app.label} a Nodebase`}
      description={app.description}
      ctaLabel={ctaLabel}
      primaryDisabled={!whatsAppSignup.isConfigured || whatsAppSignup.isLoading}
      onPrimaryAction={handleLaunch}
      footerExtra={
        <Button
          type="button"
          variant="link"
          onClick={() => setShowManualEntry(true)}
          className="mx-auto h-auto p-0 text-sm text-muted-foreground"
        >
          ¿Prefieres conectar manualmente con un token?
        </Button>
      }
    >
      <ConnectionPermissionList permissions={permissions} />
      {!whatsAppSignup.isConfigured && (
        <p className="text-center text-sm text-muted-foreground">
          La conexión con Meta estará disponible pronto.
        </p>
      )}
    </ConnectionDialogShell>
  );
}

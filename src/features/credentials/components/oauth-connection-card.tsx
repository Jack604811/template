"use client";

import Link from "next/link";
import { ConnectionDialogShell } from "./connection-dialog-shell";
import { ConnectionPermissionList } from "./connection-permission-list";
import type { getCredentialOption } from "./credential";

type AppOption = NonNullable<ReturnType<typeof getCredentialOption>>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: AppOption;
  isEditMode: boolean;
  existingCredentialId?: string;
}

function PrivacyNote({ ctaLabel }: { ctaLabel: string }) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Al hacer clic en &quot;{ctaLabel}&quot;, aceptas nuestra{" "}
      <Link
        href="/privacy-policy"
        target="_blank"
        className="underline underline-offset-2"
      >
        Política de Privacidad
      </Link>
      .
    </p>
  );
}

/**
 * OAuth-style connection card (icon pair, permission bullets, consent CTA). The primary
 * button navigates to `app.connectPath` — set that field in credentialTypeOptions to
 * light up a new integration here with zero changes to this component. See
 * src/lib/oauth-connect.ts for the generic connect/callback route factories.
 */
export function OAuthConnectionCard({
  open,
  onOpenChange,
  app,
  isEditMode,
  existingCredentialId,
}: Props) {
  const connectPath = (app as { connectPath?: string }).connectPath;
  const connectUrl = connectPath
    ? `${connectPath}${isEditMode && existingCredentialId ? `?credentialId=${existingCredentialId}` : ""}`
    : null;
  const ctaLabel = connectUrl
    ? isEditMode
      ? `Reautorizar con ${app.label}`
      : `Conectar con ${app.label}`
    : "Conectar";
  const permissions =
    (app as { permissions?: readonly string[] }).permissions ?? [];

  return (
    <ConnectionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      appLogo={app.logo}
      appLabel={app.label}
      title={`Conectar ${app.label} a Nodebase`}
      description={app.description}
      ctaLabel={ctaLabel}
      primaryDisabled={!connectUrl}
      primaryHref={connectUrl ?? undefined}
      onPrimaryAction={() => {
        if (connectUrl) window.location.href = connectUrl;
      }}
    >
      <ConnectionPermissionList permissions={permissions} />
      {!connectUrl && (
        <p className="text-center text-sm text-muted-foreground">
          La autenticación OAuth estará disponible pronto.
        </p>
      )}
      <PrivacyNote ctaLabel={ctaLabel} />
    </ConnectionDialogShell>
  );
}

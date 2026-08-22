"use client";

import { CredentialType } from "@/generated/prisma";
import { ApiKeyConnectionForm } from "./api-key-connection-form";
import { getCredentialOption } from "./credential";
import { OAuthConnectionCard } from "./oauth-connection-card";
import { WhatsAppConnectionCard } from "./whatsapp-connection-card";

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

/**
 * Dispatches to the right connection UI for a credential type: WhatsApp gets its own
 * auth-card + manual-fallback (see whatsapp-connection-card.tsx), other OAuth types
 * get the generic permission-card (oauth-connection-card.tsx, driven by
 * app.connectPath — see src/lib/oauth-connect.ts to add a new provider), and
 * everything else gets the manual API-key form (api-key-connection-form.tsx).
 */
export const CredentialConnectionDialog = ({
  open,
  onOpenChange,
  credentialType,
  onCredentialCreated,
  existingCredential,
}: Props) => {
  const app = getCredentialOption(credentialType);
  if (!app) return null;

  if (credentialType === CredentialType.WHATSAPP) {
    return (
      <WhatsAppConnectionCard
        open={open}
        onOpenChange={onOpenChange}
        app={app}
        onCredentialCreated={onCredentialCreated}
        existingCredential={existingCredential}
      />
    );
  }

  if (app.authMethod === "oauth") {
    return (
      <OAuthConnectionCard
        open={open}
        onOpenChange={onOpenChange}
        app={app}
        isEditMode={!!existingCredential}
        existingCredentialId={existingCredential?.id}
      />
    );
  }

  return (
    <ApiKeyConnectionForm
      open={open}
      onOpenChange={onOpenChange}
      credentialType={credentialType}
      app={app}
      onCredentialCreated={onCredentialCreated}
      existingCredential={existingCredential}
    />
  );
};

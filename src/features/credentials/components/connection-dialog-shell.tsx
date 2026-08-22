"use client";

import { ArrowLeftRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shared chrome for every credential connection dialog: the Nodebase↔app icon-pair
 * header, the mobile-drawer prop wiring (title/onConfirm/confirmLabel/confirmDisabled —
 * required because DialogFooter and the visual DialogTitle both no-op on mobile, see
 * components/ui/dialog.tsx), and the fixed dialog width. Fixed once here instead of
 * duplicated per mode, so a width/overflow fix never has to be re-applied by hand.
 */

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
      <div className="flex w-full flex-col items-center text-center">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl border bg-background shadow-sm">
            <Image
              src="/logos/logo.svg"
              alt="Nodebase"
              width={28}
              height={28}
            />
          </div>
          <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
            <Image src={appLogo} alt={appLabel} fill className="object-cover" />
          </div>
        </div>
        {/* Visible title, rendered identically on mobile and desktop. The Dialog/Drawer
            primitives require an accessible title too, but their built-in DialogTitle
            hides itself on mobile in favor of a small top-bar label — so we keep an
            sr-only one for a11y and render the real heading as plain text instead. */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <p className="mt-4 text-lg font-semibold">{title}</p>
        <DialogDescription>{description}</DialogDescription>
      </div>
    </DialogHeader>
  );
}

interface ConnectionDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appLogo: string;
  appLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** Called for the desktop primary button (when primaryHref is unset/disabled) and always for the mobile drawer's auto-generated confirm button. */
  onPrimaryAction: () => void;
  primaryDisabled?: boolean;
  /** When set and not disabled, the desktop button renders as a real `<a>` link (supports cmd/ctrl-click, right-click copy). Mobile always uses onPrimaryAction, since the drawer's button can't be a link. */
  primaryHref?: string;
  /** Rendered between the body and the footer, e.g. the "connect manually" subline. */
  footerExtra?: ReactNode;
  children: ReactNode;
}

export function ConnectionDialogShell({
  open,
  onOpenChange,
  appLogo,
  appLabel,
  title,
  description,
  ctaLabel,
  onPrimaryAction,
  primaryDisabled,
  primaryHref,
  footerExtra,
  children,
}: ConnectionDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[396px]"
        confirmLabel={ctaLabel}
        confirmDisabled={primaryDisabled}
        onConfirm={onPrimaryAction}
      >
        <ConnectionHeader
          appLogo={appLogo}
          appLabel={appLabel}
          title={title}
          description={description}
        />

        {children}

        {footerExtra}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {primaryHref && !primaryDisabled ? (
            <Button asChild>
              <a href={primaryHref}>{ctaLabel}</a>
            </Button>
          ) : (
            <Button onClick={onPrimaryAction} disabled={primaryDisabled}>
              {ctaLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

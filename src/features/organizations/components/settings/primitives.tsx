"use client";

import { ChevronsUpDownIcon, LogOutIcon, MoonIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function AppearanceSection({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme !== "light";

  return (
    <div className={cn("flex flex-col", compact ? "gap-0" : "gap-0 mt-6")}>
      {!compact && <SectionLabel>Apariencia</SectionLabel>}
      <div className="flex items-center gap-3 py-3 px-2">
        <MoonIcon className="size-[18px] shrink-0 text-muted-foreground" />
        <span className="flex-1 text-[15px] text-foreground/90">Modo oscuro</span>
        {mounted && (
          <Switch checked={isDark} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        )}
      </div>
      {!compact && <SectionLabel className="mt-4">Cuenta</SectionLabel>}
      <button
        type="button"
        onClick={() =>
          authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })
        }
        className="flex w-full items-center gap-3 py-3 px-2 rounded-lg text-left transition-colors hover:bg-muted/50 active:bg-muted"
      >
        <LogOutIcon className="size-[18px] shrink-0 text-destructive" />
        <span className="flex-1 text-[15px] text-destructive">Cerrar sesión</span>
      </button>
    </div>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onClick,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  onClick?: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "-mx-5 flex w-[calc(100%+2.5rem)] items-center gap-4 px-5 py-3.5 text-left transition-colors",
        onClick
          ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50"
          : "cursor-default",
        !last && "border-b border-border/40",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-[15px] leading-snug text-foreground">{value || "—"}</p>
      </div>
      {onClick && <PencilIcon className="size-3 shrink-0 text-muted-foreground/30" />}
    </button>
  );
}

export function DesktopField({
  icon,
  label,
  last = false,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-3.5", !last && "border-b border-border/40")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

export function DesktopPickerRow({
  icon,
  label,
  valueDisplay,
  last = false,
  disabled = false,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  valueDisplay: string;
  last?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("relative", !last && "border-b border-border/40")}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-4 py-3.5 text-left",
          !disabled && "cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors",
          disabled && "cursor-default",
        )}
        onClick={() => triggerRef.current?.querySelector("button")?.click()}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-[15px] leading-snug text-foreground">{valueDisplay || "—"}</p>
        </div>
        <PencilIcon className="size-3 shrink-0 text-muted-foreground/30" />
      </button>
      {!disabled && (
        <div
          ref={triggerRef}
          className="pointer-events-none absolute bottom-1 left-0 right-0 h-8 opacity-0"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DesktopToggleRow({
  icon,
  label,
  valueDisplay,
  last = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  valueDisplay: string;
  last?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 py-3.5 text-left transition-colors hover:bg-muted/30",
        !last && "border-b border-border/40",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-[15px] leading-snug text-foreground">{valueDisplay}</p>
      </div>
      <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

"use client";

import { ChevronRightIcon, ZapIcon } from "lucide-react";
import Image from "next/image";
import type { credentialTypeOptions } from "@/features/credentials/components/credential";
import type { Credential } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type AppOption = (typeof credentialTypeOptions)[number];

interface IntegrationAppCardProps {
  app: AppOption;
  credentials: Credential[];
  onManage: () => void;
}

const categoryLabels: Record<string, string> = {
  ai: "IA",
  communication: "Comunicación",
  productivity: "Productividad",
  social: "Social",
  business: "Negocio",
};

const categoryColors: Record<string, string> = {
  ai: "bg-muted text-foreground",
  communication: "bg-muted text-foreground",
  productivity: "bg-muted text-foreground",
  social: "bg-muted text-foreground",
  business: "bg-muted text-foreground",
};

export function IntegrationAppCard({ app, credentials, onManage }: IntegrationAppCardProps) {
  const count = credentials.length;
  const isConnected = count > 0;
  const category = (app as { category?: string }).category ?? "other";

  return (
    <>
      {/* Desktop card */}
      <button
        type="button"
        className={cn(
          "hidden md:flex flex-col rounded-2xl border bg-card p-5 gap-4 text-left h-full",
          "shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group w-full",
          "border-border hover:border-border/80",
        )}
        onClick={onManage}
      >
        <div className="flex items-start justify-between">
          <div className="relative h-14 w-14 rounded-[16px] bg-white shadow-sm overflow-hidden">
            <Image src={app.logo} alt={app.label} fill className="object-cover" />
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight",
              categoryColors[category] ?? "bg-muted text-muted-foreground",
            )}
          >
            {categoryLabels[category] ?? category}
          </span>
        </div>

        <div className="flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground">
            {app.label}
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {app.description}
          </p>
        </div>

        <div className="flex items-center pt-1 border-t border-border/40">
          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[13px] text-muted-foreground">
                {count === 1 ? "1 cuenta" : `${count} cuentas`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />
              <span className="text-[13px] text-muted-foreground">Sin conectar</span>
            </div>
          )}
        </div>
      </button>

      {/* Mobile list row */}
      <button
        type="button"
        className={cn(
          "md:hidden flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3",
          "text-left transition-colors hover:bg-accent/50 active:bg-accent",
          "border-border",
        )}
        onClick={onManage}
      >
        <div className="relative h-11 w-11 shrink-0 rounded-[13px] bg-white shadow-sm overflow-hidden">
          <Image src={app.logo} alt={app.label} fill className="object-cover" />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <span className="text-[15px] font-medium leading-snug truncate">{app.label}</span>
          <span className="text-[12px] text-muted-foreground">
            {isConnected
              ? count === 1
                ? "1 cuenta conectada"
                : `${count} cuentas conectadas`
              : "Sin conectar"}
          </span>
        </div>
        {isConnected && (
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 mr-1" />
        )}
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/50" />
      </button>
    </>
  );
}

export function IntegrationAppCardSkeleton() {
  return (
    <>
      <div className="hidden md:flex flex-col rounded-2xl border bg-card p-5 gap-4 shadow-sm animate-pulse">
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-xl bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-7 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="md:hidden flex items-center gap-3 rounded-xl border bg-card px-4 py-3 animate-pulse">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-4 w-4 rounded bg-muted" />
      </div>
    </>
  );
}

export function IntegrationsEmptyCard() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
        <ZapIcon className="size-6 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-[15px] font-medium text-foreground">Sin resultados</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ninguna integración coincide con tu búsqueda
        </p>
      </div>
    </div>
  );
}

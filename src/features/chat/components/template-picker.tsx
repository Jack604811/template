"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLinkIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MegaphoneIcon,
  SendHorizontalIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EntitySearch } from "@/components/entity-components";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Template = {
  name: string;
  language: string;
  id: string;
  category: string;
  bodyText: string;
  bodyParameterCount: number;
  bodyParameterNames: string[];
  bodyParameterExamples: string[];
  headerParameterCount: number;
};

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  MARKETING:      { label: "Marketing",    icon: MegaphoneIcon,   color: "text-orange-500" },
  UTILITY:        { label: "Utilidad",      icon: WrenchIcon,      color: "text-blue-500"   },
  AUTHENTICATION: { label: "Autenticación", icon: ShieldCheckIcon, color: "text-green-500"  },
};

function fillParams(text: string, values: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] ?? `{{${n}}}`);
}

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  credentialId: string;
}

export function TemplatePicker({ open, onClose, conversationId, credentialId }: TemplatePickerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [params, setParams] = useState<string[]>([]);

  const messagesQueryOptions = trpc.chat.getMessages.queryOptions({ conversationId });

  const { data, isLoading, error } = useQuery({
    ...trpc.credentials.getWhatsAppTemplates.queryOptions({ credentialId }),
    enabled: open,
    staleTime: 60_000,
  });

  const sendTemplate = useMutation(trpc.chat.sendTemplate.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesQueryOptions.queryKey });
      onClose();
    },
  }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data?.templates ?? []).filter(
      (t) => !q || t.name.includes(q) || t.bodyText.toLowerCase().includes(q),
    );
  }, [data, search]);

  function selectTemplate(t: Template) {
    setSelected(t);
    setParams(
      t.bodyParameterExamples
        .slice(0, t.bodyParameterCount)
        .concat(Array(Math.max(0, t.bodyParameterCount - t.bodyParameterExamples.length)).fill("")),
    );
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose();
      setSelected(null);
      setSearch("");
    }
  }

  function handleSend() {
    if (!selected) return;
    sendTemplate.mutate({
      conversationId,
      templateName: selected.name,
      templateLanguage: selected.language,
      previewText: fillParams(selected.bodyText, params),
      bodyParameters: params,
    });
  }

  const allParamsFilled = !selected || params.every((p) => p.trim().length > 0);

  /* ── List dialog ── */
  if (!selected) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTitle className="sr-only">Templates</DialogTitle>
        <DialogDescription className="sr-only">Selecciona un template para enviar</DialogDescription>
        <DialogContent title="Templates" showCloseButton className="flex flex-col gap-0 p-0 sm:max-w-lg overflow-hidden">
          <ScrollArea className="max-h-[70vh]">
            <div className="flex flex-col gap-4 px-4 py-4">
              <EntitySearch
                value={search}
                onChange={setSearch}
                placeholder="Buscar template..."
              />

              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <p className="py-8 text-center text-sm text-destructive">{error.message}</p>
              ) : filtered.length === 0 && !search ? (
                <Empty className="border-none">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <LayoutTemplateIcon />
                    </EmptyMedia>
                    <EmptyTitle>Sin templates</EmptyTitle>
                    <EmptyDescription>
                      Crea templates aprobados en WhatsApp Business Manager para enviarlos desde aquí.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://business.facebook.com/wa/manage/message-templates/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Crear en Meta
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </Button>
                </Empty>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
              ) : (
                <div className="flex flex-col">
                  {filtered.map((t) => {
                    const meta = CATEGORY_META[t.category] ?? CATEGORY_META.UTILITY;
                    const CatIcon = meta.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTemplate(t)}
                        className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted/50">
                          <CatIcon className={cn("size-4", meta.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate pr-2 text-sm font-semibold text-foreground">
                            {t.name.replace(/_/g, " ")}
                          </p>
                          {t.bodyText && (
                            <p className="truncate pr-2 text-sm text-muted-foreground">
                              {t.bodyText}
                            </p>
                          )}
                        </div>
                        <span className={cn("shrink-0 text-[11px] font-medium", meta.color)}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  /* ── Params dialog ── */
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={selected.name.replace(/_/g, " ")}
        showCloseButton
        className="sm:max-w-lg"
        onConfirm={allParamsFilled ? handleSend : undefined}
        confirmDisabled={!allParamsFilled || sendTemplate.isPending}
        confirmLabel={sendTemplate.isPending ? "Enviando..." : "Enviar template"}
      >
        <DialogHeader>
          <DialogTitle>{selected.name.replace(/_/g, " ")}</DialogTitle>
          <DialogDescription>
            {selected.bodyParameterCount > 0
              ? "Rellena los parámetros antes de enviar."
              : "Confirma para enviar este template."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80">
              {fillParams(selected.bodyText, params)}
            </p>
          </div>

          {selected.bodyParameterCount > 0 && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: selected.bodyParameterCount }, (_, i) => {
                const paramId = `tpl-param-${i}`;
                return (
                  <div key={paramId} className="flex flex-col gap-1.5">
                    <label htmlFor={paramId} className="text-[12px] font-medium text-muted-foreground">
                      {`{{${selected.bodyParameterNames[i] ?? i + 1}}}`}
                    </label>
                    <Input
                      id={paramId}
                      value={params[i] ?? ""}
                      placeholder={selected.bodyParameterExamples[i] ?? `Valor ${i + 1}`}
                      onChange={(e) => {
                        const next = [...params];
                        next[i] = e.target.value;
                        setParams(next);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setSelected(null)}>
            Volver
          </Button>
          <Button
            disabled={!allParamsFilled || sendTemplate.isPending}
            onClick={handleSend}
          >
            {sendTemplate.isPending && <Loader2Icon className="size-4 animate-spin" />}
            <SendHorizontalIcon className="size-4" />
            Enviar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

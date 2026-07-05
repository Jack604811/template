"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FileTextIcon,
  ImageIcon,
  LayoutListIcon,
  LinkIcon,
  MapPinIcon,
  MessageSquareQuoteIcon,
  TextIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import { useTRPC } from "@/trpc/client";
import type { SendPayload } from "./chat-input";
import { stepToPayload } from "./quick-reply-picker";
import type { QuickReplySequence, QuickReplyStep } from "./quick-reply-picker";

// ─── Step type icon map ───────────────────────────────────────────────────────

const STEP_ICONS: Record<QuickReplyStep["type"], React.ElementType> = {
  text:     TextIcon,
  image:    ImageIcon,
  carousel: LayoutListIcon,
  document: FileTextIcon,
  cta_url:  LinkIcon,
  location: MapPinIcon,
};

const STEP_COLORS: Record<QuickReplyStep["type"], string> = {
  text:     "text-foreground",
  image:    "text-blue-500",
  carousel: "text-violet-500",
  document: "text-orange-500",
  cta_url:  "text-emerald-500",
  location: "text-rose-500",
};

// ─── QuickReplySlashMenu ──────────────────────────────────────────────────────

interface QuickReplySlashMenuProps {
  onSend: (payload: SendPayload) => void;
}

export function QuickReplySlashMenu({ onSend }: QuickReplySlashMenuProps) {
  const trpc = useTRPC();
  const { textInput } = usePromptInputController();
  const { data: sequences = [] } = useQuery(trpc.quickReplies.getMany.queryOptions());
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const value = textInput.value;
  const isOpen = value.startsWith("/") && !value.includes("\n");
  const query = isOpen ? value.slice(1).toLowerCase() : "";

  const filtered = sequences.filter((qr) => {
    if (!query) return true;
    const sc = qr.shortcut?.replace(/^\//, "").toLowerCase() ?? "";
    return qr.name.toLowerCase().includes(query) || sc.includes(query);
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = useCallback((qr: QuickReplySequence) => {
    for (const step of qr.steps) {
      onSend(stepToPayload(step));
    }
    textInput.clear();
  }, [onSend, textInput]);

  const dismiss = useCallback(() => {
    textInput.setInput("");
  }, [textInput]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        const item = filtered[activeIndex];
        if (item) {
          e.preventDefault();
          select(item);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [isOpen, filtered, activeIndex, select, dismiss]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 px-4">
      <div className="overflow-hidden rounded-2xl border bg-background shadow-lg">
        <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-muted-foreground">
              Sin resultados para{" "}
              <span className="font-medium text-foreground">/{query}</span>
            </p>
          ) : (
            filtered.map((qr, i) => {
              const stepTypes = [...new Set(qr.steps.map((s) => s.type))];
              return (
                <button
                  key={qr.id}
                  type="button"
                  data-index={i}
                  onClick={() => select(qr)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquareQuoteIcon className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium">{qr.name}</span>
                      {qr.shortcut && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {qr.shortcut}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {qr.steps.length}{" "}
                        {qr.steps.length === 1 ? "mensaje" : "mensajes"}
                      </span>
                      <div className="flex gap-1">
                        {stepTypes.map((type) => {
                          const Icon = STEP_ICONS[type];
                          return (
                            <Icon key={type} className={`size-3 ${STEP_COLORS[type]}`} />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

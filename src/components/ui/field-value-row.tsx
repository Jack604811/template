"use client";

import { format, isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CheckIcon, ChevronLeftIcon, PencilIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function Section({
  label,
  action,
  onAction,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="flex w-full items-center justify-between p-0 px-5 mb-2 cursor-pointer text-left"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          {action}
        </button>
      ) : (
        <div className="flex items-center justify-between px-5 mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          {action}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export type FieldType = "TEXT" | "NUMBER" | "DATE" | "TIME" | "TEXTAREA" | "OPTIONS" | "MULTISELECT";

export interface InfoRowProps {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  placeholder?: string;
  last?: boolean;
  onSave?: (value: string) => void;
  saving?: boolean;
  options?: string[];
  optionLabels?: Record<string, string>;
  multiline?: boolean;
  fieldType?: FieldType;
}

function formatDisplayValue(value: string, fieldType?: FieldType): string {
  if (fieldType === "DATE" && value) {
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    if (isValid(parsed)) return format(parsed, "d 'de' MMMM yyyy", { locale: es });
  }
  return value;
}

export function InfoRow({
  icon,
  label,
  value,
  placeholder,
  last = false,
  onSave,
  saving = false,
  options,
  optionLabels,
  multiline = false,
  fieldType,
}: InfoRowProps) {
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!value && !onSave) return null;

  const isSelect = !!options;
  const isDate = fieldType === "DATE";
  const isTime = fieldType === "TIME";
  const isNumber = fieldType === "NUMBER";
  const needsGuardar = !isSelect && !isDate;

  const borderClass = last ? "" : "border-b border-border/40";
  const displayValue = value ? formatDisplayValue(optionLabels?.[value] ?? value, fieldType) : (placeholder ?? "—");

  const iconEl = (
    <div className="shrink-0 w-9 h-9 rounded-2xl bg-muted/30 flex items-center justify-center">
      {icon ?? <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />}
    </div>
  );

  function openEdit() {
    if (!onSave || editing) return;
    setDraft(value ?? "");
    setEditing(true);
    if (!isMobile && !isSelect) setTimeout(() => inputRef.current?.focus(), 0);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) onSave?.(trimmed);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(value ?? "");
  }

  function saveDate(date: Date | undefined) {
    if (!date) return;
    const formatted = format(date, "yyyy-MM-dd");
    onSave?.(formatted);
    setEditing(false);
  }

  const selectedDate = isDate && value
    ? (() => { const d = parse(value, "yyyy-MM-dd", new Date()); return isValid(d) ? d : undefined; })()
    : undefined;

  if (!isMobile && isSelect && onSave) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className={`flex items-center gap-4 py-3.5 px-5 cursor-pointer ${borderClass}`}>
            {iconEl}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1.5">
                {label}
              </p>
              <p className={`text-[15px] leading-snug truncate ${!value ? "text-muted-foreground/50 italic" : "text-foreground"}`}>{displayValue}</p>
            </div>
            <PencilIcon className="size-3 text-muted-foreground/30 shrink-0" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40 rounded-2xl p-1">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt}
              onClick={() => onSave(opt)}
              className="flex items-center justify-between gap-2 font-medium cursor-pointer"
            >
              {optionLabels?.[opt] ?? opt}
              {opt === value && <CheckIcon className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!isMobile && isDate && onSave) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={`flex w-full items-center gap-4 py-3.5 px-5 text-left cursor-pointer ${borderClass}`}>
            {iconEl}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1.5">
                {label}
              </p>
              <p className={`text-[15px] leading-snug truncate ${!value ? "text-muted-foreground/50 italic" : "text-foreground"}`}>
                {displayValue}
              </p>
            </div>
            <PencilIcon className="size-3 text-muted-foreground/30 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => saveDate(d)}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <div
        role={onSave && !editing ? "button" : undefined}
        tabIndex={onSave && !editing ? 0 : undefined}
        className={`flex w-full items-center gap-4 py-3.5 px-5 text-left ${borderClass} ${onSave ? "cursor-pointer" : "cursor-default"}`}
        onClick={!editing ? openEdit : undefined}
        onKeyDown={
          onSave && !editing
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit();
                }
              }
            : undefined
        }
      >
        {iconEl}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1.5">
            {label}
          </p>
          {!isMobile && onSave && !isSelect ? (
            <input
              ref={inputRef}
              readOnly={!editing}
              type={isNumber ? "number" : isTime ? "time" : "text"}
              value={editing ? draft : (value ?? "")}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={editing ? save : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] appearance-none cursor-pointer focus:cursor-text placeholder:text-muted-foreground/50 placeholder:italic"
            />
          ) : (
            <p className={`text-[15px] leading-snug ${multiline ? "whitespace-pre-wrap" : "truncate"} ${!value ? "text-muted-foreground/50 italic" : "text-foreground"}`}>
              {displayValue}
            </p>
          )}
        </div>
        {onSave && <PencilIcon className="size-3 text-muted-foreground/30 shrink-0" />}
      </div>

      {onSave && (
        <Drawer open={editing && isMobile} onOpenChange={(v) => !v && cancel()}>
          <DrawerContent
            action={needsGuardar ? { label: "Guardar", onClick: save, disabled: saving } : undefined}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
              </DrawerClose>
              <DrawerTitle className="text-[15px] font-semibold">{label}</DrawerTitle>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                >
                  <XIcon className="size-5" />
                </button>
              </DrawerClose>
            </div>
            <DrawerDescription className="sr-only">Editar {label}</DrawerDescription>
            <div className="px-5 pt-2 pb-2 flex flex-col gap-3">
              {isSelect ? (
                <div className="flex flex-col gap-2">
                  {(options ?? []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setDraft(opt); setTimeout(save, 0); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-4 rounded-2xl border text-[15px] font-medium transition-colors",
                        opt === draft
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          opt === draft ? "border-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {opt === draft && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      {optionLabels?.[opt] ?? opt}
                    </button>
                  ))}
                </div>
              ) : isDate ? (
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={saveDate}
                    locale={es}
                  />
                </div>
              ) : multiline ? (
                <textarea
                  ref={(el) => el?.focus()}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
                />
              ) : (
                <input
                  ref={(el) => el?.focus()}
                  type={isNumber ? "number" : isTime ? "time" : "text"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

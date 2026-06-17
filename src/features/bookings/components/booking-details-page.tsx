"use client";

import { format } from "date-fns";
import {
  ArrowDownIcon,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  HeartIcon,
  MailIcon,
  MapPinIcon,
  MoreVerticalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  ShoppingBagIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pills } from "@/components/ui/pills";
import { getTaxCountryFromOrgCountry } from "@/features/bookables/lib/form-utils";
import { BOOKING_STATUSES } from "@/features/bookings/components/booking-calendar/status-config";
import { BookingDateBadge } from "@/features/bookings/components/booking-date-badge";
import { paymentMethods } from "@/features/bookings/constants";
import { useBookingInvalidation } from "@/features/bookings/hooks/use-booking-invalidation";
import { useBookingRealtime } from "@/features/bookings/hooks/use-booking-realtime";
import {
  useRemoveBooking,
  useSuspenseBooking,
  useUpdateBooking,
} from "@/features/bookings/hooks/use-bookings";
import { useUpdateCustomer } from "@/features/bookings/hooks/use-customers";
import {
  useCreatePayment,
  useRemovePayment,
  useUpdatePayment,
} from "@/features/bookings/hooks/use-payments";
import { getBookableTaxLabel } from "@/features/bookings/utils/compute-bookable-tax";
import { formatBookingDuration } from "@/features/bookings/utils/format-booking-duration";
import { useSuspenseCustomFields } from "@/features/custom-fields/hooks/use-custom-fields";
import { parseCustomFields } from "@/features/custom-fields/utils/parse-custom-fields";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import {
  CustomFieldDisplayLocation,
  CustomFieldType,
} from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency, formatTime } from "@/lib/format-utils";
import {
  cn,
  formatNumberWithPeriods,
  getTodayLocalDate,
  parseFormattedNumber,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "resumen" | "items" | "archivos" | "pagos";

type BookingStatusValue =
  | "pending"
  | "approved"
  | "in_progress"
  | "canceled"
  | "completed";

interface PaymentFormData {
  amount: string;
  method: string;
  date: string;
  notes: string;
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 mb-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface InfoRowProps {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  last?: boolean;
  onSave?: (value: string) => void;
  saving?: boolean;
  options?: string[];
  optionLabels?: Record<string, string>;
  multiline?: boolean;
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
  onSave,
  saving = false,
  options,
  optionLabels,
  multiline = false,
}: InfoRowProps) {
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!value && !onSave) return null;

  const isSelect = !!options;
  const borderClass = last ? "" : "border-b border-border/40";
  const displayValue = value ? (optionLabels?.[value] ?? value) : "—";

  const iconEl = (
    <div className="shrink-0 w-9 h-9 rounded-2xl bg-muted/30 flex items-center justify-center">
      {icon ?? (
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
      )}
    </div>
  );

  function openEdit() {
    if (!onSave) return;
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

  // Desktop select via DropdownMenu
  if (!isMobile && isSelect && onSave) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={`flex items-center gap-4 py-3.5 px-5 cursor-pointer ${borderClass}`}
          >
            {iconEl}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1.5">
                {label}
              </p>
              <p className="text-[15px] text-foreground leading-snug truncate">
                {displayValue}
              </p>
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

  return (
    <>
      <button
        type="button"
        className={`flex w-full items-center gap-4 py-3.5 px-5 text-left ${borderClass} ${onSave ? "cursor-pointer" : "cursor-default"}`}
        onClick={openEdit}
        disabled={!onSave}
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
              value={editing ? draft : (value ?? "")}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={editing ? save : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] appearance-none cursor-pointer focus:cursor-text"
            />
          ) : (
            <p
              className={`text-[15px] text-foreground leading-snug ${multiline ? "whitespace-pre-wrap" : "truncate"}`}
            >
              {displayValue}
            </p>
          )}
        </div>
        {onSave && (
          <PencilIcon className="size-3 text-muted-foreground/30 shrink-0" />
        )}
      </button>

      {onSave && (
        <Drawer open={editing && isMobile} onOpenChange={(v) => !v && cancel()}>
          <DrawerContent>
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
              </DrawerClose>
              <DrawerTitle className="text-[15px] font-semibold">
                {label}
              </DrawerTitle>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                >
                  <XIcon className="size-5" />
                </button>
              </DrawerClose>
            </div>
            <DrawerDescription className="sr-only">
              Editar {label}
            </DrawerDescription>
            <div className="px-5 pt-2 pb-safe-or-6 flex flex-col gap-3">
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
                          opt === draft
                            ? "border-primary"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {opt === draft && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </span>
                      {optionLabels?.[opt] ?? opt}
                    </button>
                  ))}
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
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              )}
              {!isSelect && (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-[15px] font-semibold transition-opacity disabled:opacity-50"
                >
                  Guardar
                </button>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

const CLAMP_LINES = 4;

function EditableNote({
  value,
  onSave,
  saving,
}: {
  value: string;
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [draft, setDraft] = useState(value);
  const textRef = useRef<HTMLParagraphElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const checkClamped = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 2);
  }, []);

  function openEdit() {
    setDraft(value);
    setEditing(true);
    if (!isMobile) {
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }, 0);
    }
  }

  function save() {
    if (draft.trim() !== value) onSave(draft.trim());
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(value);
  }

  if (!isMobile && editing) {
    return (
      <div className="relative w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug resize-none p-0 m-0 font-[inherit] overflow-hidden focus:cursor-text"
        />
      </div>
    );
  }

  return (
    <>
      <div className="group relative w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 mx-5 max-w-[calc(100%-2.5rem)] min-h-[200px]">
        <button
          type="button"
          ref={(el) => {
            (
              textRef as React.MutableRefObject<HTMLParagraphElement | null>
            ).current = el as unknown as HTMLParagraphElement;
            checkClamped();
          }}
          onClick={openEdit}
          style={
            expanded
              ? undefined
              : {
                  WebkitLineClamp: CLAMP_LINES,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
          }
          className="text-left text-[15px] text-foreground leading-snug whitespace-pre-wrap break-words cursor-pointer w-full bg-transparent border-none p-0 m-0 font-[inherit]"
        >
          {value || (
            <span className="text-muted-foreground/50 italic">
              Sin observaciones
            </span>
          )}
        </button>
        {(clamped || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-[12px] font-medium text-primary/70"
          >
            {expanded ? "Ver menos" : "Ver más"}
          </button>
        )}
        <PencilIcon className="absolute top-3 right-3 size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <Drawer open={editing && isMobile} onOpenChange={(v) => !v && cancel()}>
        <DrawerContent>
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            </DrawerClose>
            <DrawerTitle className="text-[15px] font-semibold">
              Observaciones
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <XIcon className="size-5" />
              </button>
            </DrawerClose>
          </div>
          <DrawerDescription className="sr-only">
            Editar observaciones
          </DrawerDescription>
          <div className="px-5 pt-2 pb-safe-or-6 flex flex-col gap-3">
            <textarea
              ref={(el) => el?.focus()}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-[50dvh] rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-[15px] font-semibold transition-opacity disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// ─── Payment form drawer ───────────────────────────────────────────────────────

interface PaymentFormDrawerProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPaymentId: string | null;
  initialData?: {
    amount: number;
    method: string;
    date: Date | null;
    notes: string | null;
  };
}

function PaymentFormDrawer({
  bookingId,
  open,
  onOpenChange,
  editingPaymentId,
  initialData,
}: PaymentFormDrawerProps) {
  const createPayment = useCreatePayment(bookingId);
  const updatePayment = useUpdatePayment(bookingId);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const buildForm = useCallback(
    (): PaymentFormData => ({
      amount: initialData
        ? formatNumberWithPeriods(String(Math.round(initialData.amount)))
        : "",
      method: initialData?.method ?? paymentMethods[0].value,
      date: initialData?.date
        ? initialData.date.toISOString().split("T")[0]
        : getTodayLocalDate(),
      notes: initialData?.notes ?? "",
    }),
    [initialData],
  );

  const [form, setForm] = useState<PaymentFormData>(buildForm);

  useEffect(() => {
    if (open) setForm(buildForm());
  }, [open, buildForm]);

  const reset = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!form.amount || !form.method) return;
    const amount = parseFormattedNumber(form.amount);
    const date = new Date(`${form.date}T00:00:00`);

    if (editingPaymentId) {
      await updatePayment.mutateAsync({
        id: editingPaymentId,
        method: form.method,
        amount,
        date,
        notes: form.notes || null,
      });
    } else {
      await createPayment.mutateAsync({
        bookingId,
        method: form.method,
        amount,
        date,
        status: "completed",
        notes: form.notes,
      });
    }
    reset();
  }, [form, editingPaymentId, bookingId, createPayment, updatePayment, reset]);

  const isPending = createPayment.isPending || updatePayment.isPending;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <DrawerClose asChild>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
            >
              <XIcon className="size-5" />
            </button>
          </DrawerClose>
          <DrawerTitle className="text-[15px] font-semibold">
            {editingPaymentId ? "Editar pago" : "Agregar pago"}
          </DrawerTitle>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.amount || isPending}
            className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <CheckIcon className="size-5" />
          </button>
        </div>
        <DrawerDescription className="sr-only">
          {editingPaymentId ? "Editar pago" : "Registrar pago"}
        </DrawerDescription>
        <div className="overflow-y-auto pb-safe-or-6 px-5 flex flex-col gap-5 pt-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Monto
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  amount: formatNumberWithPeriods(e.target.value),
                }))
              }
              className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Método de pago
            </p>
            <div className="flex flex-col gap-2">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, method: m.value }))}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-[15px] font-medium transition-colors",
                      m.value === form.method
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                        m.value === form.method
                          ? "border-primary"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {m.value === form.method && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <Icon className="size-4 shrink-0" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Fecha
            </p>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-muted/30 text-[15px] text-foreground text-left transition-colors hover:bg-muted/50"
                >
                  <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                  {form.date
                    ? format(
                        new Date(`${form.date}T00:00:00`),
                        "d 'de' MMMM, yyyy",
                      )
                    : "Seleccionar fecha"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" title="Fecha de pago">
                <Calendar
                  mode="single"
                  selected={
                    form.date ? new Date(`${form.date}T00:00:00`) : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      setForm((f) => ({ ...f, date: `${y}-${m}-${d}` }));
                      setDatePickerOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Notas
            </p>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              placeholder="Opcional"
              className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Tab: Resumen ──────────────────────────────────────────────────────────────

interface ResumenTabProps {
  booking: NonNullable<ReturnType<typeof useSuspenseBooking>["data"]>;
  onCustomerChange: (field: string, value: string) => void;
  onStatusChange: (status: BookingStatusValue) => void;
  onCustomFieldChange: (key: string, value: string) => void;
  onNotesChange: (notes: string) => void;
  isSaving: boolean;
}

function ResumenTab({
  booking,
  onCustomerChange,
  onStatusChange,
  onCustomFieldChange,
  onNotesChange,
  isSaving,
}: ResumenTabProps) {
  const { data: allCustomFields } = useSuspenseCustomFields();
  const bookingCustomFields = useMemo(
    () =>
      parseCustomFields(allCustomFields, CustomFieldDisplayLocation.BOOKING),
    [allCustomFields],
  );

  const customFieldRecord = useMemo<Record<string, string>>(() => {
    if (
      !booking.customFields ||
      typeof booking.customFields !== "object" ||
      Array.isArray(booking.customFields)
    ) {
      return {};
    }
    const record: Record<string, string> = {};
    for (const [k, v] of Object.entries(
      booking.customFields as Record<string, unknown>,
    )) {
      if (v != null) record[k] = String(v);
    }
    return record;
  }, [booking.customFields]);

  const statusLabels = useMemo(
    () =>
      Object.fromEntries(
        BOOKING_STATUSES.map((s) => [s.value, s.label]),
      ) as Record<string, string>,
    [],
  );

  const clientFields = [
    {
      icon: <UserIcon className="size-[15px] text-primary/70" />,
      label: "Nombre",
      field: "name",
      value: booking.customer?.name,
    },
    {
      icon: <MailIcon className="size-[15px] text-primary/70" />,
      label: "Correo",
      field: "email",
      value: booking.customer?.email,
    },
    {
      icon: <PhoneIcon className="size-[15px] text-primary/70" />,
      label: "Teléfono",
      field: "phone",
      value: booking.customer?.phone,
    },
    {
      icon: <MapPinIcon className="size-[15px] text-primary/70" />,
      label: "Dirección",
      field: "streetAddress",
      value: booking.customer?.streetAddress,
    },
    {
      icon: <MapPinIcon className="size-[15px] text-primary/70" />,
      label: "Ciudad",
      field: "cityCountry",
      value: booking.customer?.cityCountry,
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-4">
      <Section label="Cliente">
        {clientFields.map((f, i) => (
          <InfoRow
            key={f.field}
            icon={f.icon}
            label={f.label}
            value={f.value}
            last={i === clientFields.length - 1}
            onSave={(v) => onCustomerChange(f.field, v)}
            saving={isSaving}
          />
        ))}
      </Section>

      {(booking.status || bookingCustomFields.length > 0) && (
        <Section label="Personalización">
          <InfoRow
            label="Status"
            value={booking.status}
            options={BOOKING_STATUSES.map((s) => s.value)}
            optionLabels={statusLabels}
            onSave={(v) => onStatusChange(v as BookingStatusValue)}
            saving={isSaving}
          />
          {bookingCustomFields.map((field, i) => {
            const val = customFieldRecord[field.identifier] ?? null;
            const isTextField =
              field.type === CustomFieldType.TEXT ||
              field.type === CustomFieldType.NUMBER ||
              field.type === CustomFieldType.DATE ||
              field.type === CustomFieldType.TIME;
            const isTextarea = field.type === CustomFieldType.TEXTAREA;
            const isSelect =
              field.type === CustomFieldType.OPTIONS ||
              field.type === CustomFieldType.MULTISELECT;
            const isLast = i === bookingCustomFields.length - 1;

            if (isTextField || isTextarea) {
              return (
                <InfoRow
                  key={field.id}
                  label={field.name}
                  value={val}
                  last={isLast}
                  onSave={(v) => onCustomFieldChange(field.identifier, v)}
                  saving={isSaving}
                  multiline={isTextarea}
                />
              );
            }
            if (isSelect && field.options) {
              return (
                <InfoRow
                  key={field.id}
                  label={field.name}
                  value={val}
                  last={isLast}
                  options={field.options}
                  onSave={(v) => onCustomFieldChange(field.identifier, v)}
                  saving={isSaving}
                />
              );
            }
            return (
              <InfoRow
                key={field.id}
                label={field.name}
                value={val}
                last={isLast}
              />
            );
          })}
        </Section>
      )}

      <Section label="Observaciones">
        <EditableNote
          value={booking.notes ?? ""}
          onSave={onNotesChange}
          saving={isSaving}
        />
      </Section>

      <div className="flex gap-3 overflow-x-auto scrollbar-none px-5 pb-1">
        {[
          {
            label: "Creado",
            value: booking.createdAt
              ? format(new Date(booking.createdAt), "dd-MM-yy · HH:mm")
              : null,
          },
          {
            label: "Modificado",
            value: booking.updatedAt
              ? format(new Date(booking.updatedAt), "dd-MM-yy · HH:mm")
              : null,
          },
        ]
          .filter((c) => c.value)
          .map((c) => (
            <div
              key={c.label}
              className="shrink-0 flex flex-col gap-1 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 min-w-[140px]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {c.label}
              </p>
              <p className="text-[13px] font-medium text-foreground leading-snug">
                {c.value}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Tab: Items ────────────────────────────────────────────────────────────────

interface ItemsTabProps {
  booking: NonNullable<ReturnType<typeof useSuspenseBooking>["data"]>;
  currency: string;
}

function ItemsTab({ booking, currency }: ItemsTabProps) {
  const upsells = booking.upsells ?? [];

  if (upsells.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBagIcon />
            </EmptyMedia>
            <EmptyTitle>Sin items</EmptyTitle>
            <EmptyDescription>
              No hay items adicionales en esta reserva.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-4">
      <Section label="Pedido">
        {upsells.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-3 px-5 hover:bg-muted/30 active:bg-muted/50 transition-colors"
          >
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center">
              <ShoppingBagIcon className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.name}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.description}
                </p>
              )}
            </div>
            <span className="text-sm text-muted-foreground tabular-nums shrink-0">
              {formatCurrency(item.price, currency)}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ─── Tab: Archivos ─────────────────────────────────────────────────────────────

function ArchivosTab() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyTitle>Sin archivos</EmptyTitle>
          <EmptyDescription>
            No hay archivos adjuntos en esta reserva.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

// ─── Tab: Pagos ────────────────────────────────────────────────────────────────

interface PagosTabProps {
  booking: NonNullable<ReturnType<typeof useSuspenseBooking>["data"]>;
  currency: string;
  taxLabel: string;
  onAddPayment: () => void;
  onEditPayment: (id: string) => void;
  onDeletePayment: (id: string) => void;
}

function PagosTab({
  booking,
  currency,
  taxLabel,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
}: PagosTabProps) {
  const payments = booking.payments ?? [];
  const sortedPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) =>
          new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
      ),
    [payments],
  );

  return (
    <div className="flex flex-col gap-6 py-4">
      <Section label="Resumen">
        <div className="px-5">
          <div className="flex items-center justify-between py-3 border-b border-border/40">
            <p className="text-[14px] text-foreground">
              {booking.bookable?.title ?? "Servicio"}
            </p>
            <p className="text-[14px] text-foreground tabular-nums">
              {formatCurrency(booking.basePrice ?? 0, currency)}
            </p>
          </div>
          {(booking.upsellsTotal ?? 0) > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <p className="text-[14px] text-foreground">Items</p>
              <p className="text-[14px] text-foreground tabular-nums">
                {formatCurrency(booking.upsellsTotal ?? 0, currency)}
              </p>
            </div>
          )}
          {(booking.tax ?? 0) > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <p className="text-[14px] text-foreground">{taxLabel}</p>
              <p className="text-[14px] text-foreground tabular-nums">
                {formatCurrency(booking.tax ?? 0, currency)}
              </p>
            </div>
          )}
          {(booking.discount ?? 0) > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-border/40">
              <p className="text-[14px] text-foreground">Descuento</p>
              <p className="text-[14px] text-foreground tabular-nums">
                -{formatCurrency(booking.discount ?? 0, currency)}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => toast.info("Próximamente")}
            className="flex items-center gap-2 py-3 border-b border-border/40 w-full text-left text-muted-foreground/60 text-[14px]"
          >
            <span className="text-base">◇</span> Agregar gift card
          </button>
          <div className="flex items-center justify-between py-4">
            <p className="text-[15px] font-semibold text-foreground">Total</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums">
              {formatCurrency(booking.total ?? 0, currency)}
            </p>
          </div>
        </div>
      </Section>

      <Section
        label="Historial"
        action={
          <button
            type="button"
            onClick={onAddPayment}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary uppercase tracking-wide"
          >
            <PlusIcon className="size-3.5" /> Agregar
          </button>
        }
      >
        {sortedPayments.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sin pagos registrados
            </p>
          </div>
        ) : (
          sortedPayments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3 px-5 hover:bg-muted/30 transition-colors"
            >
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center">
                <ArrowDownIcon className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-foreground">
                  {booking.customer?.name ?? "Cliente"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {p.method}
                  {p.date && (
                    <>
                      {" · "}
                      {format(new Date(p.date), "dd-MM-yy")}
                    </>
                  )}
                </p>
              </div>
              <span className="text-[14px] font-medium text-foreground tabular-nums shrink-0">
                {formatCurrency(p.amount, currency)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground transition-colors"
                  >
                    <MoreVerticalIcon className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl p-1">
                  <DropdownMenuItem
                    onClick={() => onEditPayment(p.id)}
                    className="cursor-pointer gap-2"
                  >
                    <PencilIcon className="size-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeletePayment(p.id)}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2Icon className="size-4" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "items", label: "Items" },
  { id: "archivos", label: "Archivos" },
  { id: "pagos", label: "Pagos" },
];

const ActionItem = ({
  icon,
  label,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-40",
      className,
    )}
  >
    <span className="flex size-5 items-center justify-center">{icon}</span>
    {label}
  </button>
);

interface BookingDetailsPageProps {
  bookingId: string;
}

export const BookingDetailsPage = ({ bookingId }: BookingDetailsPageProps) => {
  const { handleCancel } = useDetailPageNavigation("/bookings");
  const { data: booking } = useSuspenseBooking(bookingId);
  const updateBooking = useUpdateBooking();
  const updateCustomer = useUpdateCustomer();
  const removeBooking = useRemoveBooking();
  const removePayment = useRemovePayment(bookingId);
  const { invalidateBooking } = useBookingInvalidation();
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency ?? "USD";
  const taxCountry = getTaxCountryFromOrgCountry(currentOrg?.country) ?? null;

  useBookingRealtime(bookingId);

  const [tab, setTab] = useState<Tab>("resumen");
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [changeDateOpen, setChangeDateOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [confirmDateOpen, setConfirmDateOpen] = useState(false);
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const totalPaid = useMemo(
    () =>
      (booking?.payments ?? [])
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),
    [booking?.payments],
  );

  const balance = (booking?.total ?? 0) - totalPaid;

  const taxLabel = useMemo(
    () =>
      booking?.bookable
        ? getBookableTaxLabel(booking.bookable, taxCountry)
        : "IVA",
    [booking?.bookable, taxCountry],
  );

  const editingPayment = useMemo(() => {
    if (!editingPaymentId) return undefined;
    const p = booking?.payments.find((p) => p.id === editingPaymentId);
    if (!p) return undefined;
    return {
      amount: p.amount,
      method: p.method ?? paymentMethods[0].value,
      date: p.date ? new Date(p.date) : null,
      notes: p.notes ?? null,
    };
  }, [editingPaymentId, booking?.payments]);

  const debouncedNotesChange = useDebounce((notes: string) => {
    if (!booking?.id) return;
    updateBooking.mutate(
      { id: booking.id, notes: notes || undefined },
      { onSuccess: () => invalidateBooking(booking.id) },
    );
  }, 500);

  const debouncedCustomerChange = useDebounce(
    (field: string, value: string) => {
      if (!booking?.customer?.id) return;
      updateCustomer.mutate(
        { id: booking.customer.id, [field]: value || null },
        { onSuccess: () => invalidateBooking(booking.id) },
      );
    },
    500,
  );

  const handleCustomerChange = useCallback(
    (field: string, value: string) => debouncedCustomerChange(field, value),
    [debouncedCustomerChange],
  );

  const handleStatusChange = useCallback(
    async (status: BookingStatusValue) => {
      if (!booking?.id) return;
      await updateBooking.mutateAsync({ id: booking.id, status });
      invalidateBooking(booking.id);
    },
    [booking?.id, updateBooking, invalidateBooking],
  );

  const handleCustomFieldChange = useCallback(
    async (key: string, value: string) => {
      if (!booking?.id) return;
      const existing =
        booking.customFields &&
        typeof booking.customFields === "object" &&
        !Array.isArray(booking.customFields)
          ? (booking.customFields as Record<string, string>)
          : {};
      await updateBooking.mutateAsync({
        id: booking.id,
        customFields: { ...existing, [key]: value },
      });
      invalidateBooking(booking.id);
    },
    [booking?.id, booking?.customFields, updateBooking, invalidateBooking],
  );

  const handleNotesChange = useCallback(
    (notes: string) => debouncedNotesChange(notes),
    [debouncedNotesChange],
  );

  const handleDeletePayment = useCallback(
    (id: string) => {
      removePayment.mutate({ id });
    },
    [removePayment],
  );

  const handleArchive = useCallback(async () => {
    if (!booking?.id) return;
    await removeBooking.mutateAsync({ id: booking.id });
    handleCancel();
  }, [booking?.id, removeBooking, handleCancel]);

  const handleDateChange = useCallback(
    async (newStart: Date, newEnd: Date | null) => {
      if (!booking?.id) return;
      await updateBooking.mutateAsync({
        id: booking.id,
        startTime: newStart,
        ...(newEnd ? { endTime: newEnd } : {}),
      });
      invalidateBooking(booking.id);
    },
    [booking?.id, updateBooking, invalidateBooking],
  );

  const isApproved = booking?.status === "approved";

  const startTime = booking?.startTime ? new Date(booking.startTime) : null;
  const endTime = booking?.endTime ? new Date(booking.endTime) : null;
  const duration =
    startTime && endTime ? formatBookingDuration(startTime, endTime) : null;
  const timeRange =
    startTime && endTime
      ? `${formatTime(startTime)} - ${formatTime(endTime)}`
      : null;

  if (!booking) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="h-1 w-10 rounded-full bg-foreground/20" />
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
            >
              <MoreVerticalIcon className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="rounded-2xl p-1 min-w-52"
            title="Acciones"
          >
            <ActionItem
              icon="💬"
              label="Enviar a WhatsApp"
              onClick={() => {
                setActionsOpen(false);
                toast.info("Próximamente");
              }}
            />
            <ActionItem
              icon="💳"
              label="Agregar pago"
              onClick={() => {
                setActionsOpen(false);
                setEditingPaymentId(null);
                setPaymentFormOpen(true);
              }}
            />
            <div className="h-px bg-border my-1" />
            <ActionItem
              icon={<CopyIcon className="size-4" />}
              label="Copiar ID"
              onClick={() => {
                setActionsOpen(false);
                navigator.clipboard.writeText(bookingId);
                toast.success("ID copiado");
              }}
            />
            <ActionItem
              icon="🔗"
              label="Generar link de pago"
              onClick={() => {
                setActionsOpen(false);
                toast.info("Próximamente");
              }}
            />
            <ActionItem icon="📄" label="Generar Factura" disabled />
            <div className="h-px bg-border my-1" />
            <ActionItem
              icon={<Trash2Icon className="size-4 text-destructive" />}
              label="Archivar"
              className="text-destructive"
              onClick={() => {
                setActionsOpen(false);
                setArchiveConfirmOpen(true);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="flex items-start gap-4 px-5 pt-3 pb-5">
          {startTime && (
            <Popover open={changeDateOpen} onOpenChange={setChangeDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 transition-opacity hover:opacity-70 active:opacity-50"
                >
                  <BookingDateBadge date={startTime} size="lg" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" title="Cambiar fecha">
                <Calendar
                  mode="single"
                  selected={startTime}
                  defaultMonth={startTime}
                  onSelect={(date) => {
                    if (!date) return;
                    setPendingDate(date);
                    setChangeDateOpen(false);
                    setConfirmDateOpen(true);
                  }}
                />
              </PopoverContent>
            </Popover>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[26px] font-bold text-foreground leading-tight truncate">
              {booking.customer?.name ?? "—"}
            </p>
            <p className="text-[14px] text-muted-foreground truncate">
              {booking.bookable?.title ?? "—"}
            </p>
            {timeRange && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {timeRange}
                {duration && (
                  <span className="text-muted-foreground/60">
                    {" "}
                    | {duration}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setApprovalConfirmOpen(true)}
            className="shrink-0 mt-0.5"
          >
            <HeartIcon
              className={cn(
                "size-6 transition-colors",
                isApproved
                  ? "fill-rose-500 text-rose-500"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex items-start max-w-lg border-t border-none border-border/40 mb-1">
          {[
            { label: "Abono", value: totalPaid },
            { label: "Saldo", value: balance },
            { label: "Total", value: booking.total ?? 0 },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 flex items-stretch min-w-[180px]">
              {i > 0 && <div className="w-px bg-border/40 self-stretch" />}
              <div className="flex-1 flex flex-col items-start gap-0.5 px-4 py-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-[16px] font-semibold text-foreground tabular-nums leading-tight">
                  {formatCurrency(stat.value, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Pills
          items={TABS}
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className="overflow-x-auto scrollbar-none px-4 py-3 border-b border-border/40"
        />

        {/* Tab content */}
        {tab === "resumen" && (
          <ResumenTab
            booking={booking}
            onCustomerChange={handleCustomerChange}
            onStatusChange={handleStatusChange}
            onCustomFieldChange={handleCustomFieldChange}
            onNotesChange={handleNotesChange}
            isSaving={updateBooking.isPending || updateCustomer.isPending}
          />
        )}
        {tab === "items" && <ItemsTab booking={booking} currency={currency} />}
        {tab === "archivos" && <ArchivosTab />}
        {tab === "pagos" && (
          <PagosTab
            booking={booking}
            currency={currency}
            taxLabel={taxLabel}
            onAddPayment={() => {
              setEditingPaymentId(null);
              setPaymentFormOpen(true);
            }}
            onEditPayment={(id) => {
              setEditingPaymentId(id);
              setPaymentFormOpen(true);
            }}
            onDeletePayment={handleDeletePayment}
          />
        )}
      </div>

      {/* Confirm date change dialog */}
      <Dialog
        open={confirmDateOpen}
        onOpenChange={(v) => {
          setConfirmDateOpen(v);
          if (!v) setPendingDate(null);
        }}
      >
        <DialogContent
          title="Cambiar fecha"
          onConfirm={async () => {
            if (!pendingDate || !startTime) return;
            const durationMs = endTime
              ? endTime.getTime() - startTime.getTime()
              : 0;
            const newStart = new Date(
              Date.UTC(
                pendingDate.getFullYear(),
                pendingDate.getMonth(),
                pendingDate.getDate(),
                startTime.getUTCHours(),
                startTime.getUTCMinutes(),
                startTime.getUTCSeconds(),
              ),
            );
            const newEnd =
              durationMs > 0 ? new Date(newStart.getTime() + durationMs) : null;
            await handleDateChange(newStart, newEnd);
            setConfirmDateOpen(false);
            setPendingDate(null);
          }}
          confirmDisabled={updateBooking.isPending}
          className="max-w-sm rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle>Cambiar fecha</DialogTitle>
            <DialogDescription>
              ¿Cambiar la fecha de <strong>{booking.customer?.name}</strong> del{" "}
              <strong>
                {startTime ? format(startTime, "d 'de' MMMM") : ""}
              </strong>{" "}
              al{" "}
              <strong>
                {pendingDate ? format(pendingDate, "d 'de' MMMM") : ""}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setConfirmDateOpen(false);
                setPendingDate(null);
              }}
              className="flex-1 py-3 rounded-xl border border-border text-[14px] font-medium text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!pendingDate || !startTime) return;
                const durationMs = endTime
                  ? endTime.getTime() - startTime.getTime()
                  : 0;
                const newStart = new Date(
                  Date.UTC(
                    pendingDate.getFullYear(),
                    pendingDate.getMonth(),
                    pendingDate.getDate(),
                    startTime.getUTCHours(),
                    startTime.getUTCMinutes(),
                    startTime.getUTCSeconds(),
                  ),
                );
                const newEnd =
                  durationMs > 0
                    ? new Date(newStart.getTime() + durationMs)
                    : null;
                await handleDateChange(newStart, newEnd);
                setConfirmDateOpen(false);
                setPendingDate(null);
              }}
              disabled={updateBooking.isPending}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold transition-opacity disabled:opacity-50"
            >
              {updateBooking.isPending ? "Guardando…" : "Cambiar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm approval dialog */}
      <Dialog open={approvalConfirmOpen} onOpenChange={setApprovalConfirmOpen}>
        <DialogContent
          title={isApproved ? "Quitar aprobación" : "Aprobar reserva"}
          onConfirm={async () => {
            await handleStatusChange(isApproved ? "pending" : "approved");
            setApprovalConfirmOpen(false);
          }}
          confirmDisabled={updateBooking.isPending}
          className="max-w-sm rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle>
              {isApproved ? "Quitar aprobación" : "Aprobar reserva"}
            </DialogTitle>
            <DialogDescription>
              {isApproved
                ? `¿Cambiar el estado de ${booking.customer?.name} a Pendiente?`
                : `¿Aprobar la reserva de ${booking.customer?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setApprovalConfirmOpen(false)}
              className="flex-1 py-3 rounded-xl border border-border text-[14px] font-medium text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleStatusChange(isApproved ? "pending" : "approved");
                setApprovalConfirmOpen(false);
              }}
              disabled={updateBooking.isPending}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold transition-opacity disabled:opacity-50"
            >
              {updateBooking.isPending ? "Guardando…" : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment form drawer */}
      <PaymentFormDrawer
        bookingId={bookingId}
        open={paymentFormOpen}
        onOpenChange={(v) => {
          setPaymentFormOpen(v);
          if (!v) setEditingPaymentId(null);
        }}
        editingPaymentId={editingPaymentId}
        initialData={editingPayment}
      />

      {/* Archive confirm drawer */}
      <Drawer open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DrawerContent>
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground"
              >
                <XIcon className="size-5" />
              </button>
            </DrawerClose>
            <DrawerTitle className="text-[15px] font-semibold">
              Archivar reserva
            </DrawerTitle>
            <div className="size-10" />
          </div>
          <DrawerDescription className="sr-only">
            Confirmar archivado
          </DrawerDescription>
          <div className="px-5 pb-safe-or-6 flex flex-col gap-4">
            <p className="text-sm text-center text-muted-foreground">
              Esta acción eliminará la reserva. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex-1 py-3.5 rounded-2xl border border-border text-[14px] font-medium text-foreground"
                >
                  Cancelar
                </button>
              </DrawerClose>
              <button
                type="button"
                onClick={handleArchive}
                disabled={removeBooking.isPending}
                className="flex-1 py-3.5 rounded-2xl bg-destructive text-destructive-foreground text-[14px] font-semibold transition-opacity disabled:opacity-50"
              >
                {removeBooking.isPending ? "Archivando…" : "Archivar"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

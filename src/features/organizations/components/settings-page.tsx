"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { countries } from "country-data-list";
import {
  BanknoteIcon,
  ChevronsUpDownIcon,
  Building2Icon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  GlobeIcon,
  HashIcon,
  ListIcon,
  LogOutIcon,
  MoonIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  ToggleLeftIcon,
  TypeIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  type Country,
  CountryDropdown,
} from "@/components/ui/country-dropdown";
import { CurrencySelect } from "@/components/ui/currency-select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CustomFieldDialog } from "@/features/custom-fields/components/custom-field-dialog";
import { useSuspenseCustomFields, useReorderCustomFields } from "@/features/custom-fields/hooks/use-custom-fields";
import { CustomFieldDisplayLocation, CustomFieldType } from "@/generated/prisma";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  useCurrentOrganization,
  useSuspenseOrganizations,
  useUpdateOrganizationName,
  useUpdateOrganizationSettings,
} from "../hooks/use-organizations";
import { MemberList } from "./member-list";
import type { OrgRole } from "../utils/roles";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | "general"
  | "campos"
  | "equipo"
  | "facturacion"
  | "documentos";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "campos", label: "Variables", icon: ListIcon },
  { id: "equipo", label: "Equipo", icon: UsersIcon },
  { id: "facturacion", label: "Facturación", icon: CreditCardIcon },
  { id: "documentos", label: "Documentos", icon: FileTextIcon },
];

// ─── Form schema (same as OrganizationSettingsView) ──────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  country: z.string().min(1, "El país es requerido"),
  currency: z.string().min(1, "La moneda es requerida"),
  timezone: z.string().optional(),
  weekStart: z.enum(["monday", "sunday"]).optional(),
  dateTimeFormat: z.enum(["12", "24"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Settings row (mobile) ────────────────────────────────────────────────────

function SettingsRow({
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
        <p className="truncate text-[15px] leading-snug text-foreground">
          {value || "—"}
        </p>
      </div>
      {onClick && (
        <PencilIcon className="size-3 shrink-0 text-muted-foreground/30" />
      )}
    </button>
  );
}

// ─── Settings field (desktop) ─────────────────────────────────────────────────

function DesktopField({
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
    <div
      className={cn(
        "flex items-center gap-4 py-3.5",
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
        {children}
      </div>
    </div>
  );
}

function DesktopPickerRow({
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
  return (
    <div
      className={cn(
        "relative flex items-center gap-4 py-3.5",
        !last && "border-b border-border/40",
        disabled ? "opacity-50" : "cursor-pointer",
      )}
    >
      <div className="pointer-events-none flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
        {icon}
      </div>
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="mb-1.5 text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-[15px] leading-snug text-foreground">
          {valueDisplay || "—"}
        </p>
      </div>
      <PencilIcon className="pointer-events-none size-3 shrink-0 text-muted-foreground/30" />
      <div className="absolute inset-0 [&>button]:absolute [&>button]:inset-0 [&>button]:h-full [&>button]:w-full [&>button]:cursor-pointer [&>button]:opacity-0 [&>button]:disabled:cursor-default">
        {children}
      </div>
    </div>
  );
}

function DesktopToggleRow({
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
        <p className="truncate text-[15px] leading-snug text-foreground">
          {valueDisplay}
        </p>
      </div>
      <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

// ─── PanelGeneral ─────────────────────────────────────────────────────────────

type EditField =
  | "name"
  | "country"
  | "currency"
  | "timezone"
  | "weekStart"
  | "dateTimeFormat";

const FIELD_LABELS: Record<EditField, string> = {
  name: "Nombre",
  country: "País",
  currency: "Moneda",
  timezone: "Zona horaria",
  weekStart: "Inicio de semana",
  dateTimeFormat: "Formato de hora",
};

const WEEK_START_OPTIONS = [
  { value: "monday" as const, label: "Lunes" },
  { value: "sunday" as const, label: "Domingo" },
];

const DATE_FORMAT_OPTIONS = [
  { value: "12" as const, label: "12 horas (AM/PM)" },
  { value: "24" as const, label: "24 horas" },
];

const PanelGeneral = memo(() => {
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const updateName = useUpdateOrganizationName();
  const updateSettings = useUpdateOrganizationSettings();

  const currentMembership = memberships.find(
    (m) => m.organization.id === currentOrgId,
  );
  const currentOrg = currentMembership?.organization;
  const currentRole = currentMembership?.role as OrgRole | undefined;
  const canEdit = currentRole === "owner" || currentRole === "admin";

  const availableCountries = useMemo(
    () =>
      countries.all.filter(
        (c: Country) => c.emoji && c.status !== "deleted" && c.ioc !== "PRK",
      ),
    [],
  );

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  useEffect(() => {
    const code = currentOrg?.country ?? "USA";
    const country = availableCountries.find((c) => c.alpha3 === code);
    if (country) setSelectedCountry(country);
  }, [currentOrg?.country, availableCountries]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: currentOrg?.name ?? "",
      country: currentOrg?.country ?? "USA",
      currency: currentOrg?.currency ?? "USD",
      timezone: currentOrg?.timezone ?? "America/New_York",
      weekStart: (currentOrg?.weekStart as "monday" | "sunday") ?? "sunday",
      dateTimeFormat: (currentOrg?.dateTimeFormat as "12" | "24") ?? "24",
    },
  });

  const watchedName = form.watch("name");
  const watchedCountry = form.watch("country");
  const watchedCurrency = form.watch("currency");
  const watchedTimezone = form.watch("timezone");
  const watchedWeekStart = form.watch("weekStart");
  const watchedDateTimeFormat = form.watch("dateTimeFormat");

  useEffect(() => {
    if (!watchedCountry) return;
    const country = availableCountries.find((c) => c.alpha3 === watchedCountry);
    if (!country) return;
    setSelectedCountry(country);
    const available = [...new Set([...(country.currencies ?? []), "USD"])];
    if (!available.includes(form.getValues("currency"))) {
      form.setValue("currency", available[0] ?? "USD");
    }
  }, [watchedCountry, availableCountries, form]);

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const prevRef = useRef<FormValues | null>(null);

  const saveName = useCallback(
    (name: string) => {
      if (name && name !== currentOrg?.name) updateName.mutate({ name });
    },
    [currentOrg?.name, updateName],
  );

  const saveSettings = useCallback(
    (values: Partial<FormValues>) => {
      updateSettings.mutate({
        country: values.country,
        currency: values.currency,
        timezone: values.timezone,
        weekStart: values.weekStart,
        dateTimeFormat: values.dateTimeFormat,
      });
    },
    [updateSettings],
  );

  useEffect(() => {
    if (!currentOrgId || !canEdit) return;
    const current: FormValues = {
      name: watchedName ?? "",
      country: watchedCountry ?? "",
      currency: watchedCurrency ?? "",
      timezone: watchedTimezone,
      weekStart: watchedWeekStart,
      dateTimeFormat: watchedDateTimeFormat,
    };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!prevRef.current) {
      prevRef.current = current;
      return;
    }
    const prev = prevRef.current;
    debounceRef.current = setTimeout(() => {
      if (current.name !== prev.name) saveName(current.name);
      if (
        current.country !== prev.country ||
        current.currency !== prev.currency ||
        current.timezone !== prev.timezone ||
        current.weekStart !== prev.weekStart ||
        current.dateTimeFormat !== prev.dateTimeFormat
      ) {
        saveSettings(current);
      }
      prevRef.current = current;
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [
    watchedName,
    watchedCountry,
    watchedCurrency,
    watchedTimezone,
    watchedWeekStart,
    watchedDateTimeFormat,
    currentOrgId,
    canEdit,
    saveName,
    saveSettings,
  ]);

  const isMobile = useIsMobile();
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const openField = (field: EditField) => {
    if (field === "name") setNameDraft(form.getValues("name"));
    setEditingField(field);
  };

  const iconCls = "size-[15px] text-primary/70";

  if (!isMobile) {
    const countryName = selectedCountry?.name ?? watchedCountry ?? "—";
    const weekStartLabel = WEEK_START_OPTIONS.find((o) => o.value === watchedWeekStart)?.label ?? "—";
    const dateFormatLabel = DATE_FORMAT_OPTIONS.find((o) => o.value === watchedDateTimeFormat)?.label ?? "—";
    const tzLabel = watchedTimezone
      ? watchedTimezone.replace(/_/g, " ").replace(/\//g, " · ")
      : "—";

    return (
      <div className="flex flex-col gap-6">
        <div>
          <SectionLabel className="mb-2">Organización</SectionLabel>
          <DesktopField icon={<Building2Icon className={iconCls} />} label="Nombre">
            <input
              value={watchedName}
              onChange={(e) => form.setValue("name", e.target.value)}
              disabled={!canEdit}
              className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] appearance-none disabled:opacity-50"
            />
          </DesktopField>
          <DesktopPickerRow
            icon={<GlobeIcon className={iconCls} />}
            label="País"
            valueDisplay={countryName}
            disabled={!canEdit}
          >
            <CountryDropdown
              defaultValue={watchedCountry}
              onChange={(c) => {
                form.setValue("country", c.alpha3);
                setSelectedCountry(c);
              }}
              disabled={!canEdit}
            />
          </DesktopPickerRow>
          <DesktopPickerRow
            icon={<BanknoteIcon className={iconCls} />}
            label="Moneda"
            valueDisplay={watchedCurrency ?? "—"}
            last
            disabled={!canEdit}
          >
            <CurrencySelect
              value={watchedCurrency}
              onValueChange={(v) => form.setValue("currency", v)}
              name="currency"
              country={selectedCountry}
              placeholder="Seleccionar moneda"
              disabled={!canEdit}
            />
          </DesktopPickerRow>
        </div>
        <div>
          <SectionLabel className="mb-2">Calendario</SectionLabel>
          <DesktopPickerRow
            icon={<ClockIcon className={iconCls} />}
            label="Zona horaria"
            valueDisplay={tzLabel}
            disabled={!canEdit}
          >
            <TimezoneSelect
              value={watchedTimezone}
              onValueChange={(v) => form.setValue("timezone", v ?? "")}
              name="timezone"
              placeholder="Seleccionar zona horaria"
              disabled={!canEdit}
            />
          </DesktopPickerRow>
          <DesktopToggleRow
            icon={<CalendarIcon className={iconCls} />}
            label="Inicio de semana"
            valueDisplay={weekStartLabel}
            onClick={() =>
              canEdit &&
              form.setValue("weekStart", watchedWeekStart === "monday" ? "sunday" : "monday")
            }
          />
          <DesktopToggleRow
            icon={<SettingsIcon className={iconCls} />}
            label="Formato de hora"
            valueDisplay={dateFormatLabel}
            last
            onClick={() =>
              canEdit &&
              form.setValue("dateTimeFormat", watchedDateTimeFormat === "12" ? "24" : "12")
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <SectionLabel className="mb-2">Organización</SectionLabel>
          <SettingsRow
            icon={<Building2Icon className={iconCls} />}
            label="Nombre"
            value={watchedName}
            onClick={canEdit ? () => openField("name") : undefined}
          />
          <SettingsRow
            icon={<GlobeIcon className={iconCls} />}
            label="País"
            value={selectedCountry?.name}
            onClick={canEdit ? () => openField("country") : undefined}
          />
          <SettingsRow
            icon={<BanknoteIcon className={iconCls} />}
            label="Moneda"
            value={watchedCurrency}
            onClick={canEdit ? () => openField("currency") : undefined}
            last
          />
        </div>
        <div>
          <SectionLabel className="mb-2">Calendario</SectionLabel>
          <SettingsRow
            icon={<ClockIcon className={iconCls} />}
            label="Zona horaria"
            value={watchedTimezone}
            onClick={canEdit ? () => openField("timezone") : undefined}
          />
          <SettingsRow
            icon={<CalendarIcon className={iconCls} />}
            label="Inicio de semana"
            value={WEEK_START_OPTIONS.find((o) => o.value === watchedWeekStart)?.label}
            onClick={canEdit ? () => openField("weekStart") : undefined}
          />
          <SettingsRow
            icon={<SettingsIcon className={iconCls} />}
            label="Formato de hora"
            value={DATE_FORMAT_OPTIONS.find((o) => o.value === watchedDateTimeFormat)?.label}
            onClick={canEdit ? () => openField("dateTimeFormat") : undefined}
            last
          />
        </div>
      </div>

      <Drawer
        open={editingField !== null}
        onOpenChange={(v) => !v && setEditingField(null)}
      >
        <DrawerContent>
          <DrawerTitle className="sr-only">
            {editingField ? FIELD_LABELS[editingField] : ""}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Editar {editingField ? FIELD_LABELS[editingField] : ""}
          </DrawerDescription>
          <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            </DrawerClose>
            <span className="text-[15px] font-semibold">
              {editingField ? FIELD_LABELS[editingField] : ""}
            </span>
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <XIcon className="size-5" />
              </button>
            </DrawerClose>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto px-5 pt-2 pb-safe-or-6">
            {editingField === "name" && (
              <>
                <input
                  ref={(el) => el?.focus()}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      form.setValue("name", nameDraft);
                      setEditingField(null);
                    }
                  }}
                  className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none transition-colors focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("name", nameDraft);
                    setEditingField(null);
                  }}
                  className="w-full rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground"
                >
                  Guardar
                </button>
              </>
            )}
            {editingField === "country" && (
              <CountryDropdown
                defaultValue={watchedCountry}
                onChange={(c) => {
                  form.setValue("country", c.alpha3);
                  setSelectedCountry(c);
                  setEditingField(null);
                }}
              />
            )}
            {editingField === "currency" && (
              <CurrencySelect
                value={watchedCurrency}
                onValueChange={(v) => {
                  form.setValue("currency", v);
                  setEditingField(null);
                }}
                name="currency"
                country={selectedCountry}
                placeholder="Seleccionar moneda"
              />
            )}
            {editingField === "timezone" && (
              <TimezoneSelect
                value={watchedTimezone}
                onValueChange={(v) => {
                  form.setValue("timezone", v ?? "");
                  setEditingField(null);
                }}
                name="timezone"
                placeholder="Seleccionar zona horaria"
              />
            )}
            {(editingField === "weekStart" || editingField === "dateTimeFormat") && (
              <div className="flex flex-col gap-2">
                {(editingField === "weekStart" ? WEEK_START_OPTIONS : DATE_FORMAT_OPTIONS).map(
                  (opt) => {
                    const current =
                      editingField === "weekStart" ? watchedWeekStart : watchedDateTimeFormat;
                    const isActive = opt.value === current;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          if (editingField === "weekStart") {
                            form.setValue("weekStart", opt.value as "monday" | "sunday");
                          } else {
                            form.setValue("dateTimeFormat", opt.value as "12" | "24");
                          }
                          setEditingField(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-[15px] font-medium transition-colors",
                          isActive
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isActive ? "border-primary" : "border-muted-foreground/40",
                          )}
                        >
                          {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        {opt.label}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
});
PanelGeneral.displayName = "PanelGeneral";

// ─── Stub panels ──────────────────────────────────────────────────────────────

function StubPanel({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <Empty className="border-none py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>Próximamente</EmptyTitle>
        <EmptyDescription>
          Esta sección estará disponible pronto.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// ─── Variables list ───────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS_ES: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: "Texto",
  [CustomFieldType.TEXTAREA]: "Texto largo",
  [CustomFieldType.NUMBER]: "Número",
  [CustomFieldType.BOOLEAN]: "Sí / No",
  [CustomFieldType.DATE]: "Fecha",
  [CustomFieldType.TIME]: "Hora",
  [CustomFieldType.OPTIONS]: "Selección",
  [CustomFieldType.MULTISELECT]: "Múltiple",
};

type FieldItem = {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  enabled: boolean;
  displayLocation: CustomFieldDisplayLocation;
  options?: string[] | null;
  defaultValue?: string | null;
  placeholder?: string | null;
};

function FieldTypeIcon({ type }: { type: CustomFieldType }) {
  switch (type) {
    case CustomFieldType.TEXT:
    case CustomFieldType.TEXTAREA:
      return <TypeIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.NUMBER:
      return <HashIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.DATE:
      return <CalendarIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.BOOLEAN:
      return <ToggleLeftIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.TIME:
      return <ClockIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.OPTIONS:
    case CustomFieldType.MULTISELECT:
      return <ListIcon className="size-4 text-muted-foreground" />;
  }
}

function SortableVariableRow({
  field,
  onEdit,
}: {
  field: FieldItem;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("flex cursor-grab items-center gap-3 py-3.5 active:cursor-grabbing", isDragging && "opacity-50")}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FieldTypeIcon type={field.type} />
      </span>
      <button type="button" className="min-w-0 flex-1 truncate text-left text-[15px] text-foreground/90" onClick={onEdit}>
        {field.name}
      </button>
      {field.required && (
        <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Requerido
        </span>
      )}
      <span className="shrink-0 text-[12px] text-muted-foreground">{FIELD_TYPE_LABELS_ES[field.type]}</span>
      <ChevronRightIcon className="size-4 shrink-0 text-foreground/20" />
    </div>
  );
}

function VariablesList({ addOpen, onAddOpenChange }: { addOpen: boolean; onAddOpenChange: (v: boolean) => void }) {
  const { data: fields } = useSuspenseCustomFields();
  const reorderFields = useReorderCustomFields();
  const [editField, setEditField] = useState<FieldItem | null>(null);
  const [items, setItems] = useState<FieldItem[]>([]);

  const customerFields = useMemo(
    () => (fields as FieldItem[]).filter((f) => f.displayLocation === CustomFieldDisplayLocation.CUSTOMER),
    [fields],
  );

  useEffect(() => {
    setItems(customerFields);
  }, [customerFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((f) => f.id === active.id);
    const newIndex = items.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    reorderFields.mutate({
      fieldOrders: reordered.map((f, i) => ({ id: f.id, order: i })),
    });
  }

  return (
    <>
      {customerFields.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Sin campos</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border/40">
              {items.map((field) => (
                <SortableVariableRow
                  key={field.id}
                  field={field}
                  onEdit={() => setEditField(field)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CustomFieldDialog
        open={editField !== null}
        onOpenChange={(v) => !v && setEditField(null)}
        hideDisplayLocation
        fieldId={editField?.id}
        defaultValues={
          editField
            ? {
                name: editField.name,
                type: editField.type,
                required: editField.required,
                displayLocation: editField.displayLocation,
                options: Array.isArray(editField.options)
                  ? editField.options.join("\n")
                  : undefined,
                defaultValue: editField.defaultValue ?? undefined,
                placeholder: editField.placeholder ?? undefined,
              }
            : undefined
        }
      />

      <CustomFieldDialog
        open={addOpen}
        onOpenChange={onAddOpenChange}
        hideDisplayLocation
        defaultValues={{ displayLocation: CustomFieldDisplayLocation.CUSTOMER }}
      />
    </>
  );
}

// ─── Panel map ────────────────────────────────────────────────────────────────

function PanelContent({
  tab,
  orgId,
  role,
  addOpen,
  onAddOpenChange,
  inviteOpen,
  setInviteOpen,
}: {
  tab: Tab;
  orgId: string;
  role: OrgRole;
  addOpen: boolean;
  onAddOpenChange: (v: boolean) => void;
  inviteOpen: boolean;
  setInviteOpen: (v: boolean) => void;
}) {
  switch (tab) {
    case "general":
      return <PanelGeneral />;
    case "campos":
      return <VariablesList addOpen={addOpen} onAddOpenChange={onAddOpenChange} />;
    case "equipo":
      return <MemberList organizationId={orgId} currentRole={role} inviteOpen={inviteOpen} setInviteOpen={setInviteOpen} />;
    case "facturacion":
      return <StubPanel icon={CreditCardIcon} />;
    case "documentos":
      return <StubPanel icon={FileTextIcon} />;
  }
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionLabel({
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

function AppearanceSection({ compact = false }: { compact?: boolean }) {
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
        <span className="flex-1 text-[15px] text-foreground/90">
          Modo oscuro
        </span>
        {mounted && (
          <Switch
            checked={isDark}
            onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
          />
        )}
      </div>

      {!compact && <SectionLabel className="mt-4">Cuenta</SectionLabel>}
      <button
        type="button"
        onClick={() =>
          authClient.signOut({
            fetchOptions: { onSuccess: () => router.push("/login") },
          })
        }
        className="flex w-full items-center gap-3 py-3 px-2 rounded-lg text-left transition-colors hover:bg-muted/50 active:bg-muted"
      >
        <LogOutIcon className="size-[18px] shrink-0 text-destructive" />
        <span className="flex-1 text-[15px] text-destructive">
          Cerrar sesión
        </span>
      </button>
    </div>
  );
}

// ─── Mobile ───────────────────────────────────────────────────────────────────

function MobileSettings({
  orgName,
  orgId,
  role,
  plan,
}: {
  orgName: string;
  orgId: string;
  role: OrgRole;
  plan: string;
}) {
  const [openTab, setOpenTab] = useState<Tab | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const activeTab = TABS.find((t) => t.id === openTab);
  const canManage = role === "owner" || role === "admin";

  return (
    <>
      <div className="flex flex-col px-4 py-4">
        {/* Org profile */}
        <Link href="/select-organization" className="flex items-center gap-3 py-3 px-2 rounded-xl transition-colors hover:bg-muted/50 active:bg-muted">
          <div className="size-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Building2Icon className="size-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-semibold text-foreground leading-tight truncate">
              {orgName}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                {plan}
              </span>
            </div>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
        </Link>

        {/* Category list */}
        <div className="mt-4">
          <SectionLabel>Configuración</SectionLabel>
          <div className="mt-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOpenTab(t.id)}
                  className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted border-b border-border/30 last:border-0"
                >
                  <Icon className="size-[18px] shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[15px] text-foreground/90">
                    {t.label}
                  </span>
                  <ChevronRightIcon className="size-4 text-foreground/20 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <SectionLabel>Apariencia</SectionLabel>
          <AppearanceSection compact />
        </div>

        <p className="text-center text-[11px] text-muted-foreground/30 py-8">
          Nodebase · v1.0.0
        </p>
      </div>

      {/* Category drawer */}
      <Drawer
        open={openTab !== null}
        onOpenChange={(v) => !v && setOpenTab(null)}
      >
        <DrawerContent className="max-h-[100dvh] h-[95dvh]">
          <DrawerTitle className="sr-only">
            {activeTab?.label ?? ""}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {activeTab?.label}
          </DrawerDescription>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            </DrawerClose>
            <span className="text-[15px] font-semibold">
              {activeTab?.label ?? ""}
            </span>
            {canManage && openTab === "equipo" ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <PlusIcon className="size-5" />
              </button>
            ) : canManage && openTab === "campos" ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <PlusIcon className="size-5" />
              </button>
            ) : (
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                >
                  <XIcon className="size-5" />
                </button>
              </DrawerClose>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-safe-or-8">
            {openTab && (
              <PanelContent
                tab={openTab}
                orgId={orgId}
                role={role}
                addOpen={addOpen}
                onAddOpenChange={setAddOpen}
                inviteOpen={inviteOpen}
                setInviteOpen={setInviteOpen}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

function DesktopSettings({
  orgName,
  orgId,
  role,
  plan,
}: {
  orgName: string;
  orgId: string;
  role: OrgRole;
  plan: string;
}) {
  const [active, setActive] = useState<Tab>("general");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const canManage = role === "owner" || role === "admin";

  return (
    <div className="flex h-dvh">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r flex flex-col p-4 gap-1">
        {/* Org strip */}
        <Link href="/select-organization" className="flex items-center gap-2.5 px-2 py-3 mb-2 rounded-xl transition-colors hover:bg-muted/50 active:bg-muted">
          <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Building2Icon className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {orgName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {plan}
            </p>
          </div>
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
        </Link>

        {/* Tab buttons */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1 mt-2">
          Configuración
        </p>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t.label}
            </button>
          );
        })}

        {/* Appearance pinned to bottom */}
        <div className="mt-auto pt-4 border-t border-border/40">
          <AppearanceSection compact />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {TABS.find((t) => t.id === active)?.label}
            </h2>
            {canManage && active === "equipo" && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <PlusIcon className="size-4" />
                Invitar
              </Button>
            )}
            {canManage && active === "campos" && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <PlusIcon className="size-4" />
                Nuevo
              </Button>
            )}
          </div>
          <PanelContent
            tab={active}
            orgId={orgId}
            role={role}
            addOpen={addOpen}
            onAddOpenChange={setAddOpen}
            inviteOpen={inviteOpen}
            setInviteOpen={setInviteOpen}
          />
        </div>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export const SettingsPage = memo(() => {
  const isMobile = useIsMobile();
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const { hasActiveSubscription } = useHasActiveSubscription();

  const membership = memberships.find(
    (m) => m.organization.id === currentOrgId,
  );
  const org = membership?.organization;
  const role = (membership?.role ?? "readonly") as OrgRole;
  const plan = hasActiveSubscription ? "Pro" : "Free";

  if (!org || !currentOrgId) return null;

  if (isMobile) {
    return (
      <MobileSettings orgName={org.name} orgId={currentOrgId} role={role} plan={plan} />
    );
  }

  return (
    <DesktopSettings orgName={org.name} orgId={currentOrgId} role={role} plan={plan} />
  );
});
SettingsPage.displayName = "SettingsPage";

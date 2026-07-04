"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BanknoteIcon,
  Building2Icon,
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  GlobeIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
import { TimezoneSelect } from "@/components/ui/timezone-select";
import {
  useCurrentOrganization,
  useSuspenseOrganizations,
  useUpdateOrganizationName,
  useUpdateOrganizationSettings,
} from "../../hooks/use-organizations";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { countries } from "country-data-list";
import {
  DATE_FORMAT_OPTIONS,
  FIELD_LABELS,
  type EditField,
  type FormValues,
  WEEK_START_OPTIONS,
  formSchema,
} from "./types";
import {
  DesktopField,
  DesktopPickerRow,
  DesktopToggleRow,
  SectionLabel,
  SettingsRow,
} from "./primitives";

export const PanelGeneral = memo(() => {
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const updateName = useUpdateOrganizationName();
  const updateSettings = useUpdateOrganizationSettings();

  const currentMembership = memberships.find((m) => m.organization.id === currentOrgId);
  const currentOrg = currentMembership?.organization;
  const currentRole = currentMembership?.role as string | undefined;
  const canEdit = currentRole === "owner" || currentRole === "admin";

  const availableCountries = useMemo(
    () => countries.all.filter((c: Country) => c.emoji && c.status !== "deleted" && c.ioc !== "PRK"),
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
              className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] appearance-none"
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
              onChange={(c) => { form.setValue("country", c.alpha3); setSelectedCountry(c); }}
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
              canEdit && form.setValue("weekStart", watchedWeekStart === "monday" ? "sunday" : "monday")
            }
          />
          <DesktopToggleRow
            icon={<SettingsIcon className={iconCls} />}
            label="Formato de hora"
            valueDisplay={dateFormatLabel}
            last
            onClick={() =>
              canEdit && form.setValue("dateTimeFormat", watchedDateTimeFormat === "12" ? "24" : "12")
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

      <Drawer open={editingField !== null} onOpenChange={(v) => !v && setEditingField(null)}>
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
                    if (e.key === "Enter") { form.setValue("name", nameDraft); setEditingField(null); }
                  }}
                  className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none transition-colors focus:border-primary/50"
                />
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => { form.setValue("name", nameDraft); setEditingField(null); }}
                >
                  Guardar
                </Button>
              </>
            )}
            {editingField === "country" && (
              <CountryDropdown
                defaultValue={watchedCountry}
                onChange={(c) => { form.setValue("country", c.alpha3); setSelectedCountry(c); setEditingField(null); }}
              />
            )}
            {editingField === "currency" && (
              <CurrencySelect
                value={watchedCurrency}
                onValueChange={(v) => { form.setValue("currency", v); setEditingField(null); }}
                name="currency"
                country={selectedCountry}
                placeholder="Seleccionar moneda"
              />
            )}
            {editingField === "timezone" && (
              <TimezoneSelect
                value={watchedTimezone}
                onValueChange={(v) => { form.setValue("timezone", v ?? ""); setEditingField(null); }}
                name="timezone"
                placeholder="Seleccionar zona horaria"
              />
            )}
            {(editingField === "weekStart" || editingField === "dateTimeFormat") && (
              <div className="flex flex-col gap-2">
                {(editingField === "weekStart" ? WEEK_START_OPTIONS : DATE_FORMAT_OPTIONS).map((opt) => {
                  const current = editingField === "weekStart" ? watchedWeekStart : watchedDateTimeFormat;
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
                })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
});
PanelGeneral.displayName = "PanelGeneral";

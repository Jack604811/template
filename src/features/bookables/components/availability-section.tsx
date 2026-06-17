"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  CalendarXIcon,
  PlusIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Calendar } from "@/components/ui/calendar";
import { FormField } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";
import {
  DAYS,
  DURATION_UNITS_SLOT,
  durationUnitLabels,
} from "../lib/schemas";
import type { BookableFormValues } from "../lib/schemas";
import {
  FormRow,
  iconCls,
  numberInputCls,
  selectTriggerCls,
} from "./bookable-form-row";

interface AvailabilitySectionProps {
  form: UseFormReturn<BookableFormValues>;
  timeOptions: Array<{ label: string; value: string }>;
  dateTimeFormat?: "12" | "24";
}

const DEFAULT_RANGE = { startTime: "09:00", endTime: "17:00" } as const;

export const AvailabilitySection = ({
  form,
  timeOptions: _timeOptions,
  dateTimeFormat = "24",
}: AvailabilitySectionProps) => {
  const [blockedDatePopoverOpen, setBlockedDatePopoverOpen] = useState(false);
  const { fields: availabilityFields } = useFieldArray({
    control: form.control,
    name: "availability",
  });

  return (
    <div className="divide-y divide-border/40">
      {/* Duración */}
      <div className="pb-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Duración de la reserva
        </p>
        <FormField
          control={form.control}
          name="durationValue"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<TimerIcon className={iconCls} />}
              label="Duración"
              tooltip="Tiempo total que dura esta reserva"
              last
              error={fieldState.error?.message}
            >
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  className={`${numberInputCls} w-12`}
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value, 10) || 1)
                  }
                />
                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field: unitField }) => (
                    <Select
                      onValueChange={unitField.onChange}
                      value={unitField.value}
                    >
                      <SelectTrigger className={selectTriggerCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_UNITS_SLOT.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {durationUnitLabels[unit]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </FormRow>
          )}
        />
      </div>

      {/* Horario de atención */}
      <div className="py-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Horario de atención
        </p>
        <div>
          {availabilityFields.map((field, dayIndex) => (
            <DayRangesRow
              key={field.id}
              form={form}
              dayIndex={dayIndex}
              dayLabel={DAYS[dayIndex] ?? field.day}
              dateTimeFormat={dateTimeFormat}
              last={dayIndex === availabilityFields.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Días bloqueados */}
      <div className="pt-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Días bloqueados
        </p>
        <FormField
          control={form.control}
          name="blockedDates"
          render={({ field }) => (
            <div>
              <FormRow
                icon={<CalendarIcon className={iconCls} />}
                label="Bloquear fecha"
                tooltip="Fechas específicas en las que no se aceptarán reservas"
              >
                <div className="flex items-center gap-3">
                  <Popover
                    open={blockedDatePopoverOpen}
                    onOpenChange={setBlockedDatePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex-1 cursor-pointer bg-transparent p-0 text-left text-[15px] leading-snug text-foreground outline-none"
                      >
                        <span className="text-muted-foreground/40">
                          Seleccionar fecha
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        onSelect={(date) => {
                          setBlockedDatePopoverOpen(false);
                          if (!date) return;
                          const dateStr = format(date, "yyyy-MM-dd");
                          const existing = form.getValues("blockedDates") ?? [];
                          if (existing.includes(dateStr)) return;
                          form.setValue(
                            "blockedDates",
                            [...existing, dateStr].sort(),
                            { shouldDirty: true, shouldTouch: true },
                          );
                        }}
                        disabled={(date) =>
                          (field.value ?? []).includes(
                            format(date, "yyyy-MM-dd"),
                          )
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </FormRow>
              {(field.value ?? []).length > 0 && (
                <div>
                  {(field.value ?? []).map((dateStr, index) => (
                    <div
                      key={dateStr}
                      className="flex items-center gap-4 border-b border-border/40 px-5 py-3.5 last:border-b-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted/30">
                        <CalendarXIcon className={iconCls} />
                      </div>
                      <span className="flex-1 text-[15px] leading-snug text-foreground">
                        {format(parseISO(dateStr), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current =
                            form.getValues("blockedDates") ?? [];
                          form.setValue(
                            "blockedDates",
                            current.filter((_, i) => i !== index),
                            { shouldDirty: true, shouldTouch: true },
                          );
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Eliminar fecha bloqueada"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
};

function DeleteRangeButton({ onDelete }: { onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onDelete}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
      style={{
        color: hovered ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground) / 0.4)",
        backgroundColor: hovered ? "hsl(var(--destructive) / 0.12)" : "transparent",
      }}
      aria-label="Eliminar rango"
    >
      <Trash2Icon className="size-3.5" />
    </button>
  );
}

interface DayRangesRowProps {
  form: UseFormReturn<BookableFormValues>;
  dayIndex: number;
  dayLabel: string;
  dateTimeFormat: "12" | "24";
  last?: boolean;
}

function DayRangesRow({
  form,
  dayIndex,
  dayLabel,
  dateTimeFormat,
  last = false,
}: DayRangesRowProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: `availability.${dayIndex}.ranges`,
  });

  const isEnabled = fields.length > 0;

  return (
    <div
      className={`flex items-start gap-1.5 py-3 px-5 ${!last ? "border-b border-border/40" : ""}`}
    >
      <div className="flex w-[192px] flex-col gap-2">
        <span
          className={`text-[15px] leading-snug ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}
        >
          {dayLabel}
        </span>
        {isEnabled &&
          fields.map((rangeField, rangeIndex) => (
            <div key={rangeField.id} className="flex items-center gap-2">
              <FormField
                control={form.control}
                name={`availability.${dayIndex}.ranges.${rangeIndex}.startTime`}
                render={({ field }) => (
                  <TimeInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    dateTimeFormat={dateTimeFormat}

                    className="w-[90px] min-w-[104px]"
                  />
                )}
              />
              <span className="text-sm text-muted-foreground">a</span>
              <FormField
                control={form.control}
                name={`availability.${dayIndex}.ranges.${rangeIndex}.endTime`}
                render={({ field }) => (
                  <TimeInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    dateTimeFormat={dateTimeFormat}

                    className="w-[90px] min-w-[104px]"
                  />
                )}
              />
              {fields.length > 1 && (
                <DeleteRangeButton onDelete={() => remove(rangeIndex)} />
              )}
            </div>
          ))}
        {isEnabled && (
          <button
            type="button"
            onClick={() => append(DEFAULT_RANGE)}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Agregar rango de horario"
          >
            <PlusIcon className="size-3.5" />
            Nuevo
          </button>
        )}
      </div>
      <div className="flex flex-col items-center pt-0.5">
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => {
            if (checked) append(DEFAULT_RANGE);
            else replace([]);
          }}
        />
      </div>
    </div>
  );
}

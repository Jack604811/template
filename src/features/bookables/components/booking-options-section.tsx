"use client";

import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  Users2Icon,
  ZapIcon,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAX_ADVANCE_UNITS,
  maxAdvanceUnitLabels,
  MIN_ADVANCE_UNITS,
  minAdvanceUnitLabels,
} from "../lib/schemas";
import type { BookableFormValues } from "../lib/schemas";
import {
  FormRow,
  SwitchRow,
  iconCls,
  numberInputCls,
  selectTriggerCls,
} from "./bookable-form-row";

interface BookingOptionsSectionProps {
  form: UseFormReturn<BookableFormValues>;
}

export const BookingOptionsSection = ({ form }: BookingOptionsSectionProps) => {
  const allowMultipleGuests = form.watch("allowMultipleGuests");

  return (
    <div className="divide-y divide-border/40">
      {/* Ventana de reserva */}
      <div className="pb-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Ventana de reserva
        </p>
        <FormField
          control={form.control}
          name="minAdvanceValue"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<ClockIcon className={iconCls} />}
              label="Aviso mínimo"
              tooltip="Tiempo mínimo entre que se hace la reserva y cuando ocurre"
              error={fieldState.error?.message}
            >
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  className={`${numberInputCls} w-12`}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                />
                <FormField
                  control={form.control}
                  name="minAdvanceUnit"
                  render={({ field: unitField }) => (
                    <Select
                      onValueChange={unitField.onChange}
                      value={unitField.value ?? "HOURS"}
                    >
                      <SelectTrigger className={selectTriggerCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MIN_ADVANCE_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {minAdvanceUnitLabels[unit]}
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
        <FormField
          control={form.control}
          name="maxAdvanceValue"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<CalendarIcon className={iconCls} />}
              label="Reserva máxima anticipada"
              tooltip="Con cuánta anticipación pueden reservar los clientes"
              last
              error={fieldState.error?.message}
            >
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  placeholder="—"
                  className={`${numberInputCls} w-12`}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                />
                <FormField
                  control={form.control}
                  name="maxAdvanceUnit"
                  render={({ field: unitField }) => (
                    <Select
                      onValueChange={unitField.onChange}
                      value={unitField.value ?? "DAYS"}
                    >
                      <SelectTrigger className={selectTriggerCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAX_ADVANCE_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {maxAdvanceUnitLabels[unit]}
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

      {/* Capacidad */}
      <div className="pt-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Capacidad
        </p>
        <FormField
          control={form.control}
          name="allowMultipleGuests"
          render={({ field }) => (
            <SwitchRow
              icon={<Users2Icon className={iconCls} />}
              label="Permitir múltiples clientes"
              tooltip="Activa para permitir que grupos reserven juntos"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        {allowMultipleGuests && (
          <>
            <FormField
              control={form.control}
              name="minGuests"
              render={({ field, fieldState }) => (
                <FormRow
                  icon={<UserIcon className={iconCls} />}
                  label="Mínimo de clientes"
                  tooltip="Número mínimo de personas para confirmar la reserva"
                  error={fieldState.error?.message}
                >
                  <input
                    type="number"
                    min={0}
                    className={`${numberInputCls} w-16`}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      )
                    }
                  />
                </FormRow>
              )}
            />
            <FormField
              control={form.control}
              name="maxGuestsPerBooking"
              render={({ field, fieldState }) => (
                <FormRow
                  icon={<Users2Icon className={iconCls} />}
                  label="Máximo de clientes por reserva"
                  tooltip="Límite de personas que pueden asistir en una sola reserva"
                  error={fieldState.error?.message}
                >
                  <input
                    type="number"
                    min={1}
                    className={`${numberInputCls} w-16`}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      )
                    }
                  />
                </FormRow>
              )}
            />
          </>
        )}
        <FormField
          control={form.control}
          name="units"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<ZapIcon className={iconCls} />}
              label="Reservas simultáneas máximas"
              tooltip="Cuántas reservas pueden ocurrir al mismo tiempo para este servicio"
              last
              error={fieldState.error?.message}
            >
              <input
                type="number"
                min={1}
                className={`${numberInputCls} w-16`}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? parseInt(e.target.value, 10) : 1,
                  )
                }
              />
            </FormRow>
          )}
        />
      </div>
    </div>
  );
};

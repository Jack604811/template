"use client";

import {
  BanknoteIcon,
  CreditCardIcon,
  EyeOffIcon,
  FileTextIcon,
  HashIcon,
  LinkIcon,
  LockIcon,
  PercentIcon,
  ReceiptIcon,
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
import { TaxType } from "@/generated/prisma";
import { formatNumberWithPeriods, parseFormattedNumber } from "@/lib/utils";
import type { BookableFormValues } from "../lib/schemas";
import {
  FormRow,
  SwitchRow,
  iconCls,
  inputCls,
  numberInputCls,
  selectTriggerCls,
} from "./bookable-form-row";

interface AdvanceSectionProps {
  form: UseFormReturn<BookableFormValues>;
  availableTaxes: Array<{
    id: string;
    label: string;
    value: number;
    type: string;
    country: string;
  }>;
  currency: string;
}

export const AdvanceSection = ({
  form,
  availableTaxes,
  currency,
}: AdvanceSectionProps) => {
  const requirePayment = form.watch("requirePayment");
  const requireDeposit = form.watch("requireDeposit");
  const taxOption = form.watch("taxOption");
  const customTaxType = form.watch("customTaxType");
  const showCustomTaxInput = taxOption === "custom";

  return (
    <div className="divide-y divide-border/40">
      {/* Configuración de pago */}
      <div className="pb-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Configuración de pago
        </p>

        <FormField
          control={form.control}
          name="requirePayment"
          render={({ field }) => (
            <SwitchRow
              icon={<CreditCardIcon className={iconCls} />}
              label="Requiere pago"
              tooltip="Los clientes deberán pagar al momento de realizar la reserva"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />

        {requirePayment && (
          <>
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field, fieldState }) => (
                <FormRow
                  icon={<BanknoteIcon className={iconCls} />}
                  label="Precio"
                  tooltip="Precio base del servicio sin incluir impuestos"
                  error={fieldState.error?.message}
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[13px] text-muted-foreground">
                      {currency}
                    </span>
                    <input
                      type="text"
                      className={inputCls}
                      value={
                        field.value
                          ? formatNumberWithPeriods(
                              Math.round(field.value).toString(),
                            )
                          : ""
                      }
                      onChange={(e) => {
                        const formatted = formatNumberWithPeriods(
                          e.target.value,
                        );
                        const parsed = parseFormattedNumber(formatted);
                        field.onChange(parsed ?? 0);
                      }}
                    />
                  </div>
                </FormRow>
              )}
            />
            <FormField
              control={form.control}
              name="taxOption"
              render={({ field, fieldState }) => (
                <FormRow
                  icon={<ReceiptIcon className={iconCls} />}
                  label="Impuesto"
                  tooltip="Impuesto que se aplicará al precio base"
                  error={fieldState.error?.message}
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclude">Sin impuesto</SelectItem>
                      <SelectItem value="custom">
                        Tarifa de servicio personalizada
                      </SelectItem>
                      {availableTaxes.map((tax) => (
                        <SelectItem key={tax.id} value={tax.id}>
                          {tax.label} - {tax.value}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              )}
            />
            {showCustomTaxInput && (
              <>
                <FormField
                  control={form.control}
                  name="customTaxType"
                  render={({ field, fieldState }) => (
                    <FormRow
                      icon={<PercentIcon className={iconCls} />}
                      label="Tipo de impuesto"
                      tooltip="Porcentaje sobre el precio o monto fijo"
                      error={fieldState.error?.message}
                    >
                      <Select
                        onValueChange={(v) => field.onChange(v as TaxType)}
                        value={field.value}
                      >
                        <SelectTrigger className={selectTriggerCls}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TaxType.PERCENTAGE}>
                            Porcentaje
                          </SelectItem>
                          <SelectItem value={TaxType.FIXED}>Fijo</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customTaxValue"
                  render={({ field, fieldState }) => (
                    <FormRow
                      icon={<HashIcon className={iconCls} />}
                      label="Valor"
                      tooltip="Valor del impuesto personalizado"
                      error={fieldState.error?.message}
                    >
                      <input
                        type="text"
                        className={inputCls}
                        value={
                          field.value
                            ? formatNumberWithPeriods(
                                customTaxType === TaxType.PERCENTAGE
                                  ? field.value.toString()
                                  : Math.round(field.value).toString(),
                              )
                            : ""
                        }
                        onChange={(e) => {
                          const formatted = formatNumberWithPeriods(
                            e.target.value,
                          );
                          const parsed = parseFormattedNumber(formatted);
                          field.onChange(parsed ?? null);
                        }}
                      />
                    </FormRow>
                  )}
                />
              </>
            )}
          </>
        )}

        <FormField
          control={form.control}
          name="requireDeposit"
          render={({ field }) => (
            <SwitchRow
              icon={<LockIcon className={iconCls} />}
              label="Requiere depósito"
              tooltip="Cobra un adelanto al reservar y el resto al momento del servicio"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />

        {requireDeposit && (
          <FormField
            control={form.control}
            name="depositPercent"
            render={({ field, fieldState }) => (
              <FormRow
                icon={<PercentIcon className={iconCls} />}
                label="Monto del depósito (%)"
                tooltip="Porcentaje del precio total que se cobra como adelanto"
                last
                error={fieldState.error?.message}
              >
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="50"
                  className={`${numberInputCls} w-16`}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(
                      v === ""
                        ? null
                        : Math.min(100, Math.max(0, Number(v))),
                    );
                  }}
                />
              </FormRow>
            )}
          />
        )}
      </div>

      {/* Redirección al reservar */}
      <div className="py-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Redirección al reservar
        </p>
        <FormField
          control={form.control}
          name="successRedirectUrl"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<LinkIcon className={iconCls} />}
              label="URL de éxito (Opcional)"
              tooltip="Página a la que serán redirigidos los clientes tras reservar exitosamente"
              error={fieldState.error?.message}
            >
              <input
                type="url"
                className={inputCls}
                placeholder="https://tusitio.com/gracias"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormRow>
          )}
        />
        <FormField
          control={form.control}
          name="cancelRedirectUrl"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<LinkIcon className={iconCls} />}
              label="URL de cancelación (Opcional)"
              tooltip="Página a la que serán redirigidos los clientes si cancelan"
              last
              error={fieldState.error?.message}
            >
              <input
                type="url"
                className={inputCls}
                placeholder="https://tusitio.com/cancelado"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormRow>
          )}
        />
      </div>

      {/* Configuración adicional */}
      <div className="pt-6">
        <p className="mb-1 px-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Configuración adicional
        </p>
        <FormField
          control={form.control}
          name="hideBookingType"
          render={({ field }) => (
            <SwitchRow
              icon={<EyeOffIcon className={iconCls} />}
              label="Privado"
              tooltip="Oculta este servicio del catálogo público"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FormField
          control={form.control}
          name="internalNotes"
          render={({ field, fieldState }) => (
            <FormRow
              icon={<FileTextIcon className={iconCls} />}
              label="Notas internas"
              tooltip="Notas privadas visibles solo para tu equipo"
              last
              error={fieldState.error?.message}
            >
              <textarea
                className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug p-0 m-0 font-[inherit] resize-none min-h-[72px] placeholder:text-muted-foreground/40"
                placeholder="Notas privadas solo para el equipo..."
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormRow>
          )}
        />
      </div>
    </div>
  );
};

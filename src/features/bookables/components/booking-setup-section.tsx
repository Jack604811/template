"use client";

import { AlignLeftIcon, CircleDotIcon, TagIcon, TypeIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookableStatus } from "@/generated/prisma";
import type { BookableFormValues } from "../lib/schemas";
import { FormRow, iconCls, inputCls, selectTriggerCls } from "./bookable-form-row";

interface BookingSetupSectionProps {
  form: UseFormReturn<BookableFormValues>;
  collections: Array<{ id: string; name: string }>;
}

export const BookingSetupSection = ({
  form,
  collections,
}: BookingSetupSectionProps) => {
  return (
    <div>
      <FormField
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <FormRow
            icon={<TypeIcon className={iconCls} />}
            label="Nombre"
            tooltip="El nombre que verán los clientes al buscar este servicio"
            error={fieldState.error?.message}
          >
            <input
              className={inputCls}
              placeholder="ej. Sesión de tratamiento de spa"
              {...field}
            />
          </FormRow>
        )}
      />
      <FormField
        control={form.control}
        name="collectionId"
        render={({ field, fieldState }) => (
          <FormRow
            icon={<TagIcon className={iconCls} />}
            label="Categoría"
            tooltip="Agrupa este servicio con otros de la misma categoría"
            error={fieldState.error?.message}
          >
            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
              <SelectTrigger className={selectTriggerCls}>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        )}
      />
      <FormField
        control={form.control}
        name="status"
        render={({ field, fieldState }) => (
          <FormRow
            icon={<CircleDotIcon className={iconCls} />}
            label="Estado"
            tooltip="Controla si este servicio es visible para los clientes"
            error={fieldState.error?.message}
          >
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className={selectTriggerCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BookableStatus.DRAFT}>Borrador</SelectItem>
                <SelectItem value={BookableStatus.PUBLISHED}>Publicado</SelectItem>
                <SelectItem value={BookableStatus.ARCHIVED}>Archivado</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <FormRow
            icon={<AlignLeftIcon className={iconCls} />}
            label="Descripción"
            tooltip="Describe el servicio para ayudar a los clientes a tomar una decisión"
            last
            error={fieldState.error?.message}
          >
            <textarea
              className="w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-[15px] text-foreground leading-snug font-[inherit] resize-none min-h-[100px] outline-none placeholder:text-muted-foreground/40"
              placeholder="ej. Relájate y rejuvenece con nuestro tratamiento de spa premium."
              {...field}
              value={field.value ?? ""}
            />
          </FormRow>
        )}
      />
    </div>
  );
};

import {
  CreditCardIcon,
  ListIcon,
  PlugIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import z from "zod";
import { CustomFieldDisplayLocation, CustomFieldType } from "@/generated/prisma";

export type Tab = "general" | "campos" | "equipo" | "facturacion" | "mcp";

export const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "campos", label: "Variables", icon: ListIcon },
  { id: "equipo", label: "Equipo", icon: UsersIcon },
  { id: "facturacion", label: "Facturación", icon: CreditCardIcon },
  { id: "mcp", label: "MCP", icon: PlugIcon },
];

export const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  country: z.string().min(1, "El país es requerido"),
  currency: z.string().min(1, "La moneda es requerida"),
  timezone: z.string().optional(),
  weekStart: z.enum(["monday", "sunday"]).optional(),
  dateTimeFormat: z.enum(["12", "24"]).optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export type EditField =
  | "name"
  | "country"
  | "currency"
  | "timezone"
  | "weekStart"
  | "dateTimeFormat";

export const FIELD_LABELS: Record<EditField, string> = {
  name: "Nombre",
  country: "País",
  currency: "Moneda",
  timezone: "Zona horaria",
  weekStart: "Inicio de semana",
  dateTimeFormat: "Formato de hora",
};

export const WEEK_START_OPTIONS = [
  { value: "monday" as const, label: "Lunes" },
  { value: "sunday" as const, label: "Domingo" },
];

export const DATE_FORMAT_OPTIONS = [
  { value: "12" as const, label: "12 horas (AM/PM)" },
  { value: "24" as const, label: "24 horas" },
];

export const FIELD_TYPE_LABELS_ES: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: "Texto",
  [CustomFieldType.TEXTAREA]: "Texto largo",
  [CustomFieldType.NUMBER]: "Número",
  [CustomFieldType.BOOLEAN]: "Sí / No",
  [CustomFieldType.DATE]: "Fecha",
  [CustomFieldType.TIME]: "Hora",
  [CustomFieldType.OPTIONS]: "Selección",
  [CustomFieldType.MULTISELECT]: "Múltiple",
};

export type FieldItem = {
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

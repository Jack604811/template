import { CustomFieldType } from "@/generated/prisma";

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: "Texto",
  [CustomFieldType.TEXTAREA]: "Texto largo",
  [CustomFieldType.NUMBER]: "Número",
  [CustomFieldType.BOOLEAN]: "Verdadero/Falso",
  [CustomFieldType.DATE]: "Fecha",
  [CustomFieldType.TIME]: "Hora",
  [CustomFieldType.OPTIONS]: "Desplegable",
  [CustomFieldType.MULTISELECT]: "Selección múltiple",
} as const;

// Available field types for selection (excluding BOOLEAN and TIME)
export const AVAILABLE_FIELD_TYPES: CustomFieldType[] = [
  CustomFieldType.TEXT,
  CustomFieldType.TEXTAREA,
  CustomFieldType.NUMBER,
  CustomFieldType.DATE,
  CustomFieldType.MULTISELECT,
];

import { CustomFieldType } from "@/generated/prisma";

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.TEXTAREA]: "Long text",
  [CustomFieldType.NUMBER]: "Number",
  [CustomFieldType.BOOLEAN]: "True/False",
  [CustomFieldType.DATE]: "Date",
  [CustomFieldType.TIME]: "Time",
  [CustomFieldType.OPTIONS]: "Dropdown",
  [CustomFieldType.MULTISELECT]: "Multiselect",
} as const;

// Available field types for selection (excluding BOOLEAN and TIME)
export const AVAILABLE_FIELD_TYPES: CustomFieldType[] = [
  CustomFieldType.TEXT,
  CustomFieldType.TEXTAREA,
  CustomFieldType.NUMBER,
  CustomFieldType.DATE,
  CustomFieldType.OPTIONS,
  CustomFieldType.MULTISELECT,
];

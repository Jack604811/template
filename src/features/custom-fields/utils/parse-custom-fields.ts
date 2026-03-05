import type { CustomField, CustomFieldDisplayLocation } from "@/generated/prisma";
import { CustomFieldType } from "@/generated/prisma";

export interface ParsedCustomField extends Omit<CustomField, "options"> {
  options?: string[];
}

/**
 * Parses options from a custom field's options property.
 * Handles both array and JSON string formats.
 */
function parseFieldOptions(field: CustomField): string[] | undefined {
  if (
    field.type !== CustomFieldType.OPTIONS &&
    field.type !== CustomFieldType.MULTISELECT
  ) {
    return undefined;
  }

  if (!field.options) {
    return undefined;
  }

  if (Array.isArray(field.options)) {
    return field.options as string[];
  }

  if (typeof field.options === "string") {
    try {
      const parsed = JSON.parse(field.options);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // If parsing fails, return undefined
    }
  }

  return undefined;
}

/**
 * Filters and parses custom fields for a specific display location.
 * Returns sorted fields with parsed options.
 *
 * @param allFields - All custom fields from the database
 * @param displayLocation - Location to filter by (BOOKING or CUSTOMER)
 * @returns Filtered, sorted, and parsed custom fields
 */
export function parseCustomFields(
  allFields: CustomField[],
  displayLocation: CustomFieldDisplayLocation,
): ParsedCustomField[] {
  return allFields
    .filter(
      (field) =>
        field.displayLocation === displayLocation && field.enabled === true,
    )
    .sort((a, b) => a.order - b.order)
    .map((field) => ({
      ...field,
      options: parseFieldOptions(field),
    }));
}

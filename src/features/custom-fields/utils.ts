import type { Prisma } from "@/generated/prisma";

type CustomFieldValueWithField = {
  value: Prisma.JsonValue;
  field: { identifier: string };
};

type CustomFieldLike = { id: string; identifier: string };

/**
 * Converts an array of CustomFieldValue (with field) into a Record keyed by field identifier.
 * Used when returning booking or client in API so the UI receives a customFields-like object.
 */
export function customFieldValuesToRecord(
  values: CustomFieldValueWithField[],
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const { value, field } of values) {
    record[field.identifier] = value;
  }
  return record;
}

/**
 * Builds a deduplicated array of CustomFieldValue rows for a booking.
 * Keys by fieldId so at most one value per field (avoids unique constraint on bookingId + fieldId).
 */
export function buildBookingCustomFieldValuesPayload(
  customFields: Record<string, unknown>,
  fieldMap: Map<string, CustomFieldLike>,
  bookingId: string,
): { fieldId: string; bookingId: string; value: Prisma.InputJsonValue }[] {
  const byFieldId = new Map<
    string,
    { fieldId: string; bookingId: string; value: Prisma.InputJsonValue }
  >();
  for (const [identifier, value] of Object.entries(customFields)) {
    const field = fieldMap.get(identifier);
    if (!field) continue;
    byFieldId.set(field.id, {
      fieldId: field.id,
      bookingId,
      value: value as Prisma.InputJsonValue,
    });
  }
  return Array.from(byFieldId.values());
}

/**
 * Builds a deduplicated array of CustomFieldValue rows for a customer.
 * Keys by fieldId so at most one value per field (avoids unique constraint on customerId + fieldId).
 */
export function buildCustomerCustomFieldValuesPayload(
  customFields: Record<string, unknown>,
  fieldMap: Map<string, CustomFieldLike>,
  customerId: string,
): { fieldId: string; customerId: string; value: Prisma.InputJsonValue }[] {
  const byFieldId = new Map<
    string,
    { fieldId: string; customerId: string; value: Prisma.InputJsonValue }
  >();
  for (const [identifier, value] of Object.entries(customFields)) {
    const field = fieldMap.get(identifier);
    if (!field) continue;
    byFieldId.set(field.id, {
      fieldId: field.id,
      customerId,
      value: value as Prisma.InputJsonValue,
    });
  }
  return Array.from(byFieldId.values());
}

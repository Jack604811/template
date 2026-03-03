import { TaxType } from "@/generated/prisma";
import type { TaxOption } from "@/config/taxes";
import { findTaxByTypeValueAndCountry } from "@/config/taxes";

export interface BookableTaxInput {
  taxType: string | null;
  taxValue: number | null;
}

/**
 * Computes tax amount from a bookable's tax configuration applied to a subtotal.
 * Subtotal is typically basePrice + upsellsTotal.
 *
 * @param bookable - Bookable (or subset) with taxType and taxValue
 * @param subtotal - Amount to apply tax to (e.g. basePrice + upsellsTotal)
 * @returns Tax amount (>= 0). Returns 0 if bookable has no tax config.
 */
export function computeBookableTax(
  bookable: BookableTaxInput,
  subtotal: number,
): number {
  const { taxType, taxValue } = bookable;
  if (taxType == null || taxValue == null) {
    return 0;
  }
  if (subtotal <= 0) {
    return 0;
  }
  if (taxType === TaxType.PERCENTAGE) {
    return Math.round(subtotal * (taxValue / 100) * 100) / 100;
  }
  if (taxType === TaxType.FIXED) {
    return Math.max(0, taxValue);
  }
  return 0;
}

/**
 * Returns the display label for a bookable's tax (e.g. "IVA 19%").
 * When taxCountry is provided, uses the predefined tax for that country so the correct label (e.g. IVA for Colombia) is shown instead of another country's (e.g. Sales Tax).
 * Otherwise uses first match by type+value. Falls back to "Tax (19%)" or "Tax" when no predefined match.
 */
export function getBookableTaxLabel(
  bookable: BookableTaxInput,
  taxCountry?: TaxOption["country"] | null,
): string {
  const { taxType, taxValue } = bookable;
  if (taxType == null || taxValue == null) {
    return "Tax";
  }
  const predefined = findTaxByTypeValueAndCountry(
    taxType as "PERCENTAGE" | "FIXED",
    taxValue,
    taxCountry ?? undefined,
  );
  if (predefined) {
    if (predefined.type === "PERCENTAGE") {
      return `${predefined.label} ${predefined.value}%`;
    }
    return predefined.label;
  }
  if (taxType === TaxType.PERCENTAGE) {
    return `Tax (${taxValue}%)`;
  }
  return "Tax";
}

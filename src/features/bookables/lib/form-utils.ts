import { BookableStatus, TaxType } from "@/generated/prisma";
import type {
  DurationUnit,
  MaxAdvanceUnit,
  MinAdvanceUnit,
  Prisma,
} from "@/generated/prisma";
import { PREDEFINED_TAXES, findTaxByTypeValueAndCountry } from "@/config/taxes";
import type { TaxOption } from "@/config/taxes";
import { countries } from "country-data-list";
import { DAYS, type BookableFormValues } from "./schemas";

/**
 * Map organization country code (alpha3) to tax country name
 */
export const getTaxCountryFromOrgCountry = (
  countryCode: string | null | undefined
): TaxOption["country"] | null => {
  if (!countryCode) return null;

  const country = countries.all.find((c) => c.alpha3 === countryCode);
  if (!country?.name) return null;

  const specialCases: Record<string, TaxOption["country"]> = {
    "United States": "USA",
  };

  if (specialCases[country.name]) {
    return specialCases[country.name];
  }

  const taxCountryNames: TaxOption["country"][] = [
    "Canada", "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras",
    "Nicaragua", "Costa Rica", "Panama", "Cuba", "Jamaica", "Haiti",
    "Dominican Republic", "Trinidad and Tobago", "Barbados", "Bahamas",
    "Colombia", "Venezuela", "Guyana", "Suriname", "Brazil", "Ecuador",
    "Peru", "Bolivia", "Paraguay", "Uruguay", "Argentina", "Chile",
    "United Kingdom", "Ireland", "France", "Germany", "Italy", "Spain",
    "Portugal", "Netherlands", "Belgium", "Luxembourg", "Austria",
    "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Iceland",
    "Poland", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria",
    "Croatia", "Slovenia", "Greece", "Cyprus", "Malta", "Estonia", "Latvia",
    "Lithuania", "Aruba", "Curaçao", "Puerto Rico",
  ];

  if (taxCountryNames.includes(country.name as TaxOption["country"])) {
    return country.name as TaxOption["country"];
  }

  return null;
};

/**
 * Type guard to check if value is a valid availability array
 */
const isValidAvailability = (
  value: Prisma.JsonValue | null | undefined
): value is Array<{ day: string; ranges: Array<{ startTime: string; endTime: string }> }> => {
  // Explicitly check for null or undefined (not falsy values like empty arrays)
  if (value === null || value === undefined) return false;
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "day" in item &&
      typeof item.day === "string" &&
      "ranges" in item &&
      Array.isArray(item.ranges) &&
      item.ranges.every(
        (range) =>
          typeof range === "object" &&
          range !== null &&
          "startTime" in range &&
          typeof range.startTime === "string" &&
          "endTime" in range &&
          typeof range.endTime === "string"
      )
  );
};

const VALID_BOOKABLE_STATUSES: BookableStatus[] = [
  BookableStatus.DRAFT,
  BookableStatus.PUBLISHED,
  BookableStatus.ARCHIVED,
];

/**
 * Normalize API status to a valid BookableStatus enum value
 */
const normalizeStatus = (status: string | null | undefined): BookableStatus => {
  if (status && VALID_BOOKABLE_STATUSES.includes(status as BookableStatus)) {
    return status as BookableStatus;
  }
  return BookableStatus.DRAFT;
};

/**
 * Round tax value for stable lookup (avoids float mismatch with predefined taxes)
 */
const roundTaxValue = (value: number): number =>
  Math.round(value * 100) / 100;

/**
 * Convert bookable data to form values.
 * @param data - Bookable from API
 * @param taxCountry - Organization's tax country (e.g. "Colombia") so the correct predefined tax label (e.g. IVA 19%) is used instead of another country's (e.g. Sales Tax)
 */
export const bookableToFormValues = (
  data: {
    title: string | null;
    description?: string | null;
    collectionId?: string | null;
    basePrice: number | null;
    units: number | null;
    allowMultipleGuests?: boolean | null;
    minGuests?: number | null;
    maxGuestsPerBooking?: number | null;
    status: string | null;
    durationValue: number | null;
    durationUnit: string;
    minAdvanceValue?: number | null;
    minAdvanceUnit?: string | null;
    maxAdvanceValue?: number | null;
    maxAdvanceUnit?: string | null;
    taxType: string | null;
    taxValue: number | null;
    images: unknown;
    priceTiers: unknown;
    blockedDates: unknown;
    availability?: Prisma.JsonValue | null;
    startTime?: string | null;
    endTime?: string | null;
    bufferMinutes?: number | null;
    allowMultipleDays?: boolean | null;
    requirePayment?: boolean | null;
    requireDeposit?: boolean | null;
    depositPercent?: number | null;
    successRedirectUrl?: string | null;
    cancelRedirectUrl?: string | null;
    hideBookingType?: boolean | null;
    internalNotes?: string | null;
  },
  taxCountry?: TaxOption["country"] | null,
): BookableFormValues => {
  const parsedAvailability = isValidAvailability(data.availability)
    ? data.availability
    : [];
  // Normalize to 7 entries (one per day in DAYS order) for availability-by-day UI
  const availabilityByDay = DAYS.map((day) => {
    const existing = parsedAvailability.find((a) => a.day === day);
    return existing ?? { day, ranges: [] as Array<{ startTime: string; endTime: string }> };
  });

  const hasTax = data.taxType != null && data.taxValue != null;
  const rawTaxValue = data.taxValue ?? 0;
  const roundedTaxValue = hasTax ? roundTaxValue(rawTaxValue) : null;
  const predefinedTax =
    hasTax &&
    roundedTaxValue != null &&
    roundedTaxValue >= 0
      ? findTaxByTypeValueAndCountry(
          data.taxType as "PERCENTAGE" | "FIXED",
          roundedTaxValue,
          taxCountry ?? null,
        )
      : undefined;

  return {
    title: data.title || "",
    description: data.description ?? null,
    collectionId: data.collectionId ?? null,
    basePrice: data.basePrice ?? 0,
    units: data.units ?? 1,
    allowMultipleGuests: data.allowMultipleGuests ?? false,
    minGuests: data.minGuests ?? 1,
    maxGuestsPerBooking: data.maxGuestsPerBooking ?? 4,
    status: normalizeStatus(data.status),
    durationValue: data.durationValue || 1,
    durationUnit: (data.durationUnit as "MINUTES" | "HOURS" | "DAYS" | "NIGHTS") || "HOURS",
    minAdvanceValue: data.minAdvanceValue ?? null,
    minAdvanceUnit: (data.minAdvanceUnit as "MINUTES" | "HOURS" | "DAYS") ?? "HOURS",
    maxAdvanceValue: data.maxAdvanceValue ?? null,
    maxAdvanceUnit: (data.maxAdvanceUnit as "DAYS" | "WEEKS") ?? "DAYS",
    taxOption: predefinedTax ? predefinedTax.id : hasTax ? "custom" : "exclude",
    customTaxType: predefinedTax
      ? TaxType.PERCENTAGE
      : (data.taxType as TaxType) || TaxType.PERCENTAGE,
    customTaxValue: predefinedTax ? null : (roundedTaxValue ?? null),
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    priceTiers: Array.isArray(data.priceTiers)
      ? (data.priceTiers as Array<{ name: string; price: number }>)
      : null,
    blockedDates: Array.isArray(data.blockedDates) ? (data.blockedDates as string[]) : [],
    availability: availabilityByDay,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    bufferValue: data.bufferMinutes != null && data.bufferMinutes >= 60 && data.bufferMinutes % 60 === 0
      ? data.bufferMinutes / 60
      : (data.bufferMinutes ?? 0),
    bufferUnit: data.bufferMinutes != null && data.bufferMinutes >= 60 && data.bufferMinutes % 60 === 0
      ? ("HOURS" as const)
      : ("MINUTES" as const),
    allowMultipleDays: data.allowMultipleDays ?? false,
    requirePayment: data.requirePayment ?? false,
    requireDeposit: data.requireDeposit ?? false,
    depositPercent: data.depositPercent ?? null,
    successRedirectUrl: data.successRedirectUrl ?? null,
    cancelRedirectUrl: data.cancelRedirectUrl ?? null,
    hideBookingType: data.hideBookingType ?? false,
    internalNotes: data.internalNotes ?? null,
  };
};

/**
 * Convert form values to bookable mutation input
 */
export const formValuesToBookableInput = (values: BookableFormValues): {
  title: string;
  description?: string | null;
  collectionId?: string | null;
  basePrice: number;
  units: number;
  allowMultipleGuests?: boolean;
  minGuests?: number | null;
  maxGuestsPerBooking?: number | null;
  status: BookableStatus;
  durationValue: number;
  durationUnit: DurationUnit;
  minAdvanceValue?: number | null;
  minAdvanceUnit?: MinAdvanceUnit | null;
  maxAdvanceValue?: number | null;
  maxAdvanceUnit?: MaxAdvanceUnit | null;
  taxType?: TaxType;
  taxValue?: number;
  images: string[];
  priceTiers?: Array<{ name: string; price: number }>;
  blockedDates: string[];
  availability?: Array<{ day: string; ranges: Array<{ startTime: string; endTime: string }> }>;
  startTime?: string | null;
  endTime?: string | null;
  bufferMinutes?: number | null;
  allowMultipleDays?: boolean;
  requirePayment?: boolean;
  requireDeposit?: boolean;
  depositPercent?: number | null;
  successRedirectUrl?: string | null;
  cancelRedirectUrl?: string | null;
  hideBookingType?: boolean;
  internalNotes?: string | null;
} => {
  const bufferMinutes =
    values.bufferUnit === "HOURS"
      ? Math.round((values.bufferValue ?? 0) * 60)
      : Math.round(values.bufferValue ?? 0);

  let taxType: TaxType | null = null;
  let taxValue: number | null = null;

  if (values.taxOption === "exclude") {
    taxType = null;
    taxValue = null;
  } else if (values.taxOption === "custom") {
    taxType = values.customTaxType ?? null;
    taxValue = values.customTaxValue ?? null;
  } else {
    const predefinedTax = PREDEFINED_TAXES.find((tax) => tax.id === values.taxOption);
    if (predefinedTax) {
      taxType = predefinedTax.type as TaxType;
      taxValue = predefinedTax.value;
    }
  }

  return {
    title: values.title,
    description: values.description ?? undefined,
    collectionId: values.collectionId ?? undefined,
    basePrice: values.basePrice,
    units: values.units,
    allowMultipleGuests: values.allowMultipleGuests ?? undefined,
    minGuests: values.minGuests ?? undefined,
    maxGuestsPerBooking: values.maxGuestsPerBooking ?? undefined,
    status: values.status as BookableStatus,
    durationValue: values.durationValue,
    durationUnit: values.durationUnit as DurationUnit,
    minAdvanceValue: values.minAdvanceValue ?? undefined,
    minAdvanceUnit: (values.minAdvanceUnit as MinAdvanceUnit) ?? undefined,
    maxAdvanceValue: values.maxAdvanceValue ?? undefined,
    maxAdvanceUnit: (values.maxAdvanceUnit as MaxAdvanceUnit) ?? undefined,
    taxType: taxType ?? undefined,
    taxValue: taxValue ?? undefined,
    images: values.images,
    priceTiers: values.priceTiers ?? undefined,
    blockedDates: values.blockedDates,
    availability: values.availability ?? undefined,
    startTime: values.startTime ?? undefined,
    endTime: values.endTime ?? undefined,
    bufferMinutes,
    allowMultipleDays: values.allowMultipleDays ?? undefined,
    requirePayment: values.requirePayment ?? undefined,
    requireDeposit: values.requireDeposit ?? undefined,
    depositPercent: values.depositPercent ?? undefined,
    successRedirectUrl: values.successRedirectUrl ?? undefined,
    cancelRedirectUrl: values.cancelRedirectUrl ?? undefined,
    hideBookingType: values.hideBookingType ?? undefined,
    internalNotes: values.internalNotes ?? undefined,
  };
};

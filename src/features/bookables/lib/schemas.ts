import z from "zod";
import { BookableStatus, DurationUnit, TaxType } from "@/generated/prisma";

const availabilityRangeSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
}).refine(
  (data) => {
    const [startHours, startMinutes] = data.startTime.split(":").map(Number);
    const [endHours, endMinutes] = data.endTime.split(":").map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    return endTotal > startTotal;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

const availabilitySchema = z.array(
  z.object({
    day: z.string().min(1, "Day is required"),
    ranges: z.array(availabilityRangeSchema),
  })
).optional().nullable();

const timeStringSchema = z.string().regex(/^\d{1,2}:\d{2}$/, "Use HH:mm format");

export const bookableFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    collectionId: z.string().optional().nullable(),
    basePrice: z.number().min(0, "Base price must be 0 or greater"),
    units: z.number().min(1, "Units must be at least 1"),
    allowMultipleGuests: z.boolean().default(false),
    minGuests: z.number().min(0).optional().nullable(),
    maxGuestsPerBooking: z.number().min(1).optional().nullable(),
    status: z.nativeEnum(BookableStatus),
    durationValue: z.number().min(1, "Duration value must be at least 1"),
    durationUnit: z.nativeEnum(DurationUnit),
    minAdvanceValue: z.number().min(0).optional().nullable(),
    minAdvanceUnit: z.enum(["MINUTES", "HOURS", "DAYS"]).default("HOURS"),
    maxAdvanceValue: z.number().min(1).optional().nullable(),
    maxAdvanceUnit: z.enum(["DAYS", "WEEKS"]).default("DAYS"),
    taxOption: z.string(),
    customTaxType: z.nativeEnum(TaxType),
    customTaxValue: z.number().min(0).optional().nullable(),
    images: z.array(z.string()),
    priceTiers: z
      .array(
        z.object({
          name: z.string(),
          price: z.number(),
        }),
      )
      .optional()
      .nullable(),
    blockedDates: z.array(z.string()),
    availability: availabilitySchema,
    startTime: timeStringSchema.optional().nullable(),
    endTime: timeStringSchema.optional().nullable(),
    bufferValue: z.number().min(0).default(0),
    bufferUnit: z.nativeEnum(DurationUnit).default(DurationUnit.MINUTES),
    allowMultipleDays: z.boolean().default(false),
    // Advance section
    requirePayment: z.boolean().default(false),
    requireDeposit: z.boolean().default(false),
    depositPercent: z.number().min(0).max(100).optional().nullable(),
    successRedirectUrl: z
      .union([z.string().url("Enter a valid URL"), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    cancelRedirectUrl: z
      .union([z.string().url("Enter a valid URL"), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    // Additional settings
    hideBookingType: z.boolean().default(false),
    internalNotes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      return eh * 60 + em > sh * 60 + sm;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type BookableFormValues = z.infer<typeof bookableFormSchema>;

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const statusLabels: Record<BookableStatus, string> = {
  [BookableStatus.DRAFT]: "Draft",
  [BookableStatus.PUBLISHED]: "Published",
  [BookableStatus.ARCHIVED]: "Archived",
};

export const durationUnitLabels: Record<DurationUnit, string> = {
  [DurationUnit.MINUTES]: "Minutos",
  [DurationUnit.HOURS]: "Horas",
  [DurationUnit.DAYS]: "Días",
  [DurationUnit.NIGHTS]: "Noches",
};

/** Duration units shown in the booking duration dropdown. */
export const DURATION_UNITS_SLOT: DurationUnit[] = [
  DurationUnit.MINUTES,
  DurationUnit.HOURS,
  DurationUnit.DAYS,
  DurationUnit.NIGHTS,
];

export type MinAdvanceUnit = "MINUTES" | "HOURS" | "DAYS";
export type MaxAdvanceUnit = "DAYS" | "WEEKS";

export const MIN_ADVANCE_UNITS: MinAdvanceUnit[] = ["MINUTES", "HOURS", "DAYS"];
export const MAX_ADVANCE_UNITS: MaxAdvanceUnit[] = ["DAYS", "WEEKS"];

export const minAdvanceUnitLabels: Record<MinAdvanceUnit, string> = {
  MINUTES: "Minutos",
  HOURS: "Horas",
  DAYS: "Días",
};

export const maxAdvanceUnitLabels: Record<MaxAdvanceUnit, string> = {
  DAYS: "Días",
  WEEKS: "Semanas",
};

export const tooltipContent = {
  title: "Enter the name of your bookable item that will be displayed to users",
  basePrice: "Set the base price for this bookable item",
  units: "The total number of units available for booking",
  status: "Set whether the bookable is draft, published, or archived",
  duration: "Specify how long the bookable will last",
  minAdvanceBooking: "Minimum hours in advance before booking is allowed",
  maxAdvanceBooking: "Maximum days in advance that bookings can be made",
  tax: "Select a tax option or exclude taxes",
  availability: "Set availability by day with multiple time ranges",
  operatingWindow: "Time window when this service can be booked (e.g. 1pm–11pm)",
  bufferBetweenBookings: "Gap in minutes between back-to-back bookings",
  allowMultipleDays: "Let customers book across multiple days (e.g. hotel stay)",
} as const;

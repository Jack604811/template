import { BookableStatus, type DurationUnit } from "@/generated/prisma";

/**
 * Format duration value and unit into a human-readable string (singular when value is 1).
 */
export function formatDuration(value: number, unit: DurationUnit): string {
  const unitLabels: Record<DurationUnit, string> = {
    MINUTES: value === 1 ? "minute" : "minutes",
    HOURS: value === 1 ? "hour" : "hours",
    DAYS: value === 1 ? "day" : "days",
    NIGHTS: value === 1 ? "night" : "nights",
  };
  return `${value} ${unitLabels[unit] ?? unit.toLowerCase()}`;
}

/**
 * Get status label for a bookable status
 */
export function getStatusLabel(status: BookableStatus): string {
  const statusLabels: Record<BookableStatus, string> = {
    [BookableStatus.DRAFT]: "Draft",
    [BookableStatus.PUBLISHED]: "Published",
    [BookableStatus.ARCHIVED]: "Archived",
  };
  return statusLabels[status] || status;
}

/**
 * Get status color classes for a bookable status
 */
export function getStatusColor(status: BookableStatus): string {
  switch (status) {
    case BookableStatus.PUBLISHED:
      return "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20";
    case BookableStatus.DRAFT:
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20";
    case BookableStatus.ARCHIVED:
      return "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted/80";
  }
}

/**
 * Format bookable images array to extract the first image URL
 */
export function formatBookableImage(images: unknown): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  const firstImage = images[0];
  if (typeof firstImage === "string") {
    return firstImage;
  }
  if (typeof firstImage === "object" && firstImage !== null && "url" in firstImage) {
    return typeof firstImage.url === "string" ? firstImage.url : null;
  }
  return null;
}


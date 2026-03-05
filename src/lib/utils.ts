import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Booking-specific utilities
export function formatPrice(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function formatNumberWithPeriods(value: string): string {
  const cleanValue = value.replace(/\D/g, "")
  if (!cleanValue) return ""
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function getTodayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes + durationHours * 60
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`
}

export function parseFormattedNumber(value: string): number {
  const cleanValue = value.replace(/\D/g, "")
  return cleanValue ? Number.parseFloat(cleanValue) : 0
}

import type { BookingStatus } from "./types"

export interface StatusConfig {
  value: BookingStatus
  label: string
  color: string
  textColor: string
  hoverColor: string
  circleColor: string
}

export const BOOKING_STATUSES: StatusConfig[] = [
  {
    value: "pending",
    label: "Pending",
    color: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
    hoverColor: "hover:bg-gray-200 dark:hover:bg-gray-700",
    circleColor: "bg-gray-500",
  },
  {
    value: "approved",
    label: "Approved",
    color: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    hoverColor: "hover:bg-emerald-200 dark:hover:bg-emerald-900/50",
    circleColor: "bg-emerald-500",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    hoverColor: "hover:bg-blue-200 dark:hover:bg-blue-900/50",
    circleColor: "bg-blue-500",
  },
  {
    value: "canceled",
    label: "Canceled",
    color: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    hoverColor: "hover:bg-red-200 dark:hover:bg-red-900/50",
    circleColor: "bg-red-500",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-violet-100 dark:bg-violet-900/30",
    textColor: "text-violet-700 dark:text-violet-400",
    hoverColor: "hover:bg-violet-200 dark:hover:bg-violet-900/50",
    circleColor: "bg-violet-500",
  },
]

export function getStatusConfig(status?: BookingStatus): StatusConfig {
  return BOOKING_STATUSES.find((s) => s.value === status) || BOOKING_STATUSES[0]
}

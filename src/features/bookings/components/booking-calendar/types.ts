export type CalendarView = "month" | "week" | "day" | "agenda"

export type BookingStatus = "pending" | "approved" | "in_progress" | "canceled" | "completed"

export interface CalendarBooking {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: BookingColor
  location?: string
  status?: BookingStatus
  createdAt?: Date
}

export type BookingColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange"

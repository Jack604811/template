import type React from "react";

export type BookingStatus = "pending" | "approved" | "in_progress" | "canceled" | "completed";

export interface Payment {
  id: number | string;
  method: string;
  amount: number;
  date: string;
  status: "completed" | "pending";
  type: string;
}

export interface Bookable {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  isMultiDay: boolean;
}

export interface CustomFields {
  multiDay: Record<string, string>;
  singleDay: Record<string, string>;
}

export interface Upsell {
  id: number | string;
  name: string;
  description: string;
  price: number;
  status: "confirmed" | "pending";
  icon: React.ComponentType<{ className?: string }>;
}

export interface TimelineEvent {
  id: number | string;
  title: string;
  description: string;
  date: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "pending" | "upcoming";
}

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarBooking {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: BookingColor;
  location?: string;
  status?: BookingStatus;
  createdAt?: Date;
}

export type CalendarEvent = CalendarBooking;

export type BookingColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange";

export type EventColor = BookingColor;


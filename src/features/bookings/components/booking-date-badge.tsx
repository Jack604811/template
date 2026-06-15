"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { capitalize } from "@/lib/format-utils";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { w: number; h: number; day: number; num: number; mon: number; r: string }> = {
  sm: { w: 40, h: 50, day: 8,  num: 16, mon: 8,  r: "rounded-lg" },
  md: { w: 50, h: 62, day: 10, num: 20, mon: 10, r: "rounded-lg" },
  lg: { w: 60, h: 72, day: 10, num: 24, mon: 10, r: "rounded-xl" },
};

export function BookingDateBadge({ date, size = "md" }: { date: Date; size?: Size }) {
  const s = SIZES[size];
  return (
    <div
      style={{ width: s.w, height: s.h, minWidth: s.w, minHeight: s.h }}
      className={`${s.r} bg-muted/30 border border-border/60 flex flex-col items-center justify-center gap-0.5`}
    >
      <span style={{ fontSize: s.day, lineHeight: 1 }} className="text-muted-foreground font-medium">
        {capitalize(format(date, "EEE", { locale: es }))}
      </span>
      <span style={{ fontSize: s.num, lineHeight: 1, fontWeight: 700 }} className="text-foreground">
        {format(date, "dd")}
      </span>
      <span style={{ fontSize: s.mon, lineHeight: 1 }} className="text-muted-foreground font-medium">
        {capitalize(format(date, "MMM", { locale: es }))}
      </span>
    </div>
  );
}

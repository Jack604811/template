"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** "12" for 12-hour with AM/PM, "24" for 24-hour */
  dateTimeFormat?: "12" | "24";
  className?: string;
  disabled?: boolean;
}

/** Parse HH:mm to 12h hour (1-12), minute (0-59), amPm */
function parseHHmmTo12h(hhmm: string): { hour12: number; minute: number; amPm: "am" | "pm" } {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm)) {
    return { hour12: 9, minute: 0, amPm: "am" };
  }
  const [h, m] = hhmm.split(":").map(Number);
  const hour24 = Math.min(23, Math.max(0, h ?? 0));
  const minute = Math.min(59, Math.max(0, m ?? 0));
  const hour12 = hour24 % 12 || 12;
  const amPm = hour24 < 12 ? "am" : "pm";
  return { hour12, minute, amPm };
}

/** Build HH:mm from 12h hour, minute, amPm */
function buildHHmm(hour12: number, minute: number, amPm: "am" | "pm"): string {
  let hour24 = hour12;
  if (amPm === "pm" && hour12 !== 12) hour24 = hour12 + 12;
  if (amPm === "am" && hour12 === 12) hour24 = 0;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimeInput({
  value,
  onChange,
  dateTimeFormat = "24",
  className,
  disabled,
}: TimeInputProps) {
  const is12h = dateTimeFormat === "12";
  const parsed12h = useMemo(
    () => parseHHmmTo12h(value || "09:00"),
    [value],
  );
  const { hour12, minute, amPm } = parsed12h;

  const parsed24h = useMemo(() => {
    if (!/^\d{1,2}:\d{2}$/.test(value || "")) return { hour24: 9, minute: 0 };
    const [h, m] = (value || "09:00").split(":").map(Number);
    return {
      hour24: Math.min(23, Math.max(0, h ?? 0)),
      minute: Math.min(59, Math.max(0, m ?? 0)),
    };
  }, [value]);

  const pad = (n: number) => String(n).padStart(2, "0");

  const sharedInputCls =
    "h-7 w-8 border-0 bg-transparent p-0 text-center shadow-none focus-visible:ring-0";

  const wrapperCls = cn(
    "border-input flex h-9 w-full min-w-0 items-center gap-0.5 rounded-md border bg-transparent px-2 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
    disabled && "pointer-events-none opacity-50",
    className,
  );

  // 24h: text inputs to preserve leading zeros
  if (!is12h) {
    return (
      <div className={wrapperCls}>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={pad(parsed24h.hour24)}
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            if (Number.isNaN(v)) return;
            const h = Math.min(23, Math.max(0, v));
            onChange(`${pad(h)}:${pad(parsed24h.minute)}`);
          }}
          disabled={disabled}
          className={sharedInputCls}
          aria-label="Hour"
        />
        <span className="text-muted-foreground text-sm">:</span>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={pad(parsed24h.minute)}
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            if (Number.isNaN(v)) return;
            const m = Math.min(59, Math.max(0, v));
            onChange(`${pad(parsed24h.hour24)}:${pad(m)}`);
          }}
          disabled={disabled}
          className={sharedInputCls}
          aria-label="Minute"
        />
      </div>
    );
  }

  // 12h: text inputs + AM/PM select
  const handle12hChange = (
    nextHour: number,
    nextMinute: number,
    nextAmPm: "am" | "pm",
  ) => {
    const h = Math.min(12, Math.max(1, nextHour));
    const m = Math.min(59, Math.max(0, nextMinute));
    onChange(buildHHmm(h, m, nextAmPm));
  };

  return (
    <div className={wrapperCls}>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={pad(hour12)}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(v)) return;
          handle12hChange(v, minute, amPm);
        }}
        disabled={disabled}
        className={sharedInputCls}
        aria-label="Hour"
      />
      <span className="text-muted-foreground text-sm">:</span>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={pad(minute)}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(v)) return;
          handle12hChange(hour12, v, amPm);
        }}
        disabled={disabled}
        className={sharedInputCls}
        aria-label="Minute"
      />
      <Select
        value={amPm}
        onValueChange={(v: "am" | "pm") => handle12hChange(hour12, minute, v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 w-14 border-0 bg-transparent px-1 shadow-none focus:ring-0 [&>svg]:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="am">AM</SelectItem>
          <SelectItem value="pm">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

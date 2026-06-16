"use client";

import { cn } from "@/lib/utils";
import { Toggle } from "./toggle";

export interface PillItem<T extends string = string> {
  id: T;
  label: string;
}

interface PillsProps<T extends string = string> {
  items: PillItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function Pills<T extends string = string>({
  items,
  value,
  onValueChange,
  className,
}: PillsProps<T>) {
  return (
    <div className={cn("flex gap-2", className)}>
      {items.map((item) => (
        <Toggle
          key={item.id}
          pressed={value === item.id}
          onPressedChange={() => onValueChange(item.id)}
          variant="pill"
          size="sm"
          className="shrink-0"
        >
          {item.label}
        </Toggle>
      ))}
    </div>
  );
}

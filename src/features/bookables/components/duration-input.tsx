"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DurationUnit } from "@/generated/prisma";
import { cn } from "@/lib/utils";

export interface DurationInputProps {
  value: number;
  unit: DurationUnit;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: DurationUnit) => void;
  className?: string;
  disabled?: boolean;
}

const durationUnitLabels: Record<DurationUnit, string> = {
  [DurationUnit.MINUTES]: "Minutes",
  [DurationUnit.HOURS]: "Hours",
  [DurationUnit.DAYS]: "Days",
  [DurationUnit.NIGHTS]: "Nights",
};

export const DurationInput = memo(
  ({
    value,
    unit,
    onValueChange,
    onUnitChange,
    className,
    disabled,
  }: DurationInputProps) => {
    return (
      <div className={cn("flex gap-2", className)}>
        <Input
          type="number"
          min="1"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            if (!isNaN(newValue) && newValue > 0) {
              onValueChange(newValue);
            }
          }}
          disabled={disabled}
          className="w-24"
        />
        <Select
          value={unit}
          onValueChange={(newUnit) => onUnitChange(newUnit as DurationUnit)}
          disabled={disabled}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(durationUnitLabels).map(([unitValue, label]) => (
              <SelectItem key={unitValue} value={unitValue}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

DurationInput.displayName = "DurationInput";


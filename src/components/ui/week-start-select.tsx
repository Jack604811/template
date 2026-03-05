"use client";

import React, { memo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectProps } from "@radix-ui/react-select";

interface WeekStartSelectProps extends Omit<SelectProps, "onValueChange"> {
  onValueChange?: (value: "monday" | "sunday") => void;
  name: string;
  placeholder?: string;
  valid?: boolean;
  disabled?: boolean;
}

const WeekStartSelectComponent = React.forwardRef<
  HTMLButtonElement,
  WeekStartSelectProps
>(
  (
    {
      value,
      onValueChange,
      name,
      placeholder = "Select week start",
      valid = true,
      ...props
    },
    ref
  ) => {
    return (
      <Select
        value={value}
        onValueChange={onValueChange as (value: string) => void}
        disabled={props.disabled}
        {...props}
        name={name}
        data-valid={valid}
      >
        <SelectTrigger className="w-full" data-valid={valid} ref={ref}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="monday">Monday</SelectItem>
            <SelectItem value="sunday">Sunday</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
);

WeekStartSelectComponent.displayName = "WeekStartSelect";

export const WeekStartSelect = memo(WeekStartSelectComponent);


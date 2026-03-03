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

interface DateTimeFormatSelectProps
  extends Omit<SelectProps, "onValueChange"> {
  onValueChange?: (value: "12" | "24") => void;
  name: string;
  placeholder?: string;
  valid?: boolean;
  disabled?: boolean;
}

const DateTimeFormatSelectComponent = React.forwardRef<
  HTMLButtonElement,
  DateTimeFormatSelectProps
>(
  (
    {
      value,
      onValueChange,
      name,
      placeholder = "Select format",
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
            <SelectItem value="12">12-hour</SelectItem>
            <SelectItem value="24">24-hour</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
);

DateTimeFormatSelectComponent.displayName = "DateTimeFormatSelect";

export const DateTimeFormatSelect = memo(DateTimeFormatSelectComponent);


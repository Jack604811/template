"use client";

import React, { memo, useState, useCallback } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, CheckIcon } from "lucide-react";

interface TimezoneSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  name: string;
  placeholder?: string;
  disabled?: boolean;
}

// Common timezones list with City, Country (GMT+/-X:XX) format
const TIMEZONES = [
  { value: "America/New_York", label: "New York, United States (GMT-5:00)" },
  { value: "America/Chicago", label: "Chicago, United States (GMT-6:00)" },
  { value: "America/Denver", label: "Denver, United States (GMT-7:00)" },
  { value: "America/Los_Angeles", label: "Los Angeles, United States (GMT-8:00)" },
  { value: "America/Phoenix", label: "Phoenix, United States (GMT-7:00)" },
  { value: "America/Anchorage", label: "Anchorage, United States (GMT-9:00)" },
  { value: "America/Honolulu", label: "Honolulu, United States (GMT-10:00)" },
  { value: "America/Toronto", label: "Toronto, Canada (GMT-5:00)" },
  { value: "America/Vancouver", label: "Vancouver, Canada (GMT-8:00)" },
  { value: "America/Mexico_City", label: "Mexico City, Mexico (GMT-6:00)" },
  { value: "America/Bogota", label: "Bogotá, Colombia (GMT-5:00)" },
  { value: "America/Lima", label: "Lima, Peru (GMT-5:00)" },
  { value: "America/Quito", label: "Quito, Ecuador (GMT-5:00)" },
  { value: "America/Sao_Paulo", label: "São Paulo, Brazil (GMT-3:00)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires, Argentina (GMT-3:00)" },
  { value: "America/Santiago", label: "Santiago, Chile (GMT-3:00)" },
  { value: "Europe/London", label: "London, United Kingdom (GMT+0:00)" },
  { value: "Europe/Paris", label: "Paris, France (GMT+1:00)" },
  { value: "Europe/Berlin", label: "Berlin, Germany (GMT+1:00)" },
  { value: "Europe/Rome", label: "Rome, Italy (GMT+1:00)" },
  { value: "Europe/Madrid", label: "Madrid, Spain (GMT+1:00)" },
  { value: "Europe/Amsterdam", label: "Amsterdam, Netherlands (GMT+1:00)" },
  { value: "Europe/Stockholm", label: "Stockholm, Sweden (GMT+1:00)" },
  { value: "Europe/Zurich", label: "Zurich, Switzerland (GMT+1:00)" },
  { value: "Europe/Dublin", label: "Dublin, Ireland (GMT+0:00)" },
  { value: "Europe/Athens", label: "Athens, Greece (GMT+2:00)" },
  { value: "Europe/Moscow", label: "Moscow, Russia (GMT+3:00)" },
  { value: "Asia/Dubai", label: "Dubai, United Arab Emirates (GMT+4:00)" },
  { value: "Asia/Kolkata", label: "Mumbai, India (GMT+5:30)" },
  { value: "Asia/Singapore", label: "Singapore, Singapore (GMT+8:00)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong, Hong Kong (GMT+8:00)" },
  { value: "Asia/Tokyo", label: "Tokyo, Japan (GMT+9:00)" },
  { value: "Asia/Seoul", label: "Seoul, South Korea (GMT+9:00)" },
  { value: "Asia/Shanghai", label: "Shanghai, China (GMT+8:00)" },
  { value: "Asia/Bangkok", label: "Bangkok, Thailand (GMT+7:00)" },
  { value: "Asia/Jakarta", label: "Jakarta, Indonesia (GMT+7:00)" },
  { value: "Australia/Sydney", label: "Sydney, Australia (GMT+10:00)" },
  { value: "Australia/Melbourne", label: "Melbourne, Australia (GMT+10:00)" },
  { value: "Australia/Brisbane", label: "Brisbane, Australia (GMT+10:00)" },
  { value: "Australia/Perth", label: "Perth, Australia (GMT+8:00)" },
  { value: "Pacific/Auckland", label: "Auckland, New Zealand (GMT+12:00)" },
];

const TimezoneSelectComponent = React.forwardRef<
  HTMLButtonElement,
  TimezoneSelectProps
>(
  (
    {
      value,
      onValueChange,
      name,
      placeholder = "Select timezone",
      disabled = false,
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const selectedTimezone = TIMEZONES.find((tz) => tz.value === value);

    const handleSelect = useCallback(
      (timezoneValue: string) => {
        onValueChange?.(timezoneValue);
        setOpen(false);
      },
      [onValueChange]
    );

    const triggerClasses = cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          ref={ref}
          asChild
          disabled={disabled}
        >
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={triggerClasses}
            type="button"
          >
            <span className="flex-1 text-left">
              {selectedTimezone ? selectedTimezone.label : placeholder}
            </span>
            <ChevronDown size={16} className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          collisionPadding={10}
          side="bottom"
          align="start"
          alignOffset={48}
          className="min-w-[--radix-popper-anchor-width] p-0"
        >
          <Command className="w-full max-h-[200px] sm:max-h-[270px]">
            <CommandList>
              <div className="sticky top-0 z-10 bg-popover">
                <CommandInput placeholder="Search timezone..." />
              </div>
              <CommandEmpty>No timezone found.</CommandEmpty>
              <CommandGroup>
                {TIMEZONES.map((tz) => (
                  <CommandItem
                    key={tz.value}
                    value={tz.value}
                    onSelect={() => handleSelect(tz.value)}
                    className="flex items-center w-full gap-2"
                  >
                    <span className="flex-1">{tz.label}</span>
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        value === tz.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <input type="hidden" name={name} value={value || ""} />
      </Popover>
    );
  }
);

TimezoneSelectComponent.displayName = "TimezoneSelect";

export const TimezoneSelect = memo(TimezoneSelectComponent);


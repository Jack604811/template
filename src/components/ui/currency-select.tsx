"use client";

import { currencies as AllCurrencies } from "country-data-list";
import { CheckIcon, ChevronDown } from "lucide-react";
import React, { memo, useCallback, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

export interface Currency {
  code: string;
  decimals: number;
  name: string;
  number: string;
  symbol?: string;
}

export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

interface CurrencySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onCurrencySelect?: (currency: Currency) => void;
  name: string;
  placeholder?: string;
  country?: Country | null;
  valid?: boolean;
  disabled?: boolean;
}

const excludedCodes = new Set([
  "COU", "XUA", "XBA", "XBB", "XBC", "XBD", "XTS", "XXX",
]);

const CurrencySelectComponent = React.forwardRef<
  HTMLButtonElement,
  CurrencySelectProps
>(
  (
    {
      value,
      onValueChange,
      onCurrencySelect,
      placeholder = "Select currency",
      country,
      disabled = false,
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);

    const uniqueCurrencies = useMemo<Currency[]>(() => {
      const currencyMap = new Map<string, Currency>();
      const availableCodes = new Set([...(country?.currencies ?? []), "USD"]);

      for (const currency of AllCurrencies.all as Currency[]) {
        if (
          !currency.code ||
          !currency.name ||
          !currency.symbol ||
          !availableCodes.has(currency.code) ||
          excludedCodes.has(currency.code)
        )
          continue;

        const nameLower = currency.name.toLowerCase();
        if (
          nameLower.includes("unit of account") ||
          nameLower.includes("unidad de valor") ||
          nameLower.includes("bond markets unit") ||
          nameLower.includes("testing") ||
          nameLower.includes("reserved")
        )
          continue;

        currencyMap.set(currency.code, {
          code: currency.code,
          name: currency.code === "EUR" ? "Euro" : currency.name,
          symbol: currency.symbol,
          decimals: currency.decimals,
          number: currency.number,
        });
      }

      return Array.from(currencyMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }, [country]);

    const handleSelect = useCallback(
      (currency: Currency) => {
        onValueChange?.(currency.code);
        onCurrencySelect?.(currency);
        setOpen(false);
      },
      [onValueChange, onCurrencySelect]
    );

    const triggerClasses = cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger ref={ref} className={triggerClasses} disabled={disabled}>
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown size={16} />
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
                <CommandInput placeholder="Search currency..." />
              </div>
              <CommandEmpty>No currency found.</CommandEmpty>
              <CommandGroup>
                {uniqueCurrencies.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={`${currency.code} ${currency.name}`}
                    onSelect={() => handleSelect(currency)}
                    className="flex items-center gap-2"
                  >
                    <span className="w-8 shrink-0 text-sm text-muted-foreground">
                      {currency.code}
                    </span>
                    <span className="flex-1">{currency.name}</span>
                    {currency.code === value && (
                      <CheckIcon className="size-3.5 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

CurrencySelectComponent.displayName = "CurrencySelect";

export const CurrencySelect = memo(CurrencySelectComponent);

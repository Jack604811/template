"use client";

import React, { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

// data
import { currencies as AllCurrencies } from "country-data-list";

// shadcn
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// radix-ui
import type { SelectProps } from "@radix-ui/react-select";

// types
export interface Currency {
  code: string;
  decimals: number;
  name: string;
  number: string;
  symbol?: string;
}

// Country type from country-dropdown
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

interface CurrencySelectProps extends Omit<SelectProps, "onValueChange"> {
  onValueChange?: (value: string) => void;
  onCurrencySelect?: (currency: Currency) => void;
  name: string;
  placeholder?: string;
  country?: Country | null;
  valid?: boolean;
  disabled?: boolean;
}

const CurrencySelectComponent = React.forwardRef<
  HTMLButtonElement,
  CurrencySelectProps
>(
  (
    {
      value,
      onValueChange,
      onCurrencySelect,
      name,
      placeholder = "Select currency",
      country,
      valid = true,
      ...props
    },
    ref
  ) => {
    const uniqueCurrencies = useMemo<Currency[]>(() => {
      const currencyMap = new Map<string, Currency>();

      // Get country currencies + USD
      const countryCurrencyCodes = country?.currencies || [];
      const availableCodes = [...new Set([...countryCurrencyCodes, "USD"])];

      // List of investment units and non-currency units to exclude
      const excludedUnits = [
        "COU", // Unidad de Valor Real
        "XUA", // ADB Unit of Account
        "XBA", // Bond Markets Unit European Composite Unit (EURCO)
        "XBB", // Bond Markets Unit European Monetary Unit (E.M.U.-6)
        "XBC", // Bond Markets Unit European Unit of Account 9 (E.U.A.-9)
        "XBD", // Bond Markets Unit European Unit of Account 17 (E.U.A.-17)
        "XTS", // Codes specifically reserved for testing purposes
        "XXX", // The codes assigned for transactions where no currency is involved
      ];

      AllCurrencies.all.forEach((currency: Currency) => {
        if (
          currency.code &&
          currency.name &&
          currency.symbol &&
          availableCodes.includes(currency.code) &&
          !excludedUnits.includes(currency.code)
        ) {
          // Filter out investment units by checking name patterns
          const nameLower = currency.name.toLowerCase();
          const isInvestmentUnit =
            nameLower.includes("unit of account") ||
            nameLower.includes("unidad de valor") ||
            nameLower.includes("bond markets unit") ||
            nameLower.includes("testing") ||
            nameLower.includes("reserved");

          if (!isInvestmentUnit) {
            // Special handling for Euro
            if (currency.code === "EUR") {
              currencyMap.set(currency.code, {
                code: currency.code,
                name: "Euro",
                symbol: currency.symbol,
                decimals: currency.decimals,
                number: currency.number,
              });
            } else {
              currencyMap.set(currency.code, {
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                decimals: currency.decimals,
                number: currency.number,
              });
            }
          }
        }
      });

      // Convert the map to an array and sort by currency name
      return Array.from(currencyMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }, [country]);

    const handleValueChange = (newValue: string) => {
      const fullCurrencyData = uniqueCurrencies.find(
        (curr) => curr.code === newValue
      );
      if (fullCurrencyData) {
        if (onValueChange) {
          onValueChange(newValue);
        }
        if (onCurrencySelect) {
          onCurrencySelect(fullCurrencyData);
        }
      }
    };

    return (
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={props.disabled}
        {...props}
        name={name}
        data-valid={valid}
      >
        <SelectTrigger
          className={cn("w-full")}
          data-valid={valid}
          ref={ref}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {uniqueCurrencies.map((currency) => (
              <SelectItem key={currency?.code} value={currency?.code || ""}>
                <div className="flex items-center w-full gap-2">
                  <span className="text-sm text-muted-foreground w-8 text-left">
                    {currency?.code}
                  </span>
                  <span className="hidden">{currency?.symbol}</span>
                  <span>{currency?.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
);

CurrencySelectComponent.displayName = "CurrencySelect";

export const CurrencySelect = memo(CurrencySelectComponent);


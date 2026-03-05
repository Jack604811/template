"use client";

import { memo, useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { EditableText } from "@/components/ui/editable-text";
import { MapPin, Star, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSuspenseCustomFields } from "@/features/custom-fields/hooks/use-custom-fields";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { CustomFieldType, CustomFieldDisplayLocation } from "@/generated/prisma";
import { parseCustomFields } from "@/features/custom-fields/utils/parse-custom-fields";
import { cn } from "@/lib/utils";
import { countries } from "country-data-list";
import type { Country } from "@/components/ui/country-dropdown";
import * as RPNInput from "react-phone-number-input";

/** Simple email format check; used so we only save when valid (user can type freely). */
function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface CustomerDetailsCardProps {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    streetAddress: string | null;
    cityCountry: string | null;
    customFields?: Record<string, unknown> | null;
  };
  bookingCount: number;
  onCustomerChange?: (field: string, value: string) => void;
  onCustomerCustomFieldsChange?: (customFields: Record<string, string>) => void;
}

export const CustomerDetailsCard = memo(({ 
  customer, 
  bookingCount,
  onCustomerChange,
  onCustomerCustomFieldsChange,
}: CustomerDetailsCardProps) => {
  // Fetch all custom fields
  const { data: allCustomFields } = useSuspenseCustomFields();
  const currentOrg = useCurrentOrganizationWithSettings();

  // Get default country code (alpha2) from organization country (alpha3)
  const defaultCountry = useMemo<RPNInput.Country | undefined>(() => {
    if (!currentOrg?.country) return "US"; // Default to US
    
    const country = countries.all.find(
      (c: Country) => c.alpha3 === currentOrg.country
    );
    return (country?.alpha2 || "US") as RPNInput.Country;
  }, [currentOrg?.country]);

  // Filter and parse customer custom fields
  const customerCustomFields = useMemo(
    () => parseCustomFields(allCustomFields, CustomFieldDisplayLocation.CUSTOMER),
    [allCustomFields],
  );

  // Initialize custom fields state from customer prop
  const [customFields, setCustomFields] = useState<Record<string, string>>(() => {
    if (customer.customFields && typeof customer.customFields === "object") {
      return customer.customFields as Record<string, string>;
    }
    return {};
  });

  // Calculate recurrent status
  const isRecurrent = useMemo(() => {
    return bookingCount > 1 && !!customer.name && !!customer.email && !!customer.phone;
  }, [bookingCount, customer.name, customer.email, customer.phone]);

  // Local state for editable fields
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [streetAddress, setStreetAddress] = useState(customer.streetAddress || "");
  const [cityCountry, setCityCountry] = useState(customer.cityCountry || "");

  // Get country code (alpha2) from phone number if it starts with +
  const phoneCountry = useMemo<RPNInput.Country | undefined>(() => {
    // If phone number starts with +, try to detect country from phone number
    if (phone?.startsWith("+") && phone.length > 1) {
      try {
        // Use the parsePhoneNumber function from react-phone-number-input
        const parsed = RPNInput.parsePhoneNumber(phone);
        if (parsed?.country) {
          return parsed.country;
        }
      } catch {
        // If parsing fails (e.g., incomplete number), return undefined to use defaultCountry
      }
    }
    return undefined;
  }, [phone]);

  // Refs to track if user is actively editing (prevent useEffect from overwriting local state with stale server data)
  const isUpdatingPhoneRef = useRef(false);
  const isUpdatingNameRef = useRef(false);
  const isUpdatingEmailRef = useRef(false);
  const isUpdatingAddressRef = useRef(false);
  const isUpdatingCityRef = useRef(false);
  const isUpdatingCustomFieldsRef = useRef(false);

  // Sync local state from customer prop when server data has caught up (not while user is typing).
  // Only clear "editing" ref when server state matches local state, so we don't revert before refetch completes.
  useEffect(() => {
    if (customer.name === name) isUpdatingNameRef.current = false;
    if ((customer.email || "") === email) isUpdatingEmailRef.current = false;
    if ((customer.phone || "") === phone) isUpdatingPhoneRef.current = false;
    if ((customer.streetAddress || "") === streetAddress) isUpdatingAddressRef.current = false;
    if ((customer.cityCountry || "") === cityCountry) isUpdatingCityRef.current = false;

    if (customer.customFields && typeof customer.customFields === "object") {
      const serverCustomFields = customer.customFields as Record<string, string>;
      if (
        JSON.stringify(serverCustomFields) === JSON.stringify(customFields)
      ) {
        isUpdatingCustomFieldsRef.current = false;
      }
      if (!isUpdatingCustomFieldsRef.current) {
        setCustomFields(serverCustomFields);
      }
    }

    if (!isUpdatingNameRef.current && customer.name !== name) {
      setName(customer.name);
    }
    if (!isUpdatingEmailRef.current && (customer.email || "") !== email) {
      setEmail(customer.email || "");
    }
    if (!isUpdatingPhoneRef.current && (customer.phone || "") !== phone) {
      setPhone(customer.phone || "");
    }
    if (!isUpdatingAddressRef.current && (customer.streetAddress || "") !== streetAddress) {
      setStreetAddress(customer.streetAddress || "");
    }
    if (!isUpdatingCityRef.current && (customer.cityCountry || "") !== cityCountry) {
      setCityCountry(customer.cityCountry || "");
    }
  }, [customer, name, email, phone, streetAddress, cityCountry, customFields]);

  const handleNameChange = (value: string) => {
    isUpdatingNameRef.current = true;
    setName(value);
    onCustomerChange?.("name", value);
  };

  const handleEmailChange = (value: string) => {
    isUpdatingEmailRef.current = true;
    setEmail(value);
    setEmailError(null);
    // Only trigger save when valid or empty so user can type freely without server errors
    if (value === "" || isValidEmail(value)) {
      onCustomerChange?.("email", value);
    }
  };

  const handleEmailBlur = () => {
    if (email.trim() && !isValidEmail(email)) {
      setEmailError("Invalid email address");
    } else {
      setEmailError(null);
      if (email === "" || isValidEmail(email)) {
        onCustomerChange?.("email", email);
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    isUpdatingPhoneRef.current = true;
    setPhone(value);
    onCustomerChange?.("phone", value);
  };

  const handleStreetAddressChange = (value: string) => {
    isUpdatingAddressRef.current = true;
    setStreetAddress(value);
    onCustomerChange?.("streetAddress", value);
  };

  const handleCityCountryChange = (value: string) => {
    isUpdatingCityRef.current = true;
    setCityCountry(value);
    onCustomerChange?.("cityCountry", value);
  };

  const handleUpdateCustomField = (identifier: string, value: string) => {
    isUpdatingCustomFieldsRef.current = true;
    const newCustomFields = { ...customFields, [identifier]: value };
    setCustomFields(newCustomFields);
    onCustomerCustomFieldsChange?.(newCustomFields);
    setOpenDropdown(null);
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden gap-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">Customer Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <div className="flex flex-col">
            <EditableText value={name} onChange={handleNameChange} className="font-semibold text-lg" />
            <Badge variant="secondary" className="gap-1 text-xs w-fit mt-2 py-2">
              {isRecurrent ? (
                <>
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Recurrent Customer
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                  New Customer
                </>
              )}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
          <div className="flex flex-col gap-3">
            {/* Email, Phone and Customer Custom Fields */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Email Field */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <span className="text-xs text-destructive">*</span>
                </div>
                <Input
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  type="email"
                  className={cn(
                    "h-8 text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0 dark:bg-transparent",
                    !email && "text-muted-foreground",
                    emailError && "border-destructive"
                  )}
                  placeholder="Add email"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <span className="text-xs text-destructive">*</span>
                </div>
                <PhoneInput
                  value={phone || undefined}
                  onChange={(value) => handlePhoneChange(value || "")}
                  country={phoneCountry || undefined}
                  defaultCountry={defaultCountry}
                  className="h-8 text-sm"
                  inputClassName="border-none shadow-none focus-visible:ring-0 px-0 rounded-none dark:bg-transparent"
                  buttonClassName="border-none shadow-none focus-visible:ring-0 rounded-none !pl-0 bg-transparent dark:bg-transparent hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
                />
              </div>

              {/* Customer Custom Fields - same UX as booking custom fields */}
              {customerCustomFields.map((field) => {
                const userValue = customFields[field.identifier];
                const currentValue = userValue || field.defaultValue || "";

                const isTextInput =
                  field.type === CustomFieldType.TEXT ||
                  field.type === CustomFieldType.NUMBER ||
                  field.type === CustomFieldType.DATE ||
                  field.type === CustomFieldType.TIME;
                const isTextarea = field.type === CustomFieldType.TEXTAREA;

                return (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">{field.name}</p>
                      {field.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                    </div>
                    {isTextarea ? (
                      <Textarea
                        value={currentValue}
                        onChange={(e) =>
                          handleUpdateCustomField(field.identifier, e.target.value)
                        }
                        className={cn(
                          "min-h-[80px] resize-none text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0 dark:bg-transparent",
                          !currentValue && "text-muted-foreground",
                        )}
                        placeholder={field.placeholder || field.defaultValue || ""}
                      />
                    ) : isTextInput ? (
                      <Input
                        value={currentValue}
                        onChange={(e) =>
                          handleUpdateCustomField(field.identifier, e.target.value)
                        }
                        className={cn(
                          "h-8 text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0 dark:bg-transparent",
                          !currentValue && "text-muted-foreground",
                        )}
                        placeholder={field.placeholder || field.defaultValue || ""}
                      />
                    ) : (
                      <DropdownMenu
                        open={openDropdown === field.identifier}
                        onOpenChange={(open) =>
                          setOpenDropdown(open ? field.identifier : null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "text-sm font-medium text-left hover:underline cursor-pointer",
                              !currentValue && "text-muted-foreground",
                            )}
                          >
                            {currentValue || ""}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          {field.options && field.options.length > 0 ? (
                            (field.options as string[]).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  handleUpdateCustomField(field.identifier, option)
                                }
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                              >
                                {option}
                              </button>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No options available
                            </div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>

            {streetAddress && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <EditableText value={streetAddress} onChange={handleStreetAddressChange} className="text-sm font-medium" />
                  <p className="text-xs text-muted-foreground">Street Address</p>
                </div>
              </div>
            )}
            {cityCountry && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <EditableText value={cityCountry} onChange={handleCityCountryChange} className="text-sm font-medium" />
                  <p className="text-xs text-muted-foreground">City & Country</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CustomerDetailsCard.displayName = "CustomerDetailsCard";

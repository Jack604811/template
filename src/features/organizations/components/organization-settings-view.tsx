"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { countries } from "country-data-list";
import { EntityContainer, EntityHeader } from "@/components/entity-components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CountryDropdown, type Country } from "@/components/ui/country-dropdown";
import { CurrencySelect } from "@/components/ui/currency-select";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { WeekStartSelect } from "@/components/ui/week-start-select";
import { DateTimeFormatSelect } from "@/components/ui/date-time-format-select";
import { useCurrentOrganization, useSuspenseOrganizations, useUpdateOrganizationName, useUpdateOrganizationSettings } from "../hooks/use-organizations";
import { MemberList } from "./member-list";
import { CustomFieldsList } from "@/features/custom-fields/components/custom-fields-list";

const formSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().optional(),
  weekStart: z.enum(["monday", "sunday"]).optional(),
  dateTimeFormat: z.enum(["12", "24"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const OrganizationSettingsView = memo(() => {
  const { data: memberships } = useSuspenseOrganizations();
  const { data: currentOrgId } = useCurrentOrganization();
  const updateName = useUpdateOrganizationName();
  const updateSettings = useUpdateOrganizationSettings();

  const currentMembership = memberships.find(m => m.organization.id === currentOrgId);
  const currentOrg = currentMembership?.organization;
  const currentRole = currentMembership?.role as "owner" | "admin" | "member" | undefined;

  // Get available countries
  const availableCountries = useMemo(
    () =>
      countries.all.filter(
        (country: Country) =>
          country.emoji && country.status !== "deleted" && country.ioc !== "PRK"
      ),
    []
  );

  // State for selected country object (for currency filtering)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Initialize selected country from currentOrg.country (alpha3 code)
  useEffect(() => {
    if (currentOrg?.country) {
      const country = availableCountries.find(
        (c) => c.alpha3 === currentOrg.country
      );
      if (country) {
        setSelectedCountry(country);
      }
    } else {
      // Default to USA
      const usa = availableCountries.find((c) => c.alpha3 === "USA");
      if (usa) {
        setSelectedCountry(usa);
      }
    }
  }, [currentOrg?.country, availableCountries]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: currentOrg?.name || "",
      country: currentOrg?.country || "USA",
      currency: currentOrg?.currency || "USD",
      timezone: currentOrg?.timezone || "America/New_York",
      weekStart: (currentOrg?.weekStart as "monday" | "sunday") || "sunday",
      dateTimeFormat: (currentOrg?.dateTimeFormat as "12" | "24") || "24",
    },
  });

  const canEdit = currentRole === "owner" || currentRole === "admin";

  // Watch form values for auto-save
  const watchedName = form.watch("name");
  const watchedCountryCode = form.watch("country");
  const watchedCurrency = form.watch("currency");
  const watchedTimezone = form.watch("timezone");
  const watchedWeekStart = form.watch("weekStart");
  const watchedDateTimeFormat = form.watch("dateTimeFormat");

  // Update selected country object when country code changes
  useEffect(() => {
    if (watchedCountryCode) {
      const country = availableCountries.find((c) => c.alpha3 === watchedCountryCode);
      if (country) {
        setSelectedCountry(country);
        // If current currency is not in country's currencies + USD, reset to first available
        const countryCurrencies = country.currencies || [];
        const availableCurrencies = [...new Set([...countryCurrencies, "USD"])];
        const currentCurrency = form.getValues("currency");
        if (currentCurrency && !availableCurrencies.includes(currentCurrency)) {
          form.setValue("currency", availableCurrencies[0] || "USD");
        }
      }
    }
  }, [watchedCountryCode, availableCountries, form]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousValuesRef = useRef<FormValues | null>(null);

  const saveName = useCallback(
    (name: string) => {
      if (name && name !== currentOrg?.name) {
        updateName.mutate({
          name,
        });
      }
    },
    [currentOrg?.name, updateName]
  );

  const saveSettings = useCallback(
    (values: Partial<FormValues>) => {
      updateSettings.mutate({
        country: values.country,
        currency: values.currency,
        timezone: values.timezone,
        weekStart: values.weekStart,
        dateTimeFormat: values.dateTimeFormat,
      });
    },
    [updateSettings]
  );

  // Auto-save on form changes with debounce
  useEffect(() => {
    if (!currentOrgId || !canEdit) return;

    const current: FormValues = {
      name: watchedName || "",
      country: watchedCountryCode || "",
      currency: watchedCurrency || "",
      timezone: watchedTimezone,
      weekStart: watchedWeekStart,
      dateTimeFormat: watchedDateTimeFormat,
    };

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Skip initial render
    if (!previousValuesRef.current) {
      previousValuesRef.current = {
        name: current.name,
        country: current.country,
        currency: current.currency,
        timezone: current.timezone,
        weekStart: current.weekStart,
        dateTimeFormat: current.dateTimeFormat,
      };
      return;
    }

    const previous = previousValuesRef.current;

    // Debounce save
    debounceTimeoutRef.current = setTimeout(() => {
      // Save name separately if changed
      if (current.name !== previous.name) {
        saveName(current.name);
      }

      // Save settings if any setting changed
      const settingsChanged =
        current.country !== previous.country ||
        current.currency !== previous.currency ||
        current.timezone !== previous.timezone ||
        current.weekStart !== previous.weekStart ||
        current.dateTimeFormat !== previous.dateTimeFormat;

      if (settingsChanged) {
        saveSettings({
          country: current.country,
          currency: current.currency,
          timezone: current.timezone,
          weekStart: current.weekStart,
          dateTimeFormat: current.dateTimeFormat,
        });
      }

      previousValuesRef.current = current;
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    watchedName,
    watchedCountryCode,
    watchedCurrency,
    watchedTimezone,
    watchedWeekStart,
    watchedDateTimeFormat,
    currentOrgId,
    canEdit,
    saveName,
    saveSettings,
  ]);

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Organization Settings"
          description="Manage your organization and team members"
        />
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Update your organization's basic information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        The name of your organization as shown to team members.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <CountryDropdown
                          defaultValue={field.value}
                          onChange={(country) => {
                            field.onChange(country.alpha3);
                            setSelectedCountry(country);
                          }}
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        The country where your organization is located.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <CurrencySelect
                          value={field.value}
                          onValueChange={field.onChange}
                          name={field.name}
                          country={selectedCountry}
                          placeholder="Select currency"
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        The currency used for pricing and payments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar Settings</CardTitle>
            <CardDescription>
              Configure your calendar preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <TimezoneSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          name={field.name}
                          placeholder="Select timezone"
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        The timezone for your organization.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weekStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week Start</FormLabel>
                      <FormControl>
                        <WeekStartSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          name={field.name}
                          placeholder="Select week start"
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        The day the week starts on your calendar.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateTimeFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time Format</FormLabel>
                      <FormControl>
                        <DateTimeFormatSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          name={field.name}
                          placeholder="Select format"
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose between 12-hour or 24-hour time format.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CustomFieldsList />
        </Card>
        <Card>
          {currentOrgId && (
            <MemberList organizationId={currentOrgId} currentRole={currentRole || "member"} />
          )}
        </Card>
      </div>
    </EntityContainer>
  );
});

OrganizationSettingsView.displayName = "OrganizationSettingsView";


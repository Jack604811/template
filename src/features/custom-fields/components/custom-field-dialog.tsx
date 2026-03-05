"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, type ControllerRenderProps } from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { CustomFieldType, CustomFieldDisplayLocation } from "@/generated/prisma";
import {
  useCreateCustomField,
  useUpdateCustomField,
} from "@/features/custom-fields/hooks/use-custom-fields";
import { CUSTOM_FIELD_TYPE_LABELS, AVAILABLE_FIELD_TYPES } from "../constants";

const formSchema = z
  .object({
    name: z.string().min(1, { message: "Field name is required" }),
    type: z.nativeEnum(CustomFieldType),
    required: z.boolean(),
    options: z.string().optional(),
    defaultValue: z.string().optional(),
    placeholder: z.string().optional(),
    displayLocation: z.nativeEnum(CustomFieldDisplayLocation),
  })
  .refine(
    (data) => {
      if (
        data.type === CustomFieldType.OPTIONS ||
        data.type === CustomFieldType.MULTISELECT
      ) {
        return data.options && data.options.trim().length > 0;
      }
      return true;
    },
    {
      message: "Options are required for Options and Multiselect field types",
      path: ["options"],
    },
  );

export type CustomFieldFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldId?: string;
  defaultValues?: Partial<CustomFieldFormValues>;
  onCreate?: (values: { name: string; type: CustomFieldType; required: boolean; enabled: boolean; options?: string[]; defaultValue?: string; placeholder?: string; displayLocation: CustomFieldDisplayLocation }) => Promise<void>;
  onUpdate?: (fieldId: string, values: { name: string; type: CustomFieldType; required: boolean; options?: string[]; defaultValue?: string; placeholder?: string; displayLocation: CustomFieldDisplayLocation }) => Promise<void>;
}

export const CustomFieldDialog = memo(({
  open,
  onOpenChange,
  fieldId,
  defaultValues = {},
  onCreate,
  onUpdate,
}: Props) => {
  const createCustomField = useCreateCustomField();
  const updateCustomField = useUpdateCustomField();
  const isEdit = !!fieldId;
  const useOptimistic = !!onCreate || !!onUpdate;

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues.name || "",
      type: defaultValues.type || CustomFieldType.OPTIONS,
      required: defaultValues.required || false,
      options: defaultValues.options || "",
      defaultValue: defaultValues.defaultValue || "",
      placeholder: defaultValues.placeholder || "",
      displayLocation: defaultValues.displayLocation || CustomFieldDisplayLocation.BOOKING,
    },
  });

  const fieldType = form.watch("type");
  const optionsString = form.watch("options");
  const showOptions =
    fieldType === CustomFieldType.OPTIONS ||
    fieldType === CustomFieldType.MULTISELECT;
  
  // Parse options for dropdown/multiselect defaultValue selector
  const availableOptions = useMemo(() => {
    if (!showOptions || !optionsString) return [];
    return optionsString
      .split(/[\n,]/)
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
  }, [showOptions, optionsString]);

  const showDefaultValue = fieldType !== CustomFieldType.MULTISELECT && fieldType !== CustomFieldType.DATE;
  const previousFieldIdRef = useRef<string | undefined>(undefined);
  const previousOpenRef = useRef<boolean>(false);

  // Memoize reset values to prevent unnecessary form resets
  const resetValues = useMemo(() => {
    const initialOptions = defaultValues?.options || "";
    const shouldSetDefaultOptions =
      !isEdit &&
      (defaultValues?.type === CustomFieldType.OPTIONS ||
        defaultValues?.type === CustomFieldType.MULTISELECT) &&
      !initialOptions;

    return {
      name: defaultValues?.name || "",
      type: defaultValues?.type || CustomFieldType.OPTIONS,
      required: defaultValues?.required ?? false,
      options: shouldSetDefaultOptions
        ? "Option 1\nOption 2\nOption 3"
        : initialOptions || "",
      defaultValue: defaultValues?.defaultValue || "",
      placeholder: defaultValues?.placeholder || "",
      displayLocation: defaultValues?.displayLocation ?? CustomFieldDisplayLocation.BOOKING,
    };
  }, [
    defaultValues?.name,
    defaultValues?.type,
    defaultValues?.required,
    defaultValues?.options,
    defaultValues?.defaultValue,
    defaultValues?.placeholder,
    defaultValues?.displayLocation,
    isEdit,
  ]);

  // Set default values when field type changes
  useEffect(() => {
    if (!open || isEdit) return;

    // Set default options placeholder for dropdown/multiselect types
    if (
      (fieldType === CustomFieldType.OPTIONS || fieldType === CustomFieldType.MULTISELECT) &&
      !form.getValues("options")
    ) {
      form.setValue("options", "Option 1\nOption 2\nOption 3", { shouldValidate: false });
    }

    // Clear options if switching away from dropdown/multiselect
    if (
      fieldType !== CustomFieldType.OPTIONS &&
      fieldType !== CustomFieldType.MULTISELECT &&
      form.getValues("options")
    ) {
      form.setValue("options", "", { shouldValidate: false });
    }
  }, [fieldType, open, isEdit, form]);

  // Reset form when dialog opens or fieldId changes
  useEffect(() => {
    const dialogJustOpened = !previousOpenRef.current && open;
    const fieldIdChanged = previousFieldIdRef.current !== fieldId;
    
    previousOpenRef.current = open;
    previousFieldIdRef.current = fieldId;

    // Only reset if dialog just opened or fieldId changed
    if (!open || (!dialogJustOpened && !fieldIdChanged)) {
      return;
    }

    form.reset(resetValues);
  }, [open, fieldId, resetValues, form]);

  const handleSubmit = async (values: CustomFieldFormValues) => {
    // Parse options string into array (split by newline or comma)
    const optionsArray = values.options
      ? values.options
          .split(/[\n,]/)
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0)
      : [];

    const submitValues = {
      name: values.name,
      type: values.type,
      required: values.required,
      options: showOptions && optionsArray.length > 0 ? optionsArray : undefined,
      defaultValue: values.defaultValue?.trim() ? values.defaultValue.trim() : undefined,
      placeholder: values.placeholder?.trim() ? values.placeholder.trim() : undefined,
      displayLocation: values.displayLocation,
    };

    if (isEdit && fieldId) {
      if (useOptimistic && onUpdate) {
        // Optimistic update - close dialog immediately, mutation happens in background
        // Parent handles errors and reverts optimistic update if mutation fails
        void onUpdate(fieldId, submitValues);
        onOpenChange(false);
      } else {
        // Non-optimistic update - wait for server
        try {
          await updateCustomField.mutateAsync({
            id: fieldId,
            ...submitValues,
          });
          onOpenChange(false);
        } catch {
          // Error handling is done in mutation hook
        }
      }
    } else {
      if (useOptimistic && onCreate) {
        // Optimistic create - close dialog immediately, mutation happens in background
        // Parent handles errors and reverts optimistic update if mutation fails
        void onCreate({
          ...submitValues,
          enabled: true,
        });
        onOpenChange(false);
      } else {
        // Non-optimistic create - wait for server
        try {
          await createCustomField.mutateAsync({
            ...submitValues,
            enabled: true,
          });
          onOpenChange(false);
        } catch {
          // Error handling is done in mutation hook
        }
      }
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Field" : "Add Field"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the custom field configuration."
              : "Create a custom field to collect additional information from customers."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-6"
          >
            <FieldGroup>
              <FieldSet>
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "name">; fieldState: { error?: { message?: string } } }) => (
                    <Field>
                      <FieldLabel htmlFor="field-name">Field Name</FieldLabel>
                      <Input
                        id="field-name"
                        placeholder="e.g., Wine Preference, Guest Count"
                        {...field}
                        disabled={
                          (!useOptimistic && (createCustomField.isPending || updateCustomField.isPending))
                        }
                      />
                      <FieldDescription>
                        The label displayed to users when filling out this field
                      </FieldDescription>
                      <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="displayLocation"
                  render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "displayLocation">; fieldState: { error?: { message?: string } } }) => (
                    <Field>
                      <FieldLabel htmlFor="display-location">
                        Display Location
                      </FieldLabel>
                      <FieldDescription>
                        Choose where this field appears in the booking details page
                      </FieldDescription>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={
                          !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                        }
                        className="flex flex-row gap-4"
                      >
                        <FieldLabel htmlFor="display-location-booking">
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Booking Details</FieldTitle>
                              <FieldDescription>
                                Display in the booking information
                              </FieldDescription>
                            </FieldContent>
                            <RadioGroupItem
                              value={CustomFieldDisplayLocation.BOOKING}
                              id="display-location-booking"
                            />
                          </Field>
                        </FieldLabel>
                        <FieldLabel htmlFor="display-location-customer">
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Customer Details</FieldTitle>
                              <FieldDescription>
                                Display in the client information
                              </FieldDescription>
                            </FieldContent>
                            <RadioGroupItem
                              value={CustomFieldDisplayLocation.CUSTOMER}
                              id="display-location-customer"
                            />
                          </Field>
                        </FieldLabel>
                      </RadioGroup>
                      <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="type"
                  render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "type">; fieldState: { error?: { message?: string } } }) => (
                    <Field>
                      <FieldLabel htmlFor="field-type">Field Type</FieldLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={
                          !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                        }
                      >
                        <SelectTrigger id="field-type" className="w-full">
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                        <SelectContent align="start" className="w-full">
                          {AVAILABLE_FIELD_TYPES.map((type: CustomFieldType) => (
                            <SelectItem key={type} value={type}>
                              {CUSTOM_FIELD_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        The type of input field that users will see
                      </FieldDescription>
                      <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                    </Field>
                  )}
                />

              </FieldSet>

              {showOptions && (
                <FieldSet>
                  <Controller
                    control={form.control}
                    name="options"
                    render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "options">; fieldState: { error?: { message?: string } } }) => (
                      <Field>
                        <FieldLabel htmlFor="field-options">Options</FieldLabel>
                        <Textarea
                          id="field-options"
                          placeholder="Option 1
Option 2
Option 3"
                          {...field}
                          disabled={
                            !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                          }
                          rows={4}
                          className="font-mono text-sm"
                        />
                        <FieldDescription>
                          Enter one option per line or separate with commas
                        </FieldDescription>
                        <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                      </Field>
                    )}
                  />
                </FieldSet>
              )}

              {showDefaultValue && (
                <FieldSet>
                  <Controller
                    control={form.control}
                    name="defaultValue"
                    render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "defaultValue">; fieldState: { error?: { message?: string } } }) => (
                      <Field>
                        <FieldLabel htmlFor="field-default-value">Default Value</FieldLabel>
                        {fieldType === CustomFieldType.OPTIONS && availableOptions.length > 0 ? (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                            disabled={
                              !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                            }
                          >
                            <SelectTrigger id="field-default-value">
                              <SelectValue placeholder="Select default option" />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {availableOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : fieldType === CustomFieldType.NUMBER ? (
                          <Input
                            id="field-default-value"
                            type="number"
                            placeholder="e.g., 0, 10, 100"
                            {...field}
                            disabled={
                              !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                            }
                          />
                        ) : fieldType === CustomFieldType.TEXTAREA ? (
                          <Textarea
                            id="field-default-value"
                            placeholder="Enter default value"
                            rows={3}
                            {...field}
                            disabled={
                              !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                            }
                          />
                        ) : (
                          <Input
                            id="field-default-value"
                            placeholder="Enter default value"
                            {...field}
                            disabled={
                              !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                            }
                          />
                        )}
                        <FieldDescription>
                          Optional value that will be pre-filled when using this field
                        </FieldDescription>
                        <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                      </Field>
                    )}
                  />
                </FieldSet>
              )}

              <FieldSeparator />

              <FieldSet>
                <Controller
                  control={form.control}
                  name="placeholder"
                  render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "placeholder">; fieldState: { error?: { message?: string } } }) => (
                    <Field>
                      <FieldLabel htmlFor="field-placeholder">Placeholder</FieldLabel>
                      <Input
                        id="field-placeholder"
                        placeholder="e.g., Enter your preference..."
                        {...field}
                        disabled={
                          !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                        }
                      />
                      <FieldDescription>
                        Optional placeholder text shown when field is empty
                      </FieldDescription>
                      <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                    </Field>
                  )}
                />
              </FieldSet>

              <FieldSeparator />

              <FieldSet>
                <Controller
                  control={form.control}
                  name="required"
                  render={({ field, fieldState }: { field: ControllerRenderProps<CustomFieldFormValues, "required">; fieldState: { error?: { message?: string } } }) => (
                    <Field>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldLabel htmlFor="required">Required Field</FieldLabel>
                            <FieldDescription>
                              Users must fill out this field when creating a customer or booking
                            </FieldDescription>
                          </FieldContent>
                          <Switch
                            id="required"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={
                              !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                            }
                          />
                        </Field>
                      </div>
                      <FieldError errors={fieldState.error ? [fieldState.error] : []} />
                    </Field>
                  )}
                />
              </FieldSet>
            </FieldGroup>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={
                  !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !useOptimistic && (createCustomField.isPending || updateCustomField.isPending)
                }
              >
                {isEdit ? "Save Changes" : "Create Field"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

CustomFieldDialog.displayName = "CustomFieldDialog";

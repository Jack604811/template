"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Controller,
  type ControllerRenderProps,
  useForm,
} from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
import { DeleteItem } from "@/components/ui/delete-item";
import {
  DialogContent as Content,
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCustomField,
  useRemoveCustomField,
  useUpdateCustomField,
} from "@/features/custom-fields/hooks/use-custom-fields";
import {
  CustomFieldDisplayLocation,
  CustomFieldType,
} from "@/generated/prisma";
import { AVAILABLE_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS } from "../constants";

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
      message: "Las opciones son obligatorias para este tipo de variable",
      path: ["options"],
    },
  );

export type CustomFieldFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldId?: string;
  defaultValues?: Partial<CustomFieldFormValues>;
  hideDisplayLocation?: boolean;
  onCreate?: (values: {
    name: string;
    type: CustomFieldType;
    required: boolean;
    enabled: boolean;
    options?: string[];
    defaultValue?: string;
    placeholder?: string;
    displayLocation: CustomFieldDisplayLocation;
  }) => Promise<void>;
  onUpdate?: (
    fieldId: string,
    values: {
      name: string;
      type: CustomFieldType;
      required: boolean;
      options?: string[];
      defaultValue?: string;
      placeholder?: string;
      displayLocation: CustomFieldDisplayLocation;
    },
  ) => Promise<void>;
  asSidePanel?: boolean;
}

export const CustomFieldDetails = memo(
  ({
    open,
    onOpenChange,
    fieldId,
    defaultValues = {},
    hideDisplayLocation = false,
    onCreate,
    onUpdate,
    asSidePanel = false,
  }: Props) => {
    const createCustomField = useCreateCustomField();
    const updateCustomField = useUpdateCustomField();
    const removeCustomField = useRemoveCustomField();
    const [deleteOpen, setDeleteOpen] = useState(false);
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
        displayLocation:
          defaultValues.displayLocation || CustomFieldDisplayLocation.BOOKING,
      },
    });

    const watchedValues = form.watch();
    const fieldType = watchedValues.type;
    const optionsString = watchedValues.options;
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const mutateRef = useRef(updateCustomField.mutate);
    mutateRef.current = updateCustomField.mutate;
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

    const showDefaultValue =
      fieldType !== CustomFieldType.MULTISELECT &&
      fieldType !== CustomFieldType.DATE;
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
        displayLocation:
          defaultValues?.displayLocation ?? CustomFieldDisplayLocation.BOOKING,
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
        (fieldType === CustomFieldType.OPTIONS ||
          fieldType === CustomFieldType.MULTISELECT) &&
        !form.getValues("options")
      ) {
        form.setValue("options", "Option 1\nOption 2\nOption 3", {
          shouldValidate: false,
        });
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

    useEffect(() => {
      if (!asSidePanel || !isEdit || !fieldId) return;
      const { unsubscribe } = form.watch(() => {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
          const valid = await form.trigger();
          if (!valid) return;
          const values = form.getValues();
          const optionsArray = values.options
            ? values.options
                .split(/[\n,]/)
                .map((o) => o.trim())
                .filter((o) => o.length > 0)
            : [];
          const currentShowOptions =
            values.type === CustomFieldType.OPTIONS ||
            values.type === CustomFieldType.MULTISELECT;
          mutateRef.current({
            id: fieldId,
            name: values.name,
            type: values.type,
            required: values.required,
            options:
              currentShowOptions && optionsArray.length > 0
                ? optionsArray
                : undefined,
            defaultValue: values.defaultValue?.trim() || undefined,
            placeholder: values.placeholder?.trim() || undefined,
            displayLocation: values.displayLocation,
          });
        }, 600);
      });
      return () => {
        unsubscribe();
        clearTimeout(autoSaveTimerRef.current);
      };
    }, [asSidePanel, isEdit, fieldId, form]);

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
        options:
          showOptions && optionsArray.length > 0 ? optionsArray : undefined,
        defaultValue: values.defaultValue?.trim()
          ? values.defaultValue.trim()
          : undefined,
        placeholder: values.placeholder?.trim()
          ? values.placeholder.trim()
          : undefined,
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

    const formBody = (
      <Form {...form}>
        <form
          id="custom-field-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col flex-1 mt-6"
        >
          <FieldGroup>
            <FieldSet>
              <Controller
                control={form.control}
                name="name"
                render={({
                  field,
                  fieldState,
                }: {
                  field: ControllerRenderProps<CustomFieldFormValues, "name">;
                  fieldState: { error?: { message?: string } };
                }) => (
                  <Field>
                    <FieldLabel htmlFor="field-name">
                      Nombre de la variable
                    </FieldLabel>
                    <Input
                      id="field-name"
                      placeholder="Ej. País, Teléfono, Empresa"
                      {...field}
                    />
                    <FieldDescription>
                      La etiqueta que verán los usuarios al completar esta variable
                    </FieldDescription>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : []}
                    />
                  </Field>
                )}
              />

              {!hideDisplayLocation && (
                <Controller
                  control={form.control}
                  name="displayLocation"
                  render={({
                    field,
                    fieldState,
                  }: {
                    field: ControllerRenderProps<
                      CustomFieldFormValues,
                      "displayLocation"
                    >;
                    fieldState: { error?: { message?: string } };
                  }) => (
                    <Field>
                      <FieldLabel htmlFor="display-location">
                        Ubicación de visualización
                      </FieldLabel>
                      <FieldDescription>
                        Elige dónde aparece esta variable en los detalles del
                        registro
                      </FieldDescription>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-row gap-4"
                      >
                        <FieldLabel htmlFor="display-location-booking">
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>Registro principal</FieldTitle>
                              <FieldDescription>
                                Mostrar en los detalles del registro
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
                              <FieldTitle>Detalles del cliente</FieldTitle>
                              <FieldDescription>
                                Mostrar en la información del cliente
                              </FieldDescription>
                            </FieldContent>
                            <RadioGroupItem
                              value={CustomFieldDisplayLocation.CUSTOMER}
                              id="display-location-customer"
                            />
                          </Field>
                        </FieldLabel>
                      </RadioGroup>
                      <FieldError
                        errors={fieldState.error ? [fieldState.error] : []}
                      />
                    </Field>
                  )}
                />
              )}

              <Controller
                control={form.control}
                name="type"
                render={({
                  field,
                  fieldState,
                }: {
                  field: ControllerRenderProps<CustomFieldFormValues, "type">;
                  fieldState: { error?: { message?: string } };
                }) => (
                  <Field>
                    <FieldLabel htmlFor="field-type">Tipo de variable</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="field-type" className="w-full">
                        <SelectValue placeholder="Seleccionar tipo de variable" />
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
                      El tipo de entrada que verán los usuarios
                    </FieldDescription>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : []}
                    />
                  </Field>
                )}
              />
            </FieldSet>

            {showOptions && (
              <FieldSet>
                <Controller
                  control={form.control}
                  name="options"
                  render={({
                    field,
                    fieldState,
                  }: {
                    field: ControllerRenderProps<
                      CustomFieldFormValues,
                      "options"
                    >;
                    fieldState: { error?: { message?: string } };
                  }) => (
                    <Field>
                      <FieldLabel htmlFor="field-options">Opciones</FieldLabel>
                      <Textarea
                        id="field-options"
                        placeholder={"Opción 1\nOpción 2\nOpción 3"}
                        {...field}
                        rows={4}
                        className="font-mono text-sm"
                      />
                      <FieldDescription>
                        Ingresa una opción por línea o separa con comas
                      </FieldDescription>
                      <FieldError
                        errors={fieldState.error ? [fieldState.error] : []}
                      />
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
                  render={({
                    field,
                    fieldState,
                  }: {
                    field: ControllerRenderProps<
                      CustomFieldFormValues,
                      "defaultValue"
                    >;
                    fieldState: { error?: { message?: string } };
                  }) => (
                    <Field>
                      <FieldLabel htmlFor="field-default-value">
                        Valor por defecto
                      </FieldLabel>
                      {fieldType === CustomFieldType.OPTIONS &&
                      availableOptions.length > 0 ? (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <SelectTrigger id="field-default-value">
                            <SelectValue placeholder="Seleccionar opción por defecto" />
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
                          placeholder="Ej. 0, 10, 100"
                          {...field}
                        />
                      ) : fieldType === CustomFieldType.TEXTAREA ? (
                        <Textarea
                          id="field-default-value"
                          placeholder="Ingresa un valor por defecto"
                          rows={3}
                          {...field}
                        />
                      ) : (
                        <Input
                          id="field-default-value"
                          placeholder="Ingresa un valor por defecto"
                          {...field}
                        />
                      )}
                      <FieldDescription>
                        Valor opcional que se rellenará automáticamente al usar
                        esta variable
                      </FieldDescription>
                      <FieldError
                        errors={fieldState.error ? [fieldState.error] : []}
                      />
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
                render={({
                  field,
                  fieldState,
                }: {
                  field: ControllerRenderProps<
                    CustomFieldFormValues,
                    "placeholder"
                  >;
                  fieldState: { error?: { message?: string } };
                }) => (
                  <Field>
                    <FieldLabel htmlFor="field-placeholder">
                      Texto de sugerencia
                    </FieldLabel>
                    <Input
                      id="field-placeholder"
                      placeholder="Ej. Ingresa tu preferencia..."
                      {...field}
                    />
                    <FieldDescription>
                      Texto opcional que se muestra cuando la variable está vacía
                    </FieldDescription>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : []}
                    />
                  </Field>
                )}
              />
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
              <Controller
                control={form.control}
                name="required"
                render={({
                  field,
                  fieldState,
                }: {
                  field: ControllerRenderProps<
                    CustomFieldFormValues,
                    "required"
                  >;
                  fieldState: { error?: { message?: string } };
                }) => (
                  <Field>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldLabel htmlFor="required">
                            Variable obligatoria
                          </FieldLabel>
                          <FieldDescription>
                            Los usuarios deben completar esta variable antes de
                            continuar
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          id="required"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </Field>
                    </div>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : []}
                    />
                  </Field>
                )}
              />
            </FieldSet>
          </FieldGroup>

          {(!asSidePanel || !isEdit) && (
            <div className="mt-auto pt-4 pb-1 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEdit ? "Guardar cambios" : "Crear variable"}
              </Button>
            </div>
          )}

          {asSidePanel && isEdit && fieldId && (
            <div className="mt-auto pt-4 pb-1 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Eliminar
              </Button>
              <DeleteItem
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="¿Eliminar variable?"
                description="Esta acción no se puede deshacer. Se eliminará la variable y todos los datos asociados."
                onConfirm={() => {
                  removeCustomField.mutate({ id: fieldId });
                  onOpenChange(false);
                }}
              />
            </div>
          )}
        </form>
      </Form>
    );

    if (asSidePanel) {
      return formBody;
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Content className="sm:max-w-[500px] overflow-y-auto max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar variable" : "Agregar variable"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Actualiza la configuración de la variable personalizada."
                : "Crea una variable personalizada para recopilar información adicional."}
            </DialogDescription>
          </DialogHeader>
          {formBody}
        </Content>
      </Dialog>
    );
  },
);

CustomFieldDetails.displayName = "CustomFieldDetails";

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Checkbox } from "@/components/ui/checkbox";
import { CustomFieldType } from "@/generated/prisma";

const formSchema = z
  .object({
    name: z.string().min(1, { message: "Field name is required" }),
    type: z.enum(CustomFieldType),
    required: z.boolean(),
    options: z.string().optional(),
    defaultValue: z.string().optional(),
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
      message: "Las opciones son obligatorias para este tipo de campo",
      path: ["options"],
    },
  );

export type FieldFormValues = z.infer<typeof formSchema>;

interface FieldFormProps {
  mode: "create" | "edit";
  initialData?: Partial<FieldFormValues>;
  onSubmit: (data: FieldFormValues) => void;
  onCancel: () => void;
}

export const FieldForm = ({
  mode,
  initialData = {},
  onSubmit,
  onCancel,
}: FieldFormProps) => {
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData.name || "",
      type: initialData.type || CustomFieldType.TEXT,
      required: initialData.required || false,
      options: initialData.options || "",
      defaultValue: initialData.defaultValue || "",
    },
  });

  const fieldType = form.watch("type");
  const showOptions =
    fieldType === CustomFieldType.OPTIONS ||
    fieldType === CustomFieldType.MULTISELECT;

  const fieldTypeLabels: Record<CustomFieldType, string> = {
    [CustomFieldType.TEXT]: "Text",
    [CustomFieldType.TEXTAREA]: "Long text",
    [CustomFieldType.NUMBER]: "Number",
    [CustomFieldType.BOOLEAN]: "True/False",
    [CustomFieldType.DATE]: "Date",
    [CustomFieldType.TIME]: "Time",
    [CustomFieldType.OPTIONS]: "Options",
    [CustomFieldType.MULTISELECT]: "Multiselect",
  };

  const handleSubmit = (values: FieldFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Wine, Guest Count, Arrival Time"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {showOptions && (
          <FormField
            control={form.control}
            name="options"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Options</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter options, one per line or separated by commas"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter one option per line or separate by commas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="defaultValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Value (Optional)</FormLabel>
              <FormControl>
                {fieldType === CustomFieldType.TEXTAREA ? (
                  <Textarea
                    placeholder="Default value for this field"
                    rows={3}
                    {...field}
                  />
                ) : (
                  <Input placeholder="Default value for this field" {...field} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="required"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Required</FormLabel>
                <FormDescription>
                  This field must be filled when creating a bookable
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {mode === "edit" ? "Update" : "Create Field"}
          </Button>
        </div>
      </form>
    </Form>
  );
};


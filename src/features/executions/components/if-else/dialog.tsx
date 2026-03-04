"use client";

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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { VariableInput } from "@/components/ui/variable-input";
import { Plus, Trash2Icon } from "lucide-react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { IfElseCondition } from "./executor";

const conditionSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  variable: z
    .string()
    .min(1, { message: "Variable is required" }),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains"]),
  value: z.string().min(1, { message: "Value is required" }),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  conditions: z
    .array(conditionSchema)
    .min(1, { message: "Add at least one condition" }),
});

export type IfElseFormValues = z.infer<typeof formSchema>;

interface Props {
  nodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IfElseFormValues) => void;
  defaultValues?: Partial<IfElseFormValues>;
}

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Is" },
  { value: "not_equals", label: "Is not" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "contains", label: "Contains" },
] as const;

export const IfElseDialog = ({
  nodeId,
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: Props) => {
  const form = useForm<IfElseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "condition",
      conditions:
        defaultValues?.conditions && defaultValues.conditions.length > 0
          ? defaultValues.conditions
          : [
              {
                id: crypto.randomUUID(),
                label: "",
                variable: "",
                operator: "equals",
                value: "",
              },
            ],
    },
  });

  const watchVariableName = form.watch("variableName") || "condition";

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        variableName: defaultValues.variableName || "condition",
        conditions:
          defaultValues.conditions && defaultValues.conditions.length > 0
            ? defaultValues.conditions
            : [
                {
                  id: crypto.randomUUID(),
                  label: "",
                  variable: "",
                  operator: "equals",
                  value: "",
                },
              ],
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: IfElseFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleAddCondition = () => {
    append({
      id: crypto.randomUUID(),
      label: "",
      variable: "",
      operator: "equals",
      value: "",
    } as IfElseCondition);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Condition</DialogTitle>
          <DialogDescription>
            Create simple rules (if / else) to branch your workflow. Non-developers can think of this as “if this, then that”.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result variable name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="condition"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The result of this step will be available as{" "}
                    {`{{${watchVariableName}.branch}}`} or{" "}
                    {`{{${watchVariableName}.label}}`} in later steps.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-3 rounded-md border bg-muted/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Condition</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,2fr)] items-end gap-3">
                    <FormField
                      control={form.control}
                      name={`conditions.${index}.variable`}
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel>Variable</FormLabel>
                          <FormControl>
                            <VariableInput
                              nodeId={nodeId}
                              placeholder="Pick a value from previous steps"
                              singleVariable
                              className="min-w-0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.operator`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operator</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-20 truncate text-left">
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OPERATOR_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="5000"
                              className="bg-muted/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCondition}
              >
                <Plus className="size-4 mr-1" />
                Add condition
              </Button>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


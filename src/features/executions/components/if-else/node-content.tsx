"use client";

import { Position } from "@xyflow/react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { VariableInput } from "@/components/ui/variable-input";
import { Plus, Trash2Icon } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import type { IfElseCondition } from "./executor";
import type { IfElseFormValues } from "./dialog";

const conditionSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  variable: z.string().min(1, { message: "Variable is required" }),
  operator: z.enum([
    "equals",
    "not_equals",
    "greater_than",
    "less_than",
    "contains",
  ]),
  value: z.string().min(1, { message: "Value is required" }),
});

const formSchema = z.object({
  conditions: z
    .array(conditionSchema)
    .min(1, { message: "Add at least one condition" }),
});

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Is" },
  { value: "not_equals", label: "Is not" },
  { value: "greater_than", label: "Is greater than" },
  { value: "less_than", label: "Is less than" },
  { value: "contains", label: "Contains" },
] as const;

interface IfElseNodeContentProps {
  nodeId: string;
  defaultValues: Partial<IfElseFormValues>;
  onDataChange: (values: IfElseFormValues) => void;
}

export function IfElseNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: IfElseNodeContentProps) {
  const form = useForm<IfElseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conditions:
        defaultValues?.conditions && defaultValues.conditions.length > 0
          ? defaultValues.conditions
          : [
              {
                id: crypto.randomUUID(),
                label: "",
                variable: "",
                operator: "equals" as const,
                value: "",
              },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.conditions && value.conditions.length > 0) {
        onDataChange({ conditions: value.conditions as IfElseCondition[] });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

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
    <Form {...form}>
      <form className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="relative rounded-md border bg-muted/40 px-2 pb-6 pt-2 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium shrink-0">
                  Condition {index + 1}
                </h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="nodrag size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <FormField
                  control={form.control}
                  name={`conditions.${index}.variable`}
                  render={({ field: f }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Variable</FormLabel>
                      <FormControl>
                        <VariableInput
                          nodeId={nodeId}
                          value={f.value}
                          onChange={f.onChange}
                          onBlur={f.onBlur}
                          placeholder="Pick a value from previous steps"
                          singleVariable
                          className="nodrag min-h-8 text-xs cursor-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`conditions.${index}.operator`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Operator</FormLabel>
                      <Select
                        onValueChange={f.onChange}
                        value={f.value}
                      >
                        <FormControl>
                          <SelectTrigger className="nodrag w-full truncate text-left">
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPERATOR_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`conditions.${index}.value`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input
                          className="nodrag bg-muted/50 cursor-text"
                          placeholder="Add a value"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <BaseHandle
                id={`case-${index}`}
                type="source"
                position={Position.Right}
                className="!absolute !right-0 !bottom-0"
                style={{ position: "absolute", right: -8, bottom: 0 }}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="nodrag w-full"
            onClick={handleAddCondition}
          >
            <Plus className="mr-2 size-4" />
            Add condition
          </Button>
          <div className="relative h-6 w-full">
            <BaseHandle
              id="else"
              type="source"
              position={Position.Right}
              className="!absolute !right-0 !bottom-0"
              style={{ position: "absolute", right: -8, bottom: 0 }}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}

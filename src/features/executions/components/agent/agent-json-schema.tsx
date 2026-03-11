"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";

export type ResponseSchemaObject = {
  type: "object";
  title?: string;
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      default?: unknown;
    }
  >;
};

type SchemaField = {
  id: string;
  name: string;
};

function schemaToFields(
  schema: ResponseSchemaObject | null | undefined,
): SchemaField[] {
  const properties = schema?.properties ?? {};
  return Object.entries(properties).map(([name], index) => ({
    id: `field-${index}-${name || crypto.randomUUID()}`,
    name,
  }));
}

function fieldsToSchema(fields: SchemaField[]): ResponseSchemaObject {
  const properties: ResponseSchemaObject["properties"] = {};
  for (const f of fields) {
    if (!f.name?.trim()) continue;
    properties[f.name] = { type: "string" };
  }
  return {
    type: "object",
    title: "response_schema",
    properties,
  };
}

interface AgentJsonSchemaProps {
  schema: ResponseSchemaObject | null | undefined;
  onChange: (schema: ResponseSchemaObject) => void;
}

export function AgentJsonSchema({ schema, onChange }: AgentJsonSchemaProps) {
  const [fields, setFields] = useState<SchemaField[]>(() =>
    schemaToFields(schema),
  );

  const updateSchema = useCallback(
    (newFields: SchemaField[]) => {
      setFields(newFields);
      onChange(fieldsToSchema(newFields));
    },
    [onChange],
  );

  const addField = () => {
    const newFields: SchemaField[] = [
      ...fields,
      {
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: "",
      },
    ];
    updateSchema(newFields);
  };

  const updateField = (index: number, key: keyof SchemaField, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    updateSchema(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    updateSchema(newFields);
  };

  return (
    <div className="space-y-4">
      {fields.map((field, i) => (
        <div
          key={field.id}
          className="relative rounded-md border bg-muted/40 px-2 pb-6 pt-2 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="shrink-0 text-sm font-medium">Field name</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="nodrag size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeField(i)}
              aria-label="Remove field"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
          <FormItem className="min-w-0">
            <FormControl>
              <Input
                value={field.name}
                onChange={(e) => updateField(i, "name", e.target.value)}
                placeholder="field_name"
                className="nodrag bg-muted/50 cursor-text"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addField}
        className="nodrag w-full"
      >
        <Plus className="mr-2 size-4" />
        Add field
      </Button>
    </div>
  );
}

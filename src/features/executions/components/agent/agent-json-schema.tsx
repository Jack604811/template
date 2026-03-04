"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";

const SCHEMA_TYPES = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "True or false" },
  { value: "enum", label: "List" },
] as const;

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
  type: string;
  description: string;
  enumValues: string;
};

function schemaToFields(schema: ResponseSchemaObject | null | undefined): SchemaField[] {
  const properties = schema?.properties ?? {};
  return Object.entries(properties).map(([name, config], index) => ({
    id: `field-${index}-${name || crypto.randomUUID()}`,
    name,
    type: config.enum ? "enum" : config.type ?? "string",
    description: config.description ?? "",
    enumValues: Array.isArray(config.enum) ? config.enum.join(", ") : "",
  }));
}

function fieldsToSchema(fields: SchemaField[]): ResponseSchemaObject {
  const properties: ResponseSchemaObject["properties"] = {};
  for (const f of fields) {
    if (!f.name?.trim()) continue;
    const field: ResponseSchemaObject["properties"][string] = {
      type: f.type === "enum" ? "string" : f.type,
      description: f.description.trim() || undefined,
      default:
        f.type === "number" ? 0 : f.type === "boolean" ? false : undefined,
    };
    if (f.type === "enum" && f.enumValues.trim()) {
      field.enum = f.enumValues
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    properties[f.name] = field;
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

  const updateSchema = useCallback((newFields: SchemaField[]) => {
    setFields(newFields);
    onChange(fieldsToSchema(newFields));
  }, [onChange]);

  const addField = () => {
    const newFields: SchemaField[] = [
      ...fields,
      {
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: "",
        type: "string",
        description: "",
        enumValues: "",
      },
    ];
    setFields(newFields);
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
            <h4 className="shrink-0 text-sm font-medium">Field {i + 1}</h4>
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
          <div className="flex flex-col space-y-2">
            <FormItem className="min-w-0">
              <FormLabel>Name</FormLabel>
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
            <FormItem className="min-w-0">
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Select
                  value={field.type}
                  onValueChange={(v) => updateField(i, "type", v)}
                >
                  <SelectTrigger className="nodrag w-full truncate text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEMA_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem className="min-w-0">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  value={field.description}
                  onChange={(e) =>
                    updateField(i, "description", e.target.value)
                  }
                  placeholder="Optional description"
                  className="nodrag bg-muted/50 cursor-text"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
          {field.type === "enum" && (
            <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
              <Label className="text-xs font-medium text-foreground">
                List values (comma-separated)
              </Label>
              <Input
                value={field.enumValues}
                onChange={(e) => updateField(i, "enumValues", e.target.value)}
                placeholder="value1, value2, value3"
                className="nodrag h-9 text-sm"
              />
            </div>
          )}
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

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
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
  name: string;
  type: string;
  description: string;
  enumValues: string;
};

function schemaToFields(schema: ResponseSchemaObject | null | undefined): SchemaField[] {
  const properties = schema?.properties ?? {};
  return Object.entries(properties).map(([name, config]) => ({
    name,
    type: config.enum ? "enum" : config.type ?? "string",
    description: config.description ?? "",
    enumValues: Array.isArray(config.enum) ? config.enum.join(", ") : "",
  }));
}

function fieldsToSchema(fields: SchemaField[]): ResponseSchemaObject {
  const properties: ResponseSchemaObject["properties"] = {};
  for (const f of fields) {
    if (!f.name.trim()) continue;
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
      { name: "", type: "string", description: "", enumValues: "" },
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
        <Card
          key={field.name ? `field-${field.name}-${i}` : `field-empty-${i}`}
          className="border-border/60 bg-muted/20 p-4 shadow-none"
        >
          <div className="flex flex-wrap items-end gap-y-2">
            <div className="flex flex-[1_1_0] min-w-0 flex-col gap-y-2 pr-4">
              <Label className="text-xs font-medium text-foreground">
                Name
              </Label>
              <Input
                value={field.name}
                onChange={(e) => updateField(i, "name", e.target.value)}
                placeholder="field_name"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex w-[100px] shrink-0 flex-col gap-y-2 pr-4">
              <Label className="text-xs font-medium text-foreground">
                Type
              </Label>
              <Select
                value={field.type}
                onValueChange={(v) => updateField(i, "type", v)}
              >
                <SelectTrigger className="h-9 text-sm">
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
            </div>
            <div className="flex flex-[1_1_0] min-w-0 flex-col gap-y-2 pr-4">
              <Label className="text-xs font-medium text-foreground">
                Description
              </Label>
              <Input
                value={field.description}
                onChange={(e) => updateField(i, "description", e.target.value)}
                placeholder="Optional description"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex shrink-0 flex-col justify-end pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => removeField(i)}
                aria-label="Remove field"
              >
                <X className="size-4" />
              </Button>
            </div>
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
                className="h-9 text-sm"
              />
            </div>
          )}
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addField}
        className="w-full border py-5 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
      >
        <Plus className="mr-2 size-4" />
        Add field
      </Button>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AGENT_MODELS,
  AGENT_NATIVE_TOOLS,
  type AgentToolItem,
} from "@/features/executions/components/agent/constants";
import type { ResponseSchemaObject } from "@/features/executions/components/agent/agent-json-schema";
import { AgentJsonSchema } from "@/features/executions/components/agent/agent-json-schema";
import { McpCatalogDialog } from "@/features/mcp/components/mcp-catalog-dialog";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  Plus,
  Server,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import type { AgentToolCall } from "../../hooks/use-agent-stream";
import { CheckCircle2, Loader2, Wrench } from "lucide-react";

const formSchema = z.object({
  userPrompt: z.string().min(1, { message: "Prompt is required" }),
  instructions: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  outputFormat: z.enum(["text", "json"]),
  responseSchema: z.any().optional(),
});

export type AgentFormValues = z.infer<typeof formSchema> & {
  tools?: AgentToolItem[];
};

const defaultResponseSchema: ResponseSchemaObject = {
  type: "object",
  title: "response_schema",
  properties: {},
};

const OUTPUT_FORMATS = [
  { value: "text", label: "Text" },
  { value: "json", label: "JSON" },
] as const;

interface AgentNodeContentProps {
  nodeId: string;
  defaultValues: Partial<AgentFormValues>;
  onDataChange: (values: AgentFormValues) => void;
  streamText?: string;
  toolCalls?: AgentToolCall[];
  isStreaming?: boolean;
}

export function AgentNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
  streamText = "",
  toolCalls = [],
  isStreaming = false,
}: AgentNodeContentProps) {
  const [tools, setTools] = useState<AgentToolItem[]>(
    defaultValues.tools ?? [],
  );
  const [mcpCatalogOpen, setMcpCatalogOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instructions: defaultValues.instructions ?? "",
      userPrompt: defaultValues.userPrompt ?? "",
      model: defaultValues.model ?? AGENT_MODELS[0]?.value ?? "",
      outputFormat: defaultValues.outputFormat ?? "text",
      responseSchema:
        typeof defaultValues.responseSchema === "object" &&
        defaultValues.responseSchema !== null
          ? defaultValues.responseSchema
          : defaultResponseSchema,
    },
  });

  const watchOutputFormat = form.watch("outputFormat");
  const watchResponseSchema = form.watch("responseSchema");


  const syncToData = useCallback(
    (value: Partial<z.infer<typeof formSchema>>, toolList: AgentToolItem[]) => {
      const schema =
        typeof value.responseSchema === "object" &&
        value.responseSchema !== null
          ? value.responseSchema
          : defaultResponseSchema;
      onDataChange({
        userPrompt: value.userPrompt ?? "",
        instructions: value.instructions ?? "",
        model: value.model ?? "",
        outputFormat: (value.outputFormat as "text" | "json") ?? "text",
        responseSchema: value.outputFormat === "json" ? schema : undefined,
        tools: toolList,
      });
    },
    [onDataChange],
  );

  useEffect(() => {
    const subscription = form.watch((value) => syncToData(value, tools));
    return () => subscription.unsubscribe();
  }, [form, syncToData, tools]);

  useEffect(() => {
    syncToData(form.getValues(), tools);
  }, [tools, syncToData, form]);

  const handleAddTool = (toolId: string) => {
    if (toolId === "mcpServer") {
      setMcpCatalogOpen(true);
      return;
    }
    const exists = tools.some(
      (t) => t.type === "native" && t.value === toolId,
    );
    if (!exists) {
      setTools((prev) => [
        ...prev,
        { type: "native" as const, value: toolId },
      ]);
    }
  };

  const handleAddMcp = (data: {
    label: string;
    serverId: string;
    selectedTools: { name: string }[];
  }) => {
    setTools((prev) => [
      ...prev,
      {
        type: "mcp",
        serverId: data.serverId,
        label: data.label,
        tools: data.selectedTools,
      },
    ]);
  };

  const removeTool = (index: number) => {
    setTools((prev) => prev.filter((_, i) => i !== index));
  };

  const availableNativeTools = AGENT_NATIVE_TOOLS.filter(
    (t) => !tools.some((x) => x.type === "native" && x.value === t.id),
  );

  return (
    <>
      <McpCatalogDialog
        open={mcpCatalogOpen}
        onOpenChange={setMcpCatalogOpen}
        onAdd={handleAddMcp}
      />
      <Form {...form}>
        <form className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="userPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions</FormLabel>
                <FormControl>
                  <VariableTextarea
                    nodeId={nodeId}
                    placeholder="Summarize the following content: {{json webhook.body}}"
                    className="nodrag nowheel min-w-0 min-h-[100px] max-h-[200px] overflow-y-auto text-sm cursor-text"
                    rows={6}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  What the agent should do. Use the variable picker when focused
                  or type {"{{variableName}}"} / {"{{json variableName}}"} (e.g.{" "}
                  {"{{json webhook.body}}"}).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4">
            <FormLabel className="shrink-0 text-sm">Tools</FormLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="nodrag size-8 shrink-0"
                >
                  <Plus className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableNativeTools.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => handleAddTool(t.id)}
                  >
                    <GlobeIcon className="mr-2 size-4" />
                    {t.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => setMcpCatalogOpen(true)}>
                  <Server className="mr-2 size-4" />
                  MCP Server
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {tools.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tools.map((t, i) => (
                <Badge
                  key={
                    t.type === "native"
                      ? `native-${t.value}`
                      : `mcp-${t.serverId}-${i}`
                  }
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {t.type === "native"
                    ? AGENT_NATIVE_TOOLS.find((n) => n.id === t.value)?.name ??
                      t.value
                    : t.type === "mcp"
                      ? t.label ?? "MCP"
                      : "MCP"}
                  <button
                    type="button"
                    aria-label="Remove"
                    className="nodrag ml-0.5 hover:text-destructive"
                    onClick={() => removeTool(i)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem className="flex flex-row flex-wrap items-center justify-between gap-4 gap-y-1">
                <FormLabel className="shrink-0 text-sm">Model</FormLabel>
                <Popover open={modelOpen} onOpenChange={setModelOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="nodrag min-w-[180px] justify-between px-4 font-normal"
                      >
                        <span className="truncate">
                          {field.value
                            ? AGENT_MODELS.find((m) => m.value === field.value)
                                ?.label ?? field.value
                            : "Select model"}
                        </span>
                        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="end"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Search model..."
                        className="h-8"
                      />
                      <CommandList>
                        <CommandEmpty>No model found</CommandEmpty>
                        <CommandGroup>
                          {AGENT_MODELS.map((m) => (
                            <CommandItem
                              key={m.value}
                              value={m.label}
                              onSelect={() => {
                                field.onChange(m.value);
                                setModelOpen(false);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 size-4",
                                  field.value === m.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {m.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage className="w-full basis-full" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="outputFormat"
            render={({ field }) => (
              <FormItem className="flex flex-row flex-wrap items-center justify-between gap-4 gap-y-1">
                <FormLabel className="shrink-0 text-sm">
                  Output Format
                </FormLabel>
                <Popover open={formatOpen} onOpenChange={setFormatOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="nodrag min-w-[120px] justify-between px-4 font-normal"
                      >
                        {OUTPUT_FORMATS.find((f) => f.value === field.value)
                          ?.label ?? "Text"}
                        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="end"
                  >
                    <Command>
                      <CommandList>
                        {OUTPUT_FORMATS.map((f) => (
                          <CommandItem
                            key={f.value}
                            value={f.label}
                            onSelect={() => {
                              field.onChange(f.value);
                              if (f.value === "text") {
                                form.setValue("responseSchema", undefined);
                              } else {
                                form.setValue(
                                  "responseSchema",
                                  watchResponseSchema ?? defaultResponseSchema,
                                );
                              }
                              setFormatOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 size-4",
                                field.value === f.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {f.label}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage className="w-full basis-full" />
              </FormItem>
            )}
          />

          {watchOutputFormat === "json" && (
            <div className="space-y-2 border-t pt-4">
              <FormLabel>JSON Schema</FormLabel>
              <AgentJsonSchema
                schema={
                  typeof watchResponseSchema === "object" &&
                  watchResponseSchema !== null
                    ? (watchResponseSchema as ResponseSchemaObject)
                    : defaultResponseSchema
                }
                onChange={(schema) => form.setValue("responseSchema", schema)}
              />
            </div>
          )}
        </form>
      </Form>

      {(isStreaming || toolCalls.length > 0 || streamText) && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {toolCalls.length > 0 && (
            <div className="space-y-1">
              {toolCalls.map((tc) => (
                <div
                  key={tc.toolCallId}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                >
                  {tc.done ? (
                    <CheckCircle2 className="size-3 shrink-0 text-green-600" />
                  ) : (
                    <Loader2 className="size-3 shrink-0 animate-spin text-blue-500" />
                  )}
                  <Wrench className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-muted-foreground">
                    {tc.toolName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {streamText && (
            <div className="nowheel max-h-48 overflow-y-auto rounded-md bg-muted/50 px-2 py-1.5 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="prose prose-xs max-w-none text-xs text-muted-foreground [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_li]:my-0 [&_strong]:font-semibold [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_code]:font-mono [&_code]:text-[11px]">
                <ReactMarkdown>{streamText}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

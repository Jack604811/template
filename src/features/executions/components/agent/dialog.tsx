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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import {
  AGENT_MODELS,
  AGENT_NATIVE_TOOLS,
  type AgentToolItem,
} from "@/features/executions/components/agent/constants";
import type { ResponseSchemaObject } from "@/features/executions/components/agent/agent-json-schema";
import { AgentJsonSchema } from "@/features/executions/components/agent/agent-json-schema";
import { McpDialog } from "@/features/mcp/components/mcp-dialog";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, GlobeIcon, Plus, Server, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const formSchema = z.object({
  label: z.string().optional(),
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  instructions: z.string().optional(),
  userPrompt: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  outputFormat: z.enum(["text", "json"]),
  responseSchema: z.any().optional(),
});

export type AgentFormValues = z.infer<typeof formSchema> & {
  tools?: AgentToolItem[];
};

const OUTPUT_FORMATS = [
  { value: "text", label: "Text" },
  { value: "json", label: "JSON" },
] as const;

const defaultResponseSchema: ResponseSchemaObject = {
  type: "object",
  title: "response_schema",
  properties: {},
};

interface Props {
  nodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AgentFormValues) => void;
  defaultValues?: Partial<AgentFormValues>;
}

export const AgentDialog = ({
  nodeId,
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const [tools, setTools] = useState<AgentToolItem[]>(
    defaultValues.tools ?? [],
  );
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: defaultValues.label ?? "",
      variableName: defaultValues.variableName ?? "",
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

  const watchLabel = form.watch("label");
  const watchVariableName = form.watch("variableName") || "agentResult";
  const watchOutputFormat = form.watch("outputFormat");
  const watchResponseSchema = form.watch("responseSchema");

  useEffect(() => {
    if (open) {
      const schema =
        typeof defaultValues.responseSchema === "object" &&
        defaultValues.responseSchema !== null
          ? defaultValues.responseSchema
          : defaultResponseSchema;
      form.reset({
        label: defaultValues.label ?? "",
        variableName: defaultValues.variableName ?? "",
        instructions: defaultValues.instructions ?? "",
        userPrompt: defaultValues.userPrompt ?? "",
        model: defaultValues.model ?? AGENT_MODELS[0]?.value ?? "",
        outputFormat: defaultValues.outputFormat ?? "text",
        responseSchema: schema,
      });
      setTools(defaultValues.tools ?? []);
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({ ...values, tools });
    onOpenChange(false);
  };

  const handleAddTool = (toolId: string) => {
    if (toolId === "mcpServer") {
      setMcpDialogOpen(true);
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
    setMcpDialogOpen(false);
  };

  const removeTool = (index: number) => {
    setTools((prev) => prev.filter((_, i) => i !== index));
  };

  const availableNativeTools = AGENT_NATIVE_TOOLS.filter(
    (t) => !tools.some((x) => x.type === "native" && x.value === t.id),
  );

  const settingsTitle = watchLabel?.trim()
    ? `${watchLabel.trim()} Settings`
    : "Agent Settings";

  return (
    <>
      <McpDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        onAdd={handleAddMcp}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{settingsTitle}</DialogTitle>
            <DialogDescription>
              Call the model with instructions and tools
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="mt-4 space-y-4"
            >
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs text-muted-foreground">Agent name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My Agent"
                        className="h-8"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs text-muted-foreground">Variable name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="agentResult"
                        className="h-8"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {`{{${watchVariableName}.text}}`} in other nodes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <VariableTextarea
                        nodeId={nodeId}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        placeholder="You are a helpful assistant."
                        className="min-h-[140px] font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      System instructions for the agent. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row: label left, control right - like reference image */}
              <div className="flex items-center justify-between gap-4">
                <FormLabel className="shrink-0 text-sm">Tools</FormLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8 shrink-0"
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
                    <DropdownMenuItem onClick={() => setMcpDialogOpen(true)}>
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
                        ? AGENT_NATIVE_TOOLS.find((n) => n.id === t.value)
                            ?.name ?? t.value
                        : t.type === "mcp"
                          ? t.label ?? "MCP"
                          : "MCP"}
                      <button
                        type="button"
                        aria-label="Remove"
                        className="ml-0.5 hover:text-destructive"
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
                            className="min-w-[180px] justify-between px-4 font-normal"
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
                          <CommandInput placeholder="Search model..." className="h-8" />
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
                    <FormLabel className="shrink-0 text-sm">Output Format</FormLabel>
                    <Popover open={formatOpen} onOpenChange={setFormatOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[120px] justify-between px-4 font-normal"
                          >
                            {OUTPUT_FORMATS.find((f) => f.value === field.value)?.label ?? "Text"}
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
                    key={open ? "open" : "closed"}
                    schema={
                      typeof watchResponseSchema === "object" &&
                      watchResponseSchema !== null
                        ? (watchResponseSchema as ResponseSchemaObject)
                        : defaultResponseSchema
                    }
                    onChange={(schema) =>
                      form.setValue("responseSchema", schema)
                    }
                  />
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

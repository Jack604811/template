"use client";

import { Plus, Terminal, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { type Control, useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VariableInput } from "@/components/ui/variable-input";
import { VariableTextarea } from "@/components/ui/variable-textarea";


const kvPairSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const formSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z.string().min(1, { message: "Please enter a valid URL" }),
  authType: z.enum(["none", "bearer", "basic", "apiKey"]),
  bearerToken: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
  apiKeyName: z.string().optional(),
  apiKeyValue: z.string().optional(),
  apiKeyPlacement: z.enum(["header", "query"]),
  headers: z.array(kvPairSchema),
  queryParams: z.array(kvPairSchema),
  bodyType: z.enum(["json", "form", "raw"]),
  body: z.string().optional(),
  timeout: z.number().min(0).optional(),
  followRedirects: z.boolean(),
  responseType: z.enum(["auto", "json", "text"]),
});

export type HttpRequestFormValues = z.infer<typeof formSchema>;

// ─── cURL parser ────────────────────────────────────────────────────────────

function tokenizeShell(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let i = 0;
  const str = input.replace(/\\\n\s*/g, " ");

  while (i < str.length) {
    const ch = str[i];
    if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      i++;
    } else if (ch === "'") {
      i++;
      while (i < str.length && str[i] !== "'") current += str[i++];
      i++;
    } else if (ch === '"') {
      i++;
      while (i < str.length && str[i] !== '"') {
        if (str[i] === "\\" && i + 1 < str.length) {
          const next = str[i + 1];
          if ('"\\$`'.includes(next)) {
            current += next;
            i += 2;
          } else {
            current += str[i++];
          }
        } else {
          current += str[i++];
        }
      }
      i++;
    } else if (ch === "\\") {
      if (i + 1 < str.length) {
        current += str[i + 1];
        i += 2;
      } else {
        i++;
      }
    } else {
      current += ch;
      i++;
    }
  }

  if (current) tokens.push(current);
  return tokens;
}

function parseCurl(curlString: string): Partial<HttpRequestFormValues> {
  const tokens = tokenizeShell(curlString.trim());
  let i = tokens[0] === "curl" ? 1 : 0;

  let method: HttpRequestFormValues["method"] | undefined;
  let url = "";
  const headers: { key: string; value: string }[] = [];
  const queryParams: { key: string; value: string }[] = [];
  let body = "";
  let bodyType: "json" | "form" | "raw" = "json";
  let authType: "none" | "bearer" | "basic" | "apiKey" = "none";
  let bearerToken = "";
  let basicUsername = "";
  let basicPassword = "";
  const dataUrlencode: string[] = [];

  const noValueFlags = new Set([
    "--compressed",
    "-s",
    "--silent",
    "-v",
    "--verbose",
    "-i",
    "--include",
    "-k",
    "--insecure",
    "-L",
    "--location",
    "--no-keepalive",
    "--http2",
    "--http1.1",
    "-g",
    "--globoff",
  ]);

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      method = tokens[++i] as HttpRequestFormValues["method"];
    } else if (token === "-H" || token === "--header") {
      const header = tokens[++i] ?? "";
      const colonIdx = header.indexOf(":");
      if (colonIdx > -1) {
        const key = header.slice(0, colonIdx).trim();
        const value = header.slice(colonIdx + 1).trim();
        if (key.toLowerCase() === "authorization") {
          if (value.startsWith("Bearer ")) {
            authType = "bearer";
            bearerToken = value.slice(7);
          } else if (value.startsWith("Basic ")) {
            try {
              const decoded = atob(value.slice(6));
              const cp = decoded.indexOf(":");
              authType = "basic";
              basicUsername = decoded.slice(0, cp);
              basicPassword = decoded.slice(cp + 1);
            } catch {}
          } else {
            headers.push({ key, value });
          }
        } else {
          headers.push({ key, value });
        }
      }
    } else if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary"
    ) {
      body = tokens[++i] ?? "";
      try {
        JSON.parse(body);
        bodyType = "json";
      } catch {
        bodyType =
          body.includes("=") && !body.trim().startsWith("{") ? "form" : "raw";
      }
    } else if (token === "-u" || token === "--user") {
      const userPass = tokens[++i] ?? "";
      const cp = userPass.indexOf(":");
      authType = "basic";
      basicUsername = cp > -1 ? userPass.slice(0, cp) : userPass;
      basicPassword = cp > -1 ? userPass.slice(cp + 1) : "";
    } else if (token === "--url") {
      url = tokens[++i] ?? "";
    } else if (token === "--data-urlencode") {
      dataUrlencode.push(tokens[++i] ?? "");
    } else if (token === "-G" || token === "--get") {
      method = "GET";
    } else if (!token.startsWith("-") && !url) {
      url = token;
    } else if (token.startsWith("-") && !noValueFlags.has(token)) {
      i++;
    }

    i++;
  }

  if (!method) method = body || dataUrlencode.length ? "POST" : "GET";

  for (const entry of dataUrlencode) {
    const eqIdx = entry.indexOf("=");
    const key = eqIdx > -1 ? entry.slice(0, eqIdx) : entry;
    const value = eqIdx > -1 ? entry.slice(eqIdx + 1) : "";
    if (method === "GET") {
      queryParams.push({ key, value });
    } else {
      body = body ? `${body}&${encodeURIComponent(key)}=${encodeURIComponent(value)}` : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      bodyType = "form";
    }
  }

  if (url) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.forEach((value, key) => {
        queryParams.push({ key, value });
      });
      url = `${parsed.origin}${parsed.pathname}`;
    } catch {}
  }

  const result: Partial<HttpRequestFormValues> = { method, url, authType };
  if (headers.length) result.headers = headers;
  if (queryParams.length) result.queryParams = queryParams;
  if (body) {
    result.body = body;
    result.bodyType = bodyType;
  }
  if (authType === "bearer") result.bearerToken = bearerToken;
  if (authType === "basic") {
    result.basicUsername = basicUsername;
    result.basicPassword = basicPassword;
  }

  return result;
}

// ─── KV editor ──────────────────────────────────────────────────────────────

function KvEditor({
  nodeId,
  control,
  name,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  nodeId: string;
  control: Control<HttpRequestFormValues>;
  name: "headers" | "queryParams";
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-md border bg-muted/40 px-2 pt-1.5 pb-2 space-y-1.5"
        >
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="nodrag size-6 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => remove(index)}
            >
              <Trash2Icon className="size-3" />
            </Button>
          </div>
          <FormField
            control={control}
            name={`${name}.${index}.key`}
            render={({ field: f }) => (
              <Input
                className="nodrag h-7 text-xs bg-muted/50"
                placeholder={keyPlaceholder}
                {...f}
              />
            )}
          />
          <FormField
            control={control}
            name={`${name}.${index}.value`}
            render={({ field: f }) => (
              <VariableTextarea
                nodeId={nodeId}
                className="nodrag min-h-[28px] text-xs bg-muted/50"
                placeholder={valuePlaceholder}
                value={f.value}
                onChange={f.onChange}
                onBlur={f.onBlur}
                rows={1}
              />
            )}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="nodrag w-full h-8 text-xs"
        onClick={() => append({ key: "", value: "" })}
      >
        <Plus className="mr-1.5 size-3" />
        Add
      </Button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface HttpRequestNodeContentProps {
  nodeId: string;
  defaultValues: Partial<HttpRequestFormValues>;
  onDataChange: (values: HttpRequestFormValues) => void;
}

export function HttpRequestNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: HttpRequestNodeContentProps) {
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlInput, setCurlInput] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const form = useForm<HttpRequestFormValues>({
    defaultValues: {
      method: defaultValues.method ?? "GET",
      url: defaultValues.url ?? "",
      authType: defaultValues.authType ?? "none",
      bearerToken: defaultValues.bearerToken ?? "",
      basicUsername: defaultValues.basicUsername ?? "",
      basicPassword: defaultValues.basicPassword ?? "",
      apiKeyName: defaultValues.apiKeyName ?? "",
      apiKeyValue: defaultValues.apiKeyValue ?? "",
      apiKeyPlacement: defaultValues.apiKeyPlacement ?? "header",
      headers: defaultValues.headers ?? [],
      queryParams: defaultValues.queryParams ?? [],
      bodyType: defaultValues.bodyType ?? "json",
      body: defaultValues.body ?? "",
      timeout: defaultValues.timeout,
      followRedirects: defaultValues.followRedirects ?? true,
      responseType: defaultValues.responseType ?? "auto",
    },
  });


  const watchMethod = form.watch("method");
  const watchAuthType = form.watch("authType");
  const watchBodyType = form.watch("bodyType");
  const watchHeaders = form.watch("headers");
  const watchQueryParams = form.watch("queryParams");

  const showBodyTab = ["POST", "PUT", "PATCH"].includes(watchMethod);
  const headerCount = watchHeaders.filter((h) => h.key).length;
  const paramCount = watchQueryParams.filter((p) => p.key).length;

  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange(value as HttpRequestFormValues);
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  const handleCurlImport = () => {
    if (!curlInput.trim()) return;
    const parsed = parseCurl(curlInput);
    form.reset({ ...form.getValues(), ...parsed });
    setShowCurlImport(false);
    setCurlInput("");
    setActiveTab("general");
  };

  return (
    <Form {...form}>
      <form className="flex min-w-0 w-full flex-col gap-3">
        {/* cURL import toggle */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant={showCurlImport ? "secondary" : "ghost"}
            size="sm"
            className="nodrag h-6 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={() => setShowCurlImport((v) => !v)}
          >
            <Terminal className="size-3" />
            Import cURL
          </Button>
        </div>

        {/* cURL import panel */}
        {showCurlImport && (
          <div className="rounded-md border bg-muted/40 p-3 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Paste a cURL command — method, URL, headers, auth, body, and query
              params will be auto-filled.
            </p>
            <textarea
              className="nodrag nowheel min-h-[80px] w-full resize-none rounded-md border bg-background p-2 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
              placeholder={`curl -X POST https://api.example.com/users \\\n  -H 'Authorization: Bearer TOKEN' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"name": "John"}'`}
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="nodrag h-7 text-xs"
                onClick={() => {
                  setShowCurlImport(false);
                  setCurlInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="nodrag h-7 text-xs"
                disabled={!curlInput.trim()}
                onClick={handleCurlImport}
              >
                Import
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="nodrag w-full h-8 grid grid-cols-5 mb-3">
            <TabsTrigger value="general" className="text-xs px-1">
              General
            </TabsTrigger>
            <TabsTrigger value="auth" className="text-xs px-1">
              Auth
            </TabsTrigger>
            <TabsTrigger value="headers" className="text-xs px-1 relative">
              Headers
            </TabsTrigger>
            <TabsTrigger value="params" className="text-xs px-1 relative">
              Params
            </TabsTrigger>
            <TabsTrigger value="options" className="text-xs px-1">
              Options
            </TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="mt-0 flex min-w-0 flex-col gap-3">
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-1">
                  <FormLabel className="text-xs">Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="nodrag h-8 w-full text-xs">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "HEAD",
                        "OPTIONS",
                      ].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
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
              name="url"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-1">
                  <FormLabel className="text-xs">URL</FormLabel>
                  <FormControl>
                    <VariableInput
                      nodeId={nodeId}
                      placeholder="https://api.example.com/{{resource}}/{{id}}"
                      className="nodrag h-8 text-xs overflow-hidden"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Use {"{{variable}}"} for dynamic values
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showBodyTab && (
              <FormField
                control={form.control}
                name="bodyType"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-1">
                    <FormLabel className="text-xs">Body Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="nodrag h-8 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="form">Form URL Encoded</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showBodyTab && (
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-1">
                    <FormLabel className="text-xs">Body</FormLabel>
                    <FormControl>
                      <VariableTextarea
                        nodeId={nodeId}
                        placeholder={
                          watchBodyType === "form"
                            ? "key=value&other={{variable}}"
                            : '{\n  "key": "{{variable}}"\n}'
                        }
                        className="nodrag nowheel min-h-[100px] overflow-x-auto whitespace-pre font-mono text-xs cursor-text"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {watchBodyType === "json"
                        ? 'JSON body. Use {"{{variable}}"} or {"{{json variable}}"} for dynamic values.'
                        : watchBodyType === "form"
                          ? "URL encoded key=value pairs."
                          : "Raw request body."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </TabsContent>

          {/* AUTH */}
          <TabsContent value="auth" className="mt-0 flex min-w-0 flex-col gap-3">
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-1">
                  <FormLabel className="text-xs">Authentication</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="nodrag h-8 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="apiKey">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchAuthType === "bearer" && (
              <FormField
                control={form.control}
                name="bearerToken"
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-1">
                    <FormLabel className="text-xs">Token</FormLabel>
                    <FormControl>
                      <VariableInput
                        nodeId={nodeId}
                        placeholder="{{env.API_TOKEN}}"
                        className="nodrag h-8 text-xs overflow-hidden"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Sent as <code>Authorization: Bearer …</code>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchAuthType === "basic" && (
              <>
                <FormField
                  control={form.control}
                  name="basicUsername"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-xs">Username</FormLabel>
                      <FormControl>
                        <VariableInput
                          nodeId={nodeId}
                          placeholder="{{env.API_USER}}"
                          className="nodrag"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="basicPassword"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-xs">Password</FormLabel>
                      <FormControl>
                        <VariableInput
                          nodeId={nodeId}
                          placeholder="{{env.API_PASSWORD}}"
                          className="nodrag"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Sent as <code>Authorization: Basic …</code> (base64
                        encoded)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {watchAuthType === "apiKey" && (
              <>
                <FormField
                  control={form.control}
                  name="apiKeyPlacement"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-xs">Send As</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="nodrag h-8 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Parameter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiKeyName"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-xs">Key Name</FormLabel>
                      <FormControl>
                        <Input
                          className="nodrag h-8 text-xs"
                          placeholder="X-API-Key"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiKeyValue"
                  render={({ field }) => (
                    <FormItem className="min-w-0 space-y-1">
                      <FormLabel className="text-xs">Key Value</FormLabel>
                      <FormControl>
                        <VariableInput
                          nodeId={nodeId}
                          placeholder="{{env.API_KEY}}"
                          className="nodrag"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </TabsContent>

          {/* HEADERS */}
          <TabsContent value="headers" className="mt-0 flex min-w-0 flex-col gap-2">
            <FormLabel className="text-xs">Request Headers</FormLabel>
            <FormDescription className="text-xs">
              Custom headers sent with every request. Auth headers are added
              automatically.
            </FormDescription>
            <KvEditor
              nodeId={nodeId}
              control={form.control}
              name="headers"
              keyPlaceholder="Header name"
              valuePlaceholder="Value"
            />
          </TabsContent>

          {/* PARAMS */}
          <TabsContent value="params" className="mt-0 flex min-w-0 flex-col gap-2">
            <FormLabel className="text-xs">Query Parameters</FormLabel>
            <FormDescription className="text-xs">
              Appended to the URL as <code>?key=value</code> pairs.
            </FormDescription>
            <KvEditor
              nodeId={nodeId}
              control={form.control}
              name="queryParams"
              keyPlaceholder="Parameter name"
              valuePlaceholder="Value"
            />
          </TabsContent>

          {/* OPTIONS */}
          <TabsContent value="options" className="mt-0 flex min-w-0 flex-col gap-3">
            <FormField
              control={form.control}
              name="responseType"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-1">
                  <FormLabel className="text-xs">Response Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="nodrag h-8 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Force parse response as a specific type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem className="min-w-0 space-y-1">
                  <FormLabel className="text-xs">Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="nodrag h-8 text-xs"
                      placeholder="10000"
                      min={0}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Max wait time in milliseconds. Leave empty for default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="followRedirects"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-xs">Follow Redirects</FormLabel>
                    <FormDescription className="text-xs">
                      Automatically follow HTTP 3xx redirects
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      className="nodrag"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}

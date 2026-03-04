"use client";

import {
  Form,
  FormControl,
  FormField,
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
import { VariableInput } from "@/components/ui/variable-input";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import type { HttpRequestFormValues } from "./dialog";

const formSchema = z.object({
  endpoint: z.string().min(1, { message: "Please enter a valid URL" }),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  body: z.string().optional(),
});

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
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || "GET",
      body: defaultValues.body || "",
    },
  });

  useEffect(() => {
    form.reset({
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || "GET",
      body: defaultValues.body || "",
    });
  }, [defaultValues.endpoint, defaultValues.method, defaultValues.body, form]);

  const watchMethod = form.watch("method");
  const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const method = value.method as HttpRequestFormValues["method"];
      const endpoint = value.endpoint ?? "";
      const body = value.body ?? "";
      if (method && endpoint !== undefined) {
        onDataChange({ method, endpoint, body });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Method</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="nodrag h-8 text-xs">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endpoint"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Endpoint</FormLabel>
              <FormControl>
                <VariableInput
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Pick a value"
                  className="nodrag min-h-8 text-xs"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        {showBodyField && (
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs">Body</FormLabel>
                <FormControl>
                  <VariableTextarea
                    nodeId={nodeId}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="{}"
                    className="nodrag min-h-[60px] font-mono text-xs"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}

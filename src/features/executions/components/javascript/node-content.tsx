"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import type { JavascriptNodeData } from "./executor";

const formSchema = z.object({
  code: z.string(),
});

export type JavascriptFormValues = z.infer<typeof formSchema>;

interface JavascriptNodeContentProps {
  nodeId: string;
  defaultValues: Partial<JavascriptNodeData>;
  onDataChange: (values: JavascriptFormValues) => void;
}

export function JavascriptNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: JavascriptNodeContentProps) {
  const form = useForm<JavascriptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange({ code: value.code ?? "" });
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Code</FormLabel>
              <FormControl>
                <VariableTextarea
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={"// Write JavaScript here\n// Use {{variable}} for dynamic values\n// Return a value: return context.myNode.data;"}
                  className="nodrag nopan min-h-[180px] max-h-[418px] overflow-y-auto overflow-x-auto whitespace-pre font-mono text-xs bg-[#0d0d0d] text-[#cdd6f4] border-border"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

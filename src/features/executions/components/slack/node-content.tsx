"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import type { SlackFormValues } from "./dialog";

const formSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  webhookUrl: z.string().min(1, "Webhook URL is required"),
});

interface SlackNodeContentProps {
  nodeId: string;
  defaultValues: Partial<SlackFormValues>;
  onDataChange: (values: SlackFormValues) => void;
}

export function SlackNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: SlackNodeContentProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: defaultValues.content || "",
      webhookUrl: defaultValues.webhookUrl || "",
    },
  });


  useEffect(() => {
    const subscription = form.watch((value) => {
      const content = value.content ?? "";
      const webhookUrl = value.webhookUrl ?? "";
      if (content !== undefined && webhookUrl !== undefined) {
        onDataChange({ content, webhookUrl });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="webhookUrl"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Webhook URL</FormLabel>
              <FormControl>
                <Input
                  className="nodrag h-8 text-xs"
                  placeholder="https://hooks.slack.com/..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Message</FormLabel>
              <FormControl>
                <VariableTextarea
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Summary: {{myGemini.text}}"
                  className="nodrag min-h-[60px] text-xs"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

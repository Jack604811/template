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
import type { DiscordFormValues } from "./dialog";

const formSchema = z.object({
  username: z.string().optional(),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(2000, "Discord messages cannot exceed 2000 characters"),
  webhookUrl: z.string().min(1, "Webhook URL is required"),
});

interface DiscordNodeContentProps {
  nodeId: string;
  defaultValues: Partial<DiscordFormValues>;
  onDataChange: (values: DiscordFormValues) => void;
}

export function DiscordNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: DiscordNodeContentProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: defaultValues.username || "",
      content: defaultValues.content || "",
      webhookUrl: defaultValues.webhookUrl || "",
    },
  });


  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange({
        username: value.username ?? "",
        content: value.content ?? "",
        webhookUrl: value.webhookUrl ?? "",
      });
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
                  placeholder="https://discord.com/api/webhooks/..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Username (optional)</FormLabel>
              <FormControl>
                <Input
                  className="nodrag h-8 text-xs"
                  placeholder="Bot name"
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
                  placeholder="Message content..."
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

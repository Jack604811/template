"use client";

import { CredentialSelector } from "@/components/credential-selector";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import { CredentialType } from "@/generated/prisma";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import type { AnthropicFormValues } from "./dialog";

const formSchema = z.object({
  credentialId: z.string().min(1, "Credential is required"),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "User prompt is required"),
});

interface AnthropicNodeContentProps {
  nodeId: string;
  defaultValues: Partial<AnthropicFormValues>;
  onDataChange: (values: AnthropicFormValues) => void;
}

export function AnthropicNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: AnthropicNodeContentProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId || "",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
    },
  });

  useEffect(() => {
    form.reset({
      credentialId: defaultValues.credentialId || "",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
    });
  }, [
    defaultValues.credentialId,
    defaultValues.systemPrompt,
    defaultValues.userPrompt,
    form,
  ]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.credentialId && value.userPrompt !== undefined) {
        onDataChange({
          credentialId: value.credentialId,
          systemPrompt: value.systemPrompt ?? "",
          userPrompt: value.userPrompt ?? "",
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="credentialId"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">Credential</FormLabel>
              <FormControl>
                <div className="nodrag">
                  <CredentialSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    credentialType={CredentialType.ANTHROPIC}
                    logo="/logos/anthropic.svg"
                    label="Anthropic"
                    placeholder="Select credential"
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userPrompt"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">User prompt</FormLabel>
              <FormControl>
                <VariableTextarea
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Summarize: {{json httpResponse.data}}"
                  className="nodrag min-h-[60px] text-xs"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">System prompt (optional)</FormLabel>
              <FormControl>
                <VariableTextarea
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="You are a helpful assistant."
                  className="nodrag min-h-[50px] text-xs"
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

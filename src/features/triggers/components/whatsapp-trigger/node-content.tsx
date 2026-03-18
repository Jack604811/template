"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { CredentialSelector } from "@/components/credential-selector";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CredentialType } from "@/generated/prisma";

const formSchema = z.object({
  credentialId: z.string().min(1, "WhatsApp credential is required"),
});

export type WhatsAppTriggerFormValues = z.infer<typeof formSchema>;

interface WhatsAppTriggerNodeContentProps {
  nodeId: string;
  defaultValues: Partial<WhatsAppTriggerFormValues>;
  onDataChange: (values: WhatsAppTriggerFormValues) => void;
}

export function WhatsAppTriggerNodeContent({
  nodeId: _nodeId,
  defaultValues,
  onDataChange,
}: WhatsAppTriggerNodeContentProps) {
  const form = useForm<WhatsAppTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId ?? "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      onDataChange(values as WhatsAppTriggerFormValues);
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-4">
        <FormField
          control={form.control}
          name="credentialId"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">WhatsApp account</FormLabel>
              <FormControl>
                <div className="nodrag">
                  <CredentialSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    credentialType={CredentialType.WHATSAPP}
                    logo="/logos/whatsapp.svg"
                    label="WhatsApp"
                    placeholder="Select credential"
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Workflow runs when a new WhatsApp message is received. Configure the webhook URL in your WhatsApp credential.
        </p>
      </form>
    </Form>
  );
}

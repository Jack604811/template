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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CredentialType } from "@/generated/prisma";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { registerGmailWatch } from "./actions";

const formSchema = z.object({
  credentialId: z.string().min(1, "Gmail account is required"),
  from: z.string().optional(),
  subjectContains: z.string().optional(),
  hasAttachment: z.boolean().optional(),
  attachmentType: z.string().optional(),
});

export type GmailTriggerFormValues = z.infer<typeof formSchema>;

interface GmailTriggerNodeContentProps {
  nodeId: string;
  defaultValues: Partial<GmailTriggerFormValues>;
  onDataChange: (values: GmailTriggerFormValues) => void;
}

export function GmailTriggerNodeContent({
  nodeId: _nodeId,
  defaultValues,
  onDataChange,
}: GmailTriggerNodeContentProps) {
  const form = useForm<GmailTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId ?? "",
      from: defaultValues.from ?? "",
      subjectContains: defaultValues.subjectContains ?? "",
      hasAttachment: defaultValues.hasAttachment ?? false,
      attachmentType: defaultValues.attachmentType ?? "",
    },
  });

  // Register a Gmail Pub/Sub watch immediately when a credential is selected,
  // without waiting for the hourly cron.
  const lastRegisteredCredentialId = useRef<string | null>(
    defaultValues.credentialId ?? null,
  );
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name === "credentialId" && values.credentialId) {
        const cid = values.credentialId;
        if (cid !== lastRegisteredCredentialId.current) {
          lastRegisteredCredentialId.current = cid;
          registerGmailWatch(cid).then((result) => {
            if (!result.ok && result.error) {
              console.warn("Gmail watch registration:", result.error);
              if (result.error.includes("GMAIL_PUBSUB_TOPIC")) {
                toast.warning("Gmail watch not registered: GMAIL_PUBSUB_TOPIC env var not set");
              }
            }
          });
        }
      }
      onDataChange(values as GmailTriggerFormValues);
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  // Register watch on mount if credential already set
  useEffect(() => {
    const cid = defaultValues.credentialId;
    if (cid) {
      registerGmailWatch(cid).then((result) => {
        if (!result.ok && result.error) {
          console.warn("Gmail watch registration on mount:", result.error);
        }
      });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAttachment = form.watch("hasAttachment");

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-4">
        <FormField
          control={form.control}
          name="credentialId"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Gmail account</FormLabel>
              <FormControl>
                <div className="nodrag">
                  <CredentialSelector
                    value={field.value}
                    onValueChange={field.onChange}
                    credentialType={CredentialType.GMAIL}
                    logo="/logos/gmail.svg"
                    label="Gmail"
                    placeholder="Select credential"
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          Workflow runs when new matching emails arrive via Gmail push notifications.
        </p>

        <FormField
          control={form.control}
          name="from"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">From (sender)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="nodrag text-sm"
                  placeholder="email@example.com or leave empty"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subjectContains"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Subject contains</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="nodrag text-sm"
                  placeholder="Filter by subject or leave empty"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasAttachment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-2 rounded-lg border border-border/60 p-3">
              <FormLabel className="text-sm font-medium">Has attachment</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  aria-label="Has attachment"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {hasAttachment && (
          <FormField
            control={form.control}
            name="attachmentType"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium">
                  Attachment type (filename extension)
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="nodrag text-sm"
                    placeholder="e.g. pdf or leave empty"
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

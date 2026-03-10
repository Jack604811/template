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
import { Switch } from "@/components/ui/switch";
import { VariableInput } from "@/components/ui/variable-input";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import { CredentialType } from "@/generated/prisma";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { XIcon, ChevronDown, Send, FileEdit, Mail } from "lucide-react";

const attachmentSchema = z.object({
  filename: z.string(),
  contentBase64: z.string(),
});

const formSchema = z.object({
  credentialId: z.string().min(1, "Credential is required"),
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  attachmentsManual: z.array(attachmentSchema),
  attachmentsVariable: z.string().optional(),
  from: z.string().optional(),
  hasAttachment: z.boolean().optional(),
  attachmentType: z.string().optional(),
  subjectContains: z.string().optional(),
});

export const GMAIL_ACTIONS = [
  { value: "send" as const, label: "Send email" },
  { value: "draft" as const, label: "Create draft" },
  { value: "get" as const, label: "Get email" },
] as const;

export type GmailAction = (typeof GMAIL_ACTIONS)[number]["value"];

export type GmailFormValues = z.infer<typeof formSchema> & {
  showAttachmentOptions?: boolean;
  action?: GmailAction;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25 MB total

interface GmailNodeContentProps {
  nodeId: string;
  defaultValues: Partial<GmailFormValues>;
  onDataChange: (values: GmailFormValues) => void;
}

export function GmailNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: GmailNodeContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAttachments =
    (defaultValues.attachmentsManual?.length ?? 0) > 0 ||
    !!defaultValues.attachmentsVariable;
  const [showAttachments, setShowAttachments] = useState(
    defaultValues.showAttachmentOptions ?? hasAttachments
  );
  const [action, setAction] = useState<GmailAction>(
    defaultValues.action ?? "send"
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId || "",
      to: defaultValues.to || "",
      subject: defaultValues.subject || "",
      body: defaultValues.body || "",
      attachmentsManual: defaultValues.attachmentsManual ?? [],
      attachmentsVariable: defaultValues.attachmentsVariable || "",
      from: defaultValues.from || "",
      hasAttachment: defaultValues.hasAttachment ?? false,
      attachmentType: defaultValues.attachmentType || "",
      subjectContains: defaultValues.subjectContains || "",
    },
  });

  const manualAttachments = form.watch("attachmentsManual");
  const totalSize = manualAttachments.reduce(
    (acc, a) => acc + (a.contentBase64.length * 3) / 4,
    0,
  );

  useEffect(() => {
    form.reset({
      credentialId: defaultValues.credentialId || "",
      to: defaultValues.to || "",
      subject: defaultValues.subject || "",
      body: defaultValues.body || "",
      attachmentsManual: defaultValues.attachmentsManual ?? [],
      attachmentsVariable: defaultValues.attachmentsVariable || "",
      from: defaultValues.from || "",
      hasAttachment: defaultValues.hasAttachment ?? false,
      attachmentType: defaultValues.attachmentType || "",
      subjectContains: defaultValues.subjectContains || "",
    });
    setShowAttachments(
      defaultValues.showAttachmentOptions ?? hasAttachments
    );
    setAction(defaultValues.action ?? "send");
  }, [
    defaultValues.credentialId,
    defaultValues.to,
    defaultValues.subject,
    defaultValues.body,
    defaultValues.attachmentsManual,
    defaultValues.attachmentsVariable,
    defaultValues.showAttachmentOptions,
    defaultValues.action,
    defaultValues.from,
    defaultValues.hasAttachment,
    defaultValues.attachmentType,
    defaultValues.subjectContains,
    hasAttachments,
    form,
  ]);

  const syncGetEmailData = useCallback(
    (value: z.infer<typeof formSchema>) => {
      const raw = value.attachmentsManual ?? [];
      const attachmentsManual = raw.filter(
        (a): a is { filename: string; contentBase64: string } =>
          !!a &&
          typeof a.filename === "string" &&
          typeof a.contentBase64 === "string"
      );
      onDataChange({
        credentialId: value.credentialId ?? "",
        to: value.to ?? "",
        subject: value.subject ?? "",
        body: value.body ?? "",
        attachmentsManual,
        attachmentsVariable: value.attachmentsVariable,
        showAttachmentOptions: showAttachments,
        action: "get",
        from: value.from ?? "",
        hasAttachment: value.hasAttachment ?? false,
        attachmentType: value.attachmentType ?? "",
        subjectContains: value.subjectContains ?? "",
      });
    },
    [onDataChange, showAttachments]
  );

  const syncSendDraftData = useCallback(
    (value: z.infer<typeof formSchema>) => {
      const raw = value.attachmentsManual ?? [];
      const attachmentsManual = raw.filter(
        (a): a is { filename: string; contentBase64: string } =>
          !!a &&
          typeof a.filename === "string" &&
          typeof a.contentBase64 === "string"
      );
      onDataChange({
        credentialId: value.credentialId ?? "",
        to: value.to ?? "",
        subject: value.subject ?? "",
        body: value.body ?? "",
        attachmentsManual,
        attachmentsVariable: value.attachmentsVariable,
        showAttachmentOptions: showAttachments,
        action,
        from: undefined,
        hasAttachment: undefined,
        attachmentType: undefined,
        subjectContains: undefined,
      });
    },
    [onDataChange, showAttachments, action]
  );

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!value.credentialId) return;
      if (action === "get") {
        syncGetEmailData(value as z.infer<typeof formSchema>);
      } else {
        if (
          value.to !== undefined &&
          value.subject !== undefined &&
          value.body !== undefined
        ) {
          syncSendDraftData(value as z.infer<typeof formSchema>);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, action, syncGetEmailData, syncSendDraftData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const current = form.getValues("attachmentsManual");
    let total = totalSize;

    const toAdd: Array<{ filename: string; contentBase64: string }> = [];

    const readNext = (index: number) => {
      if (index >= files.length) {
        form.setValue("attachmentsManual", [...current, ...toAdd]);
        e.target.value = "";
        return;
      }

      const file = files[index];
      if (file.size > MAX_FILE_SIZE) {
        form.setError("attachmentsManual", {
          message: `"${file.name}" exceeds 5 MB limit`,
        });
        readNext(index + 1);
        return;
      }

      total += file.size;
      if (total > MAX_TOTAL_SIZE) {
        form.setError("attachmentsManual", {
          message: "Total attachments exceed 25 MB",
        });
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        toAdd.push({ filename: file.name, contentBase64: base64 ?? "" });
        readNext(index + 1);
      };
      reader.readAsDataURL(file);
    };

    readNext(0);
  };

  const removeManualAttachment = (index: number) => {
    const next = manualAttachments.filter((_, i) => i !== index);
    form.setValue("attachmentsManual", next);
  };

  const currentActionLabel =
    GMAIL_ACTIONS.find((a) => a.value === action)?.label ?? "Send email";

  const handleActionSelect = (opt: GmailAction) => {
    setAction(opt);
    const v = form.getValues();
    if (opt === "get") {
      onDataChange({
        credentialId: v.credentialId ?? "",
        to: "",
        subject: "",
        body: "",
        attachmentsManual: [],
        attachmentsVariable: v.attachmentsVariable,
        showAttachmentOptions: showAttachments,
        action: "get",
        from: v.from ?? "",
        hasAttachment: v.hasAttachment ?? false,
        attachmentType: v.attachmentType ?? "",
        subjectContains: v.subjectContains ?? "",
      });
    } else {
      onDataChange({
        credentialId: v.credentialId ?? "",
        to: v.to ?? "",
        subject: v.subject ?? "",
        body: v.body ?? "",
        attachmentsManual: v.attachmentsManual ?? [],
        attachmentsVariable: v.attachmentsVariable,
        showAttachmentOptions: showAttachments,
        action: opt,
        from: undefined,
        hasAttachment: undefined,
        attachmentType: undefined,
        subjectContains: undefined,
      });
    }
  };

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-4">
        <div className="nodrag space-y-2">
          <FormLabel className="text-sm font-medium">Action</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full justify-between text-sm font-normal"
              >
                <span className="flex items-center gap-2">
                  {action === "send" ? (
                    <Send className="size-4 shrink-0 text-muted-foreground" />
                  ) : action === "draft" ? (
                    <FileEdit className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {currentActionLabel}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <div className="flex flex-col py-1">
                {GMAIL_ACTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="flex min-h-9 w-full items-center gap-2 px-3 text-left text-sm font-normal hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleActionSelect(opt.value)}
                  >
                    {opt.value === "send" ? (
                      <Send className="size-4 shrink-0 text-muted-foreground" />
                    ) : opt.value === "draft" ? (
                      <FileEdit className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Mail className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-normal">{opt.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
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

        {action === "get" ? (
          <>
            <p className="text-xs text-muted-foreground">
              Workflow runs when new matching emails arrive.
            </p>
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">From (sender)</FormLabel>
                  <FormControl>
                    <VariableInput
                      nodeId={nodeId}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="email@example.com or leave empty"
                      className="nodrag min-h-9 text-sm"
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
                    <VariableInput
                      nodeId={nodeId}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Filter by subject or leave empty"
                      className="nodrag min-h-9 text-sm"
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
            {form.watch("hasAttachment") && (
              <FormField
                control={form.control}
                name="attachmentType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Attachment type (filename)</FormLabel>
                    <FormControl>
                      <VariableInput
                        nodeId={nodeId}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="e.g. pdf or leave empty"
                        className="nodrag min-h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </>
        ) : (
          <>
        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">To</FormLabel>
              <FormControl>
                <VariableInput
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="To"
                  className="nodrag min-h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Subject</FormLabel>
              <FormControl>
                <VariableInput
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Subject"
                  className="nodrag min-h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium">Body</FormLabel>
              <FormControl>
                <VariableTextarea
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Body"
                  className="nodrag min-h-[60px] text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <div className="space-y-2 rounded-lg border-t border-border/60 pt-3">
          <div className="flex items-center justify-between gap-2 nodrag">
            <FormLabel className="text-sm font-medium">Add attachments</FormLabel>
            <Switch
              checked={showAttachments}
              onCheckedChange={(checked) => {
                setShowAttachments(checked);
                const v = form.getValues();
                onDataChange({
                  credentialId: v.credentialId,
                  to: v.to ?? "",
                  subject: v.subject ?? "",
                  body: v.body ?? "",
                  attachmentsManual: v.attachmentsManual ?? [],
                  attachmentsVariable: v.attachmentsVariable,
                  showAttachmentOptions: checked,
                  action,
                });
              }}
              aria-label="Show attachment options"
            />
          </div>
          {showAttachments && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="*/*"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-sm w-full nodrag"
                onClick={() => fileInputRef.current?.click()}
              >
                Add files
              </Button>
              {manualAttachments.length > 0 && (
                <ul className="text-sm space-y-1">
                  {manualAttachments.map((a, i) => (
                    <li
                      key={`${a.filename}-${i}`}
                      className="flex items-center gap-2"
                    >
                      <span className="truncate flex-1">{a.filename}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-5 nodrag"
                        onClick={() => removeManualAttachment(i)}
                        aria-label={`Remove ${a.filename}`}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <FormField
                control={form.control}
                name="attachmentsVariable"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-muted-foreground">
                      From variable (optional)
                    </FormLabel>
                    <FormControl>
                      <VariableInput
                        nodeId={nodeId}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="{{myNode.attachments}}"
                        className="nodrag min-h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
          </>
        )}
      </form>
    </Form>
  );
}

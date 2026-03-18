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
import { VariableInput } from "@/components/ui/variable-input";
import { VariableTextarea } from "@/components/ui/variable-textarea";
import { useWhatsAppTemplates } from "@/features/credentials/hooks/use-credentials";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  AlignLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Plus,
  Upload,
  Video,
  X,
} from "lucide-react";

// ── Message block ──────────────────────────────────────────────────────────────

const MESSAGE_BLOCK_TYPES = [
  { value: "text", label: "Text", icon: AlignLeft },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Mic },
  { value: "document", label: "Document", icon: FileText },
] as const;

type MessageBlockType = (typeof MESSAGE_BLOCK_TYPES)[number]["value"];

const messageBlockSchema = z.object({
  type: z.enum(["text", "image", "audio", "document", "video"]),
  text: z.string().optional(),
  url: z.string().optional(),
  mediaId: z.string().optional(),
  mediaFilename: z.string().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
});

export type MessageBlock = z.infer<typeof messageBlockSchema>;

// ── Carousel card ──────────────────────────────────────────────────────────────

const carouselCardSchema = z.object({
  headerUrl: z.string(),
  headerFormat: z.enum(["IMAGE", "VIDEO"]),
  bodyParams: z.array(z.string()),
  buttonParams: z.array(z.string()),
});

// ── Form ───────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  credentialId: z.string().min(1, "Credential is required"),
  to: z.string().optional(),
  body: z.string().optional(),
  messages: z.array(messageBlockSchema).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateHeaderCount: z.number().optional(),
  templateHeaderFormat: z.enum(["TEXT", "DOCUMENT", "IMAGE", "VIDEO", "NONE"]).optional(),
  templateParams: z.array(z.string()).optional(),
  templateParamNames: z.array(z.string()).optional(),
  isCarousel: z.boolean().optional(),
  outerBodyParams: z.array(z.string()).optional(),
  carouselCards: z.array(carouselCardSchema).optional(),
});

export const WHATSAPP_ACTIONS = [
  { value: "send_messages" as const, label: "Send message" },
  { value: "send_template" as const, label: "Send template message" },
] as const;

export type WhatsAppAction = (typeof WHATSAPP_ACTIONS)[number]["value"] | "send_text";

export type WhatsAppFormValues = z.infer<typeof formSchema> & {
  action?: WhatsAppAction;
};


interface WhatsAppNodeContentProps {
  nodeId: string;
  defaultValues: Partial<WhatsAppFormValues>;
  onDataChange: (values: WhatsAppFormValues) => void;
}

// ── MessageBlockItem ───────────────────────────────────────────────────────────

const UPLOADABLE_TYPES = ["image", "video", "audio", "document"] as const;
type UploadableType = (typeof UPLOADABLE_TYPES)[number];

const ACCEPTED_MIME: Record<UploadableType, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/3gpp,video/quicktime,video/*",
  audio: "audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,audio/*",
  document: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.doc,.docx,.txt",
};

function MessageBlockItem({
  nodeId,
  block,
  credentialId,
  onChange,
  onRemove,
}: {
  nodeId: string;
  block: MessageBlock;
  credentialId?: string;
  onChange: (patch: Partial<MessageBlock>) => void;
  onRemove: () => void;
}) {
  const meta = MESSAGE_BLOCK_TYPES.find((t) => t.value === block.type);
  const Icon = meta?.icon ?? AlignLeft;
  const hasUrl = block.type !== "text";
  const hasCaption = block.type === "image" || block.type === "video" || block.type === "document";
  const hasFilename = block.type === "document";
  const isUploadable = UPLOADABLE_TYPES.includes(block.type as UploadableType);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !credentialId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("credentialId", credentialId);
      fd.append("file", file);
      const res = await fetch("/api/whatsapp-media-upload", { method: "POST", body: fd });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setUploadError(json.error ?? "Upload failed");
        return;
      }
      onChange({ mediaId: json.id, mediaFilename: file.name, url: "" });
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium">{meta?.label}</span>
        <button
          type="button"
          className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {block.type === "text" && (
        <VariableTextarea
          nodeId={nodeId}
          value={block.text ?? ""}
          onChange={(v: string) => onChange({ text: v })}
          placeholder="Message text"
          className="nodrag min-h-[60px] text-sm"
        />
      )}

      {hasUrl && isUploadable && (
        <>
          {block.mediaId ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
              <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
              <span className="truncate text-muted-foreground">{block.mediaFilename ?? "Uploaded file"}</span>
              <button
                type="button"
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ mediaId: undefined, mediaFilename: undefined })}
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIME[block.type as UploadableType]}
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                className="nodrag h-7 w-full gap-1.5 text-xs text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Upload className="size-3" />
                )}
                {uploading ? "Uploading…" : "Upload file"}
              </Button>
              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
            </>
          )}
        </>
      )}

      {hasCaption && (
        <VariableInput
          nodeId={nodeId}
          value={block.caption ?? ""}
          onChange={(v: string) => onChange({ caption: v })}
          placeholder="Caption (optional)"
          className="nodrag overflow-hidden whitespace-nowrap text-sm"
        />
      )}

    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WhatsAppNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: WhatsAppNodeContentProps) {
  // Normalise legacy send_text → send_messages
  const resolveAction = (a?: WhatsAppAction): WhatsAppAction =>
    a === "send_text" ? "send_messages" : (a ?? "send_messages");

  const [action, setAction] = useState<WhatsAppAction>(resolveAction(defaultValues.action));

  // Convert legacy body → messages on load
  const resolveMessages = (dv: Partial<WhatsAppFormValues>): MessageBlock[] => {
    if (dv.messages && dv.messages.length > 0) return dv.messages;
    if (dv.body) return [{ type: "text", text: dv.body }];
    return [];
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId || "",
      to: defaultValues.to || "",
      body: defaultValues.body || "",
      messages: resolveMessages(defaultValues),
      templateName: defaultValues.templateName || "",
      templateLanguage: defaultValues.templateLanguage || "",
      templateHeaderCount: defaultValues.templateHeaderCount ?? 0,
      templateHeaderFormat: defaultValues.templateHeaderFormat ?? "NONE",
      templateParams: defaultValues.templateParams ?? [],
      templateParamNames: defaultValues.templateParamNames ?? [],
      isCarousel: defaultValues.isCarousel ?? false,
      outerBodyParams: defaultValues.outerBodyParams ?? [],
      carouselCards: defaultValues.carouselCards ?? [],
    },
  });

  const { data: templatesData } = useWhatsAppTemplates(
    form.watch("credentialId") || undefined,
    action === "send_template",
  );
  const templates = templatesData?.templates ?? [];

  useEffect(() => {
    form.reset({
      credentialId: defaultValues.credentialId || "",
      to: defaultValues.to || "",
      body: defaultValues.body || "",
      messages: resolveMessages(defaultValues),
      templateName: defaultValues.templateName || "",
      templateLanguage: defaultValues.templateLanguage || "",
      templateHeaderCount: defaultValues.templateHeaderCount ?? 0,
      templateHeaderFormat: defaultValues.templateHeaderFormat ?? "NONE",
      templateParams: defaultValues.templateParams ?? [],
      templateParamNames: defaultValues.templateParamNames ?? [],
      isCarousel: defaultValues.isCarousel ?? false,
      outerBodyParams: defaultValues.outerBodyParams ?? [],
      carouselCards: defaultValues.carouselCards ?? [],
    });
    setAction(resolveAction(defaultValues.action));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultValues.credentialId,
    defaultValues.to,
    defaultValues.body,
    defaultValues.action,
    defaultValues.messages,
    defaultValues.templateName,
    defaultValues.templateLanguage,
    defaultValues.templateHeaderCount,
    defaultValues.templateHeaderFormat,
    defaultValues.templateParams,
    defaultValues.templateParamNames,
    defaultValues.isCarousel,
    defaultValues.outerBodyParams,
    defaultValues.carouselCards,
    form,
  ]);

  const syncData = useCallback(
    (value: z.infer<typeof formSchema>) => {
      onDataChange({
        credentialId: value.credentialId ?? "",
        to: value.to ?? "",
        body: value.body ?? "",
        messages: value.messages ?? [],
        templateName: value.templateName ?? "",
        templateLanguage: value.templateLanguage ?? "",
        templateHeaderCount: value.templateHeaderCount ?? 0,
        templateHeaderFormat: value.templateHeaderFormat ?? "NONE",
        templateParams: value.templateParams ?? [],
        templateParamNames: value.templateParamNames ?? [],
        isCarousel: value.isCarousel ?? false,
        outerBodyParams: value.outerBodyParams ?? [],
        carouselCards: value.carouselCards ?? [],
        action,
      });
    },
    [onDataChange, action],
  );

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!value.credentialId) return;
      syncData(value as z.infer<typeof formSchema>);
    });
    return () => subscription.unsubscribe();
  }, [form, syncData]);

  const handleActionSelect = (opt: WhatsAppAction) => {
    setAction(opt);
    const v = form.getValues();
    onDataChange({
      credentialId: v.credentialId ?? "",
      to: v.to ?? "",
      body: v.body ?? "",
      messages: v.messages ?? [],
      templateName: v.templateName ?? "",
      templateLanguage: v.templateLanguage ?? "",
      templateHeaderCount: v.templateHeaderCount ?? 0,
      templateHeaderFormat: v.templateHeaderFormat ?? "NONE",
      templateParams: v.templateParams ?? [],
      templateParamNames: v.templateParamNames ?? [],
      isCarousel: v.isCarousel ?? false,
      outerBodyParams: v.outerBodyParams ?? [],
      carouselCards: v.carouselCards ?? [],
      action: opt,
    });
  };

  const currentActionLabel =
    WHATSAPP_ACTIONS.find((a) => a.value === action)?.label ?? "Send message";

  // ── message block helpers ────────────────────────────────────────────────────
  const messages = form.watch("messages") ?? [];

  const addBlock = (type: MessageBlockType) => {
    const next: MessageBlock[] = [...messages, { type }];
    form.setValue("messages", next);
    syncData({ ...form.getValues(), messages: next });
  };

  const updateBlock = (i: number, patch: Partial<MessageBlock>) => {
    const next = messages.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    form.setValue("messages", next);
    syncData({ ...form.getValues(), messages: next });
  };

  const removeBlock = (i: number) => {
    const next = messages.filter((_, idx) => idx !== i);
    form.setValue("messages", next);
    syncData({ ...form.getValues(), messages: next });
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <Form {...form}>
      <form className="flex w-full min-w-0 flex-col space-y-4">
        {/* Action */}
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
                  <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
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
                {WHATSAPP_ACTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="flex min-h-9 w-full items-center gap-2 px-3 text-left text-sm font-normal hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleActionSelect(opt.value)}
                  >
                    <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-normal">{opt.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Credential */}
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

        {/* To */}
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
                  placeholder="Recipient phone e.g. 573001234567"
                  className="nodrag overflow-hidden whitespace-nowrap text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* ── Send message (multi-block) ───────────────────────────────────── */}
        {(action === "send_messages" || action === "send_text") && (
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Content</FormLabel>

            {messages.length > 0 && (
              <div className="space-y-2">
                {messages.map((block, i) => (
                  <MessageBlockItem
                    key={i}
                    nodeId={nodeId}
                    block={block}
                    credentialId={form.watch("credentialId") || undefined}
                    onChange={(patch) => updateBlock(i, patch)}
                    onRemove={() => removeBlock(i)}
                  />
                ))}
              </div>
            )}

            {/* Add content */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="nodrag h-8 w-full gap-1.5 text-xs text-muted-foreground"
                >
                  <Plus className="size-3.5" />
                  Add content
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-1"
                align="start"
              >
                {MESSAGE_BLOCK_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => addBlock(value)}
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* ── Template ────────────────────────────────────────────────────── */}
        {action === "send_template" && (
          <FormField
            control={form.control}
            name="templateName"
            render={({ field }) => (
              <FormItem className="w-full min-w-0 space-y-2">
                <FormLabel className="text-sm font-medium">Template</FormLabel>
                <Select
                  value={
                    field.value && form.watch("templateLanguage")
                      ? `${field.value}::${form.watch("templateLanguage")}`
                      : ""
                  }
                  onValueChange={(val) => {
                    const [name, lang] = val.split("::");
                    const selected = templates.find(
                      (t) => t.name === (name ?? "") && t.language === (lang ?? ""),
                    );
                    const headerCount = selected?.headerParameterCount ?? 0;
                    const bodyCount = selected?.bodyParameterCount ?? 0;
                    const totalParamCount = headerCount + bodyCount;
                    const current = form.getValues().templateParams ?? [];
                    const newParams = Array.from({ length: totalParamCount }, (_, i) =>
                      current[i] !== undefined ? current[i] : "",
                    );
                    const newParamNames = selected?.bodyParameterNames ?? [];
                    const newHeaderFormat = selected?.headerFormat ?? "NONE";
                    const newIsCarousel = selected?.isCarousel ?? false;
                    const newCarouselCards = (selected?.carouselCards ?? []).map((card) => ({
                      headerUrl: "",
                      headerFormat: card.headerFormat,
                      bodyParams: Array.from({ length: card.bodyParamCount }, () => ""),
                      buttonParams: card.buttons.map(() => ""),
                    }));
                    const newOuterBodyParams = Array.from({ length: selected?.bodyParameterCount ?? 0 }, () => "");
                    field.onChange(name ?? "");
                    form.setValue("templateLanguage", lang ?? "");
                    form.setValue("templateHeaderCount", headerCount);
                    form.setValue("templateHeaderFormat", newHeaderFormat);
                    form.setValue("templateParams", newParams);
                    form.setValue("templateParamNames", newParamNames);
                    form.setValue("isCarousel", newIsCarousel);
                    form.setValue("carouselCards", newCarouselCards);
                    form.setValue("outerBodyParams", newOuterBodyParams);
                    syncData({
                      ...form.getValues(),
                      templateName: name ?? "",
                      templateLanguage: lang ?? "",
                      templateHeaderCount: headerCount,
                      templateHeaderFormat: newHeaderFormat,
                      templateParams: newParams,
                      templateParamNames: newParamNames,
                      isCarousel: newIsCarousel,
                      carouselCards: newCarouselCards,
                      outerBodyParams: newOuterBodyParams,
                    });
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="nodrag min-h-9 w-full max-w-full overflow-hidden text-sm">
                      {field.value ? (
                        <span className="truncate">{field.value}</span>
                      ) : (
                        <span className="text-muted-foreground">Select template (requires WABA ID in credential)</span>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {templates.map((t) => (
                      <SelectItem
                        key={`${t.name}_${t.language}`}
                        value={`${t.name}::${t.language}`}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="ml-1 shrink-0 text-xs text-muted-foreground">({t.language})</span>
                      </SelectItem>
                    ))}
                    {form.watch("credentialId") && (
                      <div className="border-t p-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            const credId = form.getValues("credentialId");
                            window.open(`/create-whatsapp-template/${credId}`, "_blank");
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create new template
                        </button>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}

        {action === "send_template" && (() => {
          const templateName = form.watch("templateName");
          const templateLanguage = form.watch("templateLanguage");
          const selectedTemplate =
            templates.find((t) => t.name === templateName && t.language === templateLanguage) ??
            templates.find((t) => t.name === templateName);
          if (!templateName) return null;

          // ── Carousel ──────────────────────────────────────────────────────
          if (selectedTemplate?.isCarousel) {
            const outerBodyNames = selectedTemplate.bodyParameterNames ?? [];
            const cardsMeta = selectedTemplate.carouselCards ?? [];
            return (
              <div className="space-y-3">
                {outerBodyNames.length > 0 && (
                  <FormField
                    control={form.control}
                    name="outerBodyParams"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">Message parameters</FormLabel>
                        <div className="nodrag flex w-full min-w-0 flex-col gap-2">
                          {outerBodyNames.map((paramName, i) => (
                            <div key={`outer-${paramName}`} className="min-w-0 space-y-1">
                              <FormLabel className="text-xs text-muted-foreground">{paramName}</FormLabel>
                              <VariableInput
                                nodeId={nodeId}
                                value={field.value?.[i] ?? ""}
                                onChange={(v: string) => {
                                  const next = Array.from({ length: outerBodyNames.length }, (_, j) =>
                                    j === i ? v : field.value?.[j] ?? "",
                                  );
                                  field.onChange(next);
                                  syncData({ ...form.getValues(), outerBodyParams: next });
                                }}
                                placeholder={`Value for {{${paramName}}}`}
                                className="overflow-hidden whitespace-nowrap text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="carouselCards"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Cards ({cardsMeta.length})</FormLabel>
                      <div className="nodrag flex w-full min-w-0 flex-col gap-3">
                        {cardsMeta.map((cardMeta, cardIdx) => {
                          const cardVal = field.value?.[cardIdx] ?? { headerUrl: "", headerFormat: cardMeta.headerFormat, bodyParams: [], buttonParams: [] };
                          const updateCard = (patch: Partial<typeof cardVal>) => {
                            const next = (field.value ?? []).map((c, i) => i === cardIdx ? { ...c, ...patch } : c);
                            field.onChange(next);
                            syncData({ ...form.getValues(), carouselCards: next });
                          };
                          const dynamicButtons = cardMeta.buttons.filter((b) => b.hasDynamicUrl);
                          return (
                            <div key={`${templateName ?? ""}-${templateLanguage ?? ""}-card-${cardIdx}`} className="w-full min-w-0 rounded-md border border-border bg-muted/20 p-3 space-y-2">
                              <FormLabel className="text-xs font-semibold text-foreground">Card {cardIdx + 1}</FormLabel>
                              <div className="min-w-0 space-y-1">
                                <FormLabel className="text-xs text-muted-foreground">
                                  {cardMeta.headerFormat === "VIDEO" ? "Video URL" : "Image URL"}
                                </FormLabel>
                                <VariableInput
                                  nodeId={nodeId}
                                  value={cardVal.headerUrl ?? ""}
                                  onChange={(v: string) => updateCard({ headerUrl: v, headerFormat: cardMeta.headerFormat })}
                                  placeholder={`Public ${cardMeta.headerFormat === "VIDEO" ? "video" : "image"} URL`}
                                  className="overflow-hidden whitespace-nowrap text-sm"
                                />
                              </div>
                              {cardMeta.bodyParamNames.map((paramName, paramIdx) => (
                                <div key={`card-${cardIdx}-${paramName}`} className="min-w-0 space-y-1">
                                  <FormLabel className="text-xs text-muted-foreground">
                                    {paramName}
                                    {cardMeta.bodyParamExamples?.[paramIdx] ? ` (e.g. ${cardMeta.bodyParamExamples[paramIdx]})` : ""}
                                  </FormLabel>
                                  <VariableInput
                                    nodeId={nodeId}
                                    value={cardVal.bodyParams?.[paramIdx] ?? ""}
                                    onChange={(v: string) => {
                                      const next = Array.from({ length: cardMeta.bodyParamCount }, (_, j) =>
                                        j === paramIdx ? v : cardVal.bodyParams?.[j] ?? "",
                                      );
                                      updateCard({ bodyParams: next });
                                    }}
                                    placeholder={`Value for {{${paramName}}}`}
                                    className="overflow-hidden whitespace-nowrap text-sm"
                                  />
                                </div>
                              ))}
                              {dynamicButtons.map((btn) => (
                                <div key={`card-${cardIdx}-btn-${btn.index}`} className="min-w-0 space-y-1">
                                  <FormLabel className="text-xs text-muted-foreground">
                                    &quot;{btn.text}&quot; button URL suffix
                                  </FormLabel>
                                  <VariableInput
                                    nodeId={nodeId}
                                    value={cardVal.buttonParams?.[btn.index] ?? ""}
                                    onChange={(v: string) => {
                                      const next = Array.from({ length: cardMeta.buttons.length }, (_, j) =>
                                        j === btn.index ? v : cardVal.buttonParams?.[j] ?? "",
                                      );
                                      updateCard({ buttonParams: next });
                                    }}
                                    placeholder="URL suffix (e.g. product-slug)"
                                    className="overflow-hidden whitespace-nowrap text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            );
          }

          // ── Regular template ───────────────────────────────────────────────
          const headerCount = selectedTemplate?.headerParameterCount ?? 0;
          const headerFormat = selectedTemplate?.headerFormat ?? "TEXT";
          const bodyCount = selectedTemplate?.bodyParameterCount ?? 0;
          const totalParamCount = headerCount + bodyCount;
          if (totalParamCount === 0) {
            return (
              <div className="rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                No parameters detected for this template. If it has variables
                (e.g. &#123;&#123;1&#125;&#125; or &#123;&#123;customer_name&#125;&#125;), refresh the
                page after selecting the template, or check that your WhatsApp
                credential has the correct Business Account ID.
              </div>
            );
          }
          const headerLabel: Record<string, string> = { DOCUMENT: "Document URL", IMAGE: "Image URL", VIDEO: "Video URL", TEXT: "Header" };
          const headerPlaceholder: Record<string, string> = {
            DOCUMENT: "Public URL of the document (e.g. https://...invoice.pdf)",
            IMAGE: "Public URL of the image (e.g. https://...photo.jpg)",
            VIDEO: "Public URL of the video (e.g. https://...video.mp4)",
            TEXT: "Value for header",
          };
          return (
            <FormField
              control={form.control}
              name="templateParams"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">Template parameters</FormLabel>
                  <div className="nodrag flex w-full min-w-0 flex-col gap-2">
                    {Array.from({ length: totalParamCount }, (_, i) => {
                      const isHeader = i < headerCount;
                      const label = isHeader
                        ? (headerLabel[headerFormat] ?? "Header")
                        : selectedTemplate?.bodyParameterNames?.[i - headerCount] ?? `Param ${i + 1}`;
                      const example = isHeader ? "" : selectedTemplate?.bodyParameterExamples?.[i - headerCount];
                      return (
                        <div key={`${templateName ?? ""}-${templateLanguage ?? ""}-param-${i}`} className="min-w-0 space-y-1">
                          <FormLabel className="text-xs text-muted-foreground">
                            {label}{example ? ` (e.g. ${example})` : ""}
                          </FormLabel>
                          <VariableInput
                            nodeId={nodeId}
                            value={field.value?.[i] ?? ""}
                            onChange={(v: string) => {
                              const prev = field.value ?? [];
                              const next = Array.from({ length: totalParamCount }, (_, j) => j === i ? v : prev[j] ?? "");
                              field.onChange(next);
                              syncData({ ...form.getValues(), templateParams: next });
                            }}
                            placeholder={isHeader ? (headerPlaceholder[headerFormat] ?? "Value for header") : `Value for {{${label}}}`}
                            className="overflow-hidden whitespace-nowrap text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          );
        })()}
      </form>
    </Form>
  );
}

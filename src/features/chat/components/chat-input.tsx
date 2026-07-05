"use client";

import {
  LoaderIcon,
  MicIcon,
  PlusIcon,
  SendHorizonalIcon,
  SmileIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { compressImage } from "../lib/compress";
import { AttachmentPicker } from "./attachment-picker";
import { CatalogPicker } from "./catalog-picker";
import { QuickReplyPicker } from "./quick-reply-picker";
import { RecordingBar } from "./recording-bar";
import type { ReplyTarget } from "./replied-message";
import { ReplyInputPreview } from "./reply-input-preview";
import { TemplatePicker } from "./template-picker";
import { useVoiceRecorder } from "./use-voice-recorder";

export interface SendPayload {
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
  replyTo?: ReplyTarget;
}

const MAX_BYTES = 25 * 1024 * 1024;

interface PendingImage {
  id: string;
  file: File;
  objectUrl: string;
}

export interface ChatInputProps {
  conversationId?: string;
  credentialId?: string | null;
  replyTo?: ReplyTarget;
  onCancelReply?: () => void;
  onSend?: (payload: SendPayload) => void;
  onSendMedia?: (file: File, caption: string) => void;
}

export function ChatInput({
  conversationId,
  credentialId,
  replyTo,
  onCancelReply,
  onSend,
  onSendMedia,
}: ChatInputProps) {
  const { textInput } = usePromptInputController();
  const hasText = textInput.value.trim().length > 0;

  const formRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  useEffect(() => {
    return () => { pendingImagesRef.current.forEach((p) => { URL.revokeObjectURL(p.objectUrl); }); };
  }, []);

  const recorder = useVoiceRecorder(useCallback((file: File) => {
    onSendMedia?.(file, "");
  }, [onSendMedia]));

  const isRequesting = recorder.state === "requesting";
  const isRecording  = recorder.state === "recording";

  const hasPending = pendingImages.length > 0;
  const canSend = hasText || hasPending;

  async function handleTextSubmit({ text }: { text: string }) {
    if (!canSend) return;
    for (const pending of pendingImages) {
      await onSendMedia?.(pending.file, "");
      URL.revokeObjectURL(pending.objectUrl);
    }
    setPendingImages([]);
    if (text.trim()) {
      onSend?.({ text, replyTo });
      onCancelReply?.();
    }
    formRef.current?.querySelector("textarea")?.focus();
  }

  async function handleImageFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !conversationId) return;

    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) { alert("El archivo no puede superar 25 MB."); return; }

    const compressed = await Promise.all(
      files.map((f) => f.type.startsWith("image/") ? compressImage(f) : Promise.resolve(f)),
    );

    const next: PendingImage[] = compressed.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      objectUrl: URL.createObjectURL(file),
    }));

    setPendingImages((prev) => [...prev, ...next]);
    setPopoverOpen(false);
  }

  async function handleDocFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw || !conversationId) return;
    if (raw.size > MAX_BYTES) { alert("El archivo no puede superar 25 MB."); return; }
    onSendMedia?.(raw, "");
    formRef.current?.querySelector("textarea")?.focus();
  }

  function removePendingImage(id: string) {
    setPendingImages((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handleActionClick(id: string) {
    setPopoverOpen(false);
    if (id === "templates") setTemplateOpen(true);
    if (id === "catalog") setCatalogOpen(true);
    if (id === "quick-replies") setQuickRepliesOpen(true);
  }

  return (
    <div ref={formRef} className="pb-8 pt-1 md:py-4">
      {replyTo && <ReplyInputPreview reply={replyTo} onCancel={() => onCancelReply?.()} />}
      <div className="px-4">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleImageFilesChange}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,audio/*"
          className="hidden"
          onChange={handleDocFileChange}
        />

        <QuickReplyPicker
          open={quickRepliesOpen}
          onClose={() => setQuickRepliesOpen(false)}
        />
        {conversationId && credentialId && (
          <>
            <TemplatePicker
              open={templateOpen}
              onClose={() => setTemplateOpen(false)}
              conversationId={conversationId}
              credentialId={credentialId}
            />
            <CatalogPicker
              open={catalogOpen}
              onClose={() => setCatalogOpen(false)}
              conversationId={conversationId}
              credentialId={credentialId}
            />
          </>
        )}

        {isRecording ? (
          <RecordingBar
            duration={recorder.duration}
            analyserRef={recorder.analyserRef}
            onCancel={recorder.cancel}
            onStop={recorder.stop}
          />
        ) : (
          <PromptInput onSubmit={handleTextSubmit} className="[&_[data-slot=input-group]]:rounded-2xl">
            {hasPending && (
              <div className="flex w-full gap-2 overflow-x-auto px-1 pb-1 pt-2 scrollbar-none">
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.objectUrl}
                      alt={img.file.name}
                      className="size-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingImage(img.id)}
                      className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background shadow"
                      aria-label="Quitar imagen"
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <PromptInputTextarea
              placeholder="Mensaje..."
              className="min-h-0! max-h-32 py-2 text-sm"
            />
            <PromptInputFooter className="pt-1">
              <div className="flex items-center gap-1">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85"
                    >
                      <PlusIcon className="size-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" sideOffset={10} className="w-auto p-1.5 rounded-3xl md:mb-12">
                    <AttachmentPicker
                      onImageClick={() => { setPopoverOpen(false); imageInputRef.current?.click(); }}
                      onDocClick={() => { setPopoverOpen(false); docInputRef.current?.click(); }}
                      onAction={handleActionClick}
                    />
                  </PopoverContent>
                </Popover>

                <PromptInputButton tooltip="Emoji">
                  <SmileIcon className="size-6" />
                </PromptInputButton>
              </div>

              {canSend ? (
                <PromptInputSubmit className="size-10 rounded-full">
                  <SendHorizonalIcon className="size-4" />
                </PromptInputSubmit>
              ) : (
                <button
                  type="button"
                  onClick={() => { void recorder.start(); }}
                  disabled={isRequesting}
                  className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  aria-label="Grabar nota de voz"
                >
                  {isRequesting
                    ? <LoaderIcon className="size-4 animate-spin" />
                    : <MicIcon className="size-4" />}
                </button>
              )}
            </PromptInputFooter>
          </PromptInput>
        )}
      </div>
    </div>
  );
}

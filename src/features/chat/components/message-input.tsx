"use client";

import {
  BookOpenIcon,
  ImageIcon,
  LayoutTemplateIcon,
  MapPinIcon,
  MessageSquareQuoteIcon,
  MicIcon,
  PlusIcon,
  SendHorizonalIcon,
  ShoppingBagIcon,
  SmileIcon,
} from "lucide-react";
import { useRef, useState } from "react";
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
import { CatalogPicker } from "./catalog-picker";
import { TemplatePicker } from "./template-picker";

export interface SendPayload {
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
}

const MAX_BYTES = 25 * 1024 * 1024;

interface MessageInputProps {
  conversationId?: string;
  credentialId?: string | null;
  onSend?: (payload: SendPayload) => void;
  onSendMedia?: (file: File, caption: string) => void;
}

const ATTACH_OPTIONS = [
  { id: "images", label: "Imágenes", icon: ImageIcon, accept: "image/*,video/*" },
  { id: "docs",   label: "Archivos", icon: BookOpenIcon, accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,audio/*" },
] as const;

const ACTION_OPTIONS = [
  { id: "location",      label: "Ubicación",        icon: MapPinIcon              },
  { id: "quick-replies", label: "Respuestas rápidas", icon: MessageSquareQuoteIcon  },
  { id: "catalog",       label: "Catálogo",          icon: ShoppingBagIcon         },
  { id: "templates",     label: "Plantillas",        icon: LayoutTemplateIcon      },
] as const;

function SubmitIcon() {
  const { textInput } = usePromptInputController();
  return textInput.value.trim()
    ? <SendHorizonalIcon className="size-4" />
    : <MicIcon className="size-4" />;
}

export function MessageInput({ conversationId, credentialId, onSend, onSendMedia }: MessageInputProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  function handleTextSubmit({ text }: { text: string }) {
    if (!text.trim()) return;
    onSend?.({ text });
    formRef.current?.querySelector("textarea")?.focus();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw || !conversationId) return;

    if (raw.size > MAX_BYTES) {
      alert("El archivo no puede superar 25 MB.");
      return;
    }

    const file = raw.type.startsWith("image/") ? await compressImage(raw) : raw;
    onSendMedia?.(file, "");
    formRef.current?.querySelector("textarea")?.focus();
  }

  function openFilePicker(accept: string) {
    setPopoverOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
      fileInputRef.current.accept = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar";
    }
  }

  function handleActionClick(id: string) {
    setPopoverOpen(false);
    if (id === "templates") setTemplateOpen(true);
    if (id === "catalog") setCatalogOpen(true);
  }

  return (
    <div ref={formRef} className="px-4 py-8 md:py-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar"
        className="hidden"
        onChange={handleFileChange}
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

      <PromptInput onSubmit={handleTextSubmit} className="[&_[data-slot=input-group]]:rounded-2xl">
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
              <PopoverContent side="top" align="start" sideOffset={10} className="p-1.5 md:mb-12">
                <div className="flex flex-col">
                  {ATTACH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => openFilePicker(opt.accept)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <opt.icon className="size-4 shrink-0 text-muted-foreground" />
                      {opt.label}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-border" />
                  {ACTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleActionClick(opt.id)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <opt.icon className="size-4 shrink-0 text-muted-foreground" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <PromptInputButton tooltip="Emoji">
              <SmileIcon className="size-6" />
            </PromptInputButton>
          </div>
          <PromptInputSubmit className="size-10 rounded-full"><SubmitIcon /></PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

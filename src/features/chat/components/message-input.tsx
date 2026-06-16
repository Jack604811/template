"use client";

import { ImageIcon, PlusIcon, SmileIcon } from "lucide-react";
import { useRef } from "react";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

interface MessageInputProps {
  onSend?: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleSubmit({ text }: { text: string }) {
    if (!text.trim()) return;
    onSend?.(text);
    ref.current?.querySelector("textarea")?.focus();
  }

  return (
    <div ref={ref} className="px-4 py-3">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          placeholder="Message..."
          className="min-h-0! max-h-32 py-2 text-sm"
        />
        <PromptInputFooter className="pt-1">
          <div className="flex items-center gap-1">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="Attach">
                <PlusIcon className="size-4" />
              </PromptInputActionMenuTrigger>
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <PromptInputButton tooltip="Emoji">
              <SmileIcon className="size-4" />
            </PromptInputButton>
            <PromptInputButton tooltip="Image">
              <ImageIcon className="size-4" />
            </PromptInputButton>
          </div>
          <PromptInputSubmit className="size-10 rounded-full" />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

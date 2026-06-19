"use client";

import {
  ArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  SendHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOC_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pdf:  { icon: FileTextIcon,        color: "text-red-400",    label: "PDF" },
  doc:  { icon: FileTextIcon,        color: "text-blue-400",   label: "Word" },
  docx: { icon: FileTextIcon,        color: "text-blue-400",   label: "Word" },
  xls:  { icon: FileSpreadsheetIcon, color: "text-green-400",  label: "Excel" },
  xlsx: { icon: FileSpreadsheetIcon, color: "text-green-400",  label: "Excel" },
  csv:  { icon: FileSpreadsheetIcon, color: "text-green-400",  label: "CSV" },
  ppt:  { icon: FileIcon,            color: "text-orange-400", label: "PowerPoint" },
  pptx: { icon: FileIcon,            color: "text-orange-400", label: "PowerPoint" },
  zip:  { icon: ArchiveIcon,         color: "text-yellow-400", label: "ZIP" },
  rar:  { icon: ArchiveIcon,         color: "text-yellow-400", label: "RAR" },
};

interface MediaPreviewSheetProps {
  file: File | null;
  onClose: () => void;
  onSend: (caption: string) => void;
}

export function MediaPreviewSheet({ file, onClose, onSend }: MediaPreviewSheetProps) {
  const [caption, setCaption] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!file) {
      setVisible(false);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setCaption("");
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => textareaRef.current?.focus(), 180);
    return () => {
      clearTimeout(t);
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [file]);

  if (!file) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const docMeta = DOC_META[ext];
  const DocIcon = docMeta?.icon ?? FileIcon;
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  function handleSend() {
    onSend(caption.trim());
    setCaption("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") onClose();
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setCaption(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-black transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-2 px-2">
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <XIcon className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-medium text-white">{file.name}</p>
          <p className="text-[11px] text-white/40">{formatBytes(file.size)}</p>
        </div>
        <div className="size-10 shrink-0" />
      </div>

      {/* Preview */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        {isImage && objectUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={objectUrl}
            alt={file.name}
            className="max-h-full max-w-full rounded-2xl object-contain drop-shadow-2xl"
          />
        ) : isVideo && objectUrl ? (
          <video
            src={objectUrl}
            controls
            className="max-h-full max-w-full rounded-2xl drop-shadow-2xl"
          >
            <track kind="captions" />
          </video>
        ) : (
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-white/5 px-12 py-14">
            <div className="flex size-24 items-center justify-center rounded-3xl bg-white/10">
              <DocIcon className={cn("size-12", docMeta?.color ?? "text-white/60")} />
            </div>
            <div className="max-w-[240px] text-center">
              <p className="break-all text-[15px] font-semibold leading-snug text-white">{file.name}</p>
              <p className="mt-1.5 text-[13px] text-white/45">
                {docMeta?.label ?? ext.toUpperCase()} · {formatBytes(file.size)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Caption + send */}
      <div className="shrink-0 px-4 pb-10 pt-3">
        <div className="flex items-end gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2.5">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Añadir un pie de foto..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm leading-5 text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <SendHorizontalIcon className="size-4 translate-x-px" />
          </button>
        </div>
      </div>
    </div>
  );
}

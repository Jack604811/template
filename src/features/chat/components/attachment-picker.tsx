"use client";

import {
  BookOpenIcon,
  ImageIcon,
  LayoutTemplateIcon,
  MessageSquareQuoteIcon,
  ShoppingBagIcon,
} from "lucide-react";

interface AttachmentPickerProps {
  onImageClick: () => void;
  onDocClick: () => void;
  onAction: (id: "quick-replies" | "catalog" | "templates") => void;
}

export function AttachmentPicker({ onImageClick, onDocClick, onAction }: AttachmentPickerProps) {
  return (
    <div className="grid grid-cols-3">
      <button type="button" onClick={onImageClick} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center active:opacity-70">
        <div className="flex size-11 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
          <ImageIcon className="size-5 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="text-[11px] font-medium leading-tight text-foreground">Imágenes</span>
      </button>
      <button type="button" onClick={onDocClick} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center active:opacity-70">
        <div className="flex size-11 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
          <BookOpenIcon className="size-5 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="text-[11px] font-medium leading-tight text-foreground">Archivos</span>
      </button>
      <button type="button" onClick={() => onAction("quick-replies")} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center active:opacity-70">
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <MessageSquareQuoteIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] font-medium leading-tight text-foreground">Respuestas</span>
      </button>
      <button type="button" onClick={() => onAction("catalog")} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center active:opacity-70">
        <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
          <ShoppingBagIcon className="size-5 text-orange-600 dark:text-orange-400" />
        </div>
        <span className="text-[11px] font-medium leading-tight text-foreground">Catálogo</span>
      </button>
      <button type="button" onClick={() => onAction("templates")} className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center active:opacity-70">
        <div className="flex size-11 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40">
          <LayoutTemplateIcon className="size-5 text-pink-600 dark:text-pink-400" />
        </div>
        <span className="text-[11px] font-medium leading-tight text-foreground">Plantillas</span>
      </button>
    </div>
  );
}

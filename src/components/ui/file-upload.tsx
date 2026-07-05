"use client";

import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FileUploadMeta {
  filename: string;
  mimeType: string;
  size: number;
}

interface FileUploadProps {
  value: string;
  filename?: string;
  onChange: (url: string, meta?: FileUploadMeta) => void;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<string>;
  onRemove?: (url: string) => Promise<void>;
  accept?: string;
  maxSizeMb?: number;
  placeholder?: string;
  className?: string;
  zoneClassName?: string;
  previewHeight?: string;
}

function isImageAccept(accept?: string) {
  if (!accept) return true;
  return accept.startsWith("image");
}

function DocIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.includes("pdf") || mimeType?.includes("text"))
    return <FileTextIcon className="size-6 text-orange-500" />;
  return <FileIcon className="size-6 text-blue-500" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  value,
  filename,
  onChange,
  onUpload,
  onRemove,
  accept,
  maxSizeMb = 10,
  placeholder,
  className,
  zoneClassName,
  previewHeight = "h-36",
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localMeta, setLocalMeta] = useState<FileUploadMeta | null>(null);

  const uploading = progress !== null;
  const hasFile = Boolean(value);
  const imageMode = isImageAccept(accept);
  const defaultPlaceholder = imageMode
    ? "Arrastra una imagen o haz clic para subir"
    : "Arrastra un archivo o haz clic para subir";
  const label = placeholder ?? defaultPlaceholder;

  async function handleFile(file: File) {
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`El archivo supera el límite de ${maxSizeMb} MB`);
      return;
    }
    setError(null);
    setProgress(0);
    try {
      const url = await onUpload(file, setProgress);
      const meta: FileUploadMeta = {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      };
      setLocalMeta(meta);
      onChange(url, meta);
    } catch (e) {
      setError((e as Error).message ?? "Error al subir");
    } finally {
      setProgress(null);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function clear() {
    const prev = value;
    onChange("");
    setLocalMeta(null);
    setError(null);
    if (prev && onRemove) void onRemove(prev).catch(() => undefined);
  }

  function handleChange() {
    const prev = value;
    onChange("");
    setLocalMeta(null);
    if (prev && onRemove) void onRemove(prev).catch(() => undefined);
    inputRef.current?.click();
  }

  const displayName = localMeta?.filename ?? filename;
  const displaySize = localMeta?.size;

  const zoneClass = cn(
    "group relative overflow-hidden rounded-xl border border-border/40 transition-colors",
    previewHeight,
    zoneClassName,
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleInputChange}
      />

      {/* Has file or uploading */}
      {(hasFile || uploading) && (
        <div
          className={cn(
            zoneClass,
            hasFile ? "border-transparent" : "border-border bg-muted/30",
          )}
        >
          {/* Image preview */}
          {hasFile && !uploading && imageMode && (
            <>
              <Image
                src={value}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25" />
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                aria-label="Eliminar"
              >
                <XIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleChange}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              >
                <UploadCloudIcon className="size-3" />
                Cambiar
              </button>
            </>
          )}

          {/* Document / file preview */}
          {hasFile && !uploading && !imageMode && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl border bg-background shadow-xs">
                <DocIcon mimeType={localMeta?.mimeType} />
              </div>
              {displayName && (
                <div>
                  <p className="max-w-[220px] truncate text-[13px] font-medium">
                    {displayName}
                  </p>
                  {displaySize !== undefined && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(displaySize)}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleChange}
                  className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-[12px] font-medium shadow-xs hover:bg-muted"
                >
                  <UploadCloudIcon className="size-3.5" />
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="flex size-7 items-center justify-center rounded-lg border bg-background shadow-xs hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Uploading */}
          {uploading && (
            <div className="flex h-full flex-col items-center justify-center gap-1.5">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <span className="text-[12px] font-medium text-muted-foreground">
                {progress}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty / drop zone */}
      {!hasFile && !uploading && (
        <label
          htmlFor={inputId}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          className={cn(
            zoneClass,
            "cursor-pointer",
            dragging
              ? "border-primary bg-primary/5"
              : error
                ? "border-destructive/50 bg-destructive/5"
                : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
          )}
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              {imageMode ? (
                <ImageIcon className="size-5 text-muted-foreground" />
              ) : (
                <FileIcon className="size-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground/60">
              máx. {maxSizeMb} MB
            </p>
          </div>
        </label>
      )}

      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

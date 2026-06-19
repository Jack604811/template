"use client";

interface SystemMessageProps {
  text: string;
}

export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-1">
      <div className="h-px flex-1 bg-border/50" />
      <span className="shrink-0 text-[11px] text-muted-foreground/70">{text}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

"use client";

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {replies.slice(0, 3).map((reply) => (
        <button
          key={reply}
          type="button"
          onClick={() => onSelect(reply)}
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-muted px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

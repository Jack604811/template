"use client";

interface QuickAction {
  label: string;
  onSelect: () => void;
}

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  actions?: QuickAction[];
}

export function QuickReplies({ replies, onSelect, actions }: QuickRepliesProps) {
  return (
    <div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions?.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onSelect}
          className="inline-flex h-8 shrink-0 items-center rounded-full border border-primary/30 bg-primary/8 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
        >
          {action.label}
        </button>
      ))}
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

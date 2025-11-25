"use client";

import { memo } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariablePillProps {
  /**
   * The display text (without {{ }})
   */
  display: string;
  /**
   * The full template string (with {{ }})
   */
  template: string;
  /**
   * Whether the pill can be removed
   */
  removable?: boolean;
  /**
   * Callback when remove button is clicked
   */
  onRemove?: () => void;
  /**
   * Additional class names
   */
  className?: string;
}

/**
 * Variable pill component for displaying variables in a styled badge
 * Used in contentEditable contexts as non-editable elements
 */
export const VariablePill = memo(
  ({
    display,
    template,
    removable = false,
    onRemove,
    className,
  }: VariablePillProps) => {
    return (
      <span
        contentEditable={false}
        data-variable={template}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mx-0.5 cursor-default select-none",
          className,
        )}
        draggable={false}
      >
        <span className="truncate max-w-[200px]">{display}</span>
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            tabIndex={-1}
          >
            <XIcon className="size-3" />
          </button>
        )}
      </span>
    );
  },
);

VariablePill.displayName = "VariablePill";


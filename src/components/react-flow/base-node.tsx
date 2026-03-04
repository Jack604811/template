import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import type { NodeStatus } from "./node-status-indicator";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

const VARIABLE_NAME_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

interface BaseNodeProps extends HTMLAttributes<HTMLDivElement> {
  status?: NodeStatus;
};

export const BaseNode = forwardRef<
  HTMLDivElement,
  BaseNodeProps
>(({ className, status, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative w-[320px] min-w-[320px] rounded-xl border-2 border-muted-foreground/10 bg-card text-card-foreground hover:border-primary",
      className,
    )}
    {...props}
  >
    {props.children}
    {status === "error" && (
      <XCircleIcon className="absolute right-0.5 bottom-0.5 size-2 text-red-700 stroke-3" />
    )}
    {status === "success" && (
      <CheckCircle2Icon className="absolute right-0.5 bottom-0.5 size-2 text-green-700 stroke-3" />
    )}
    {status === "loading" && (
      <Loader2Icon className="absolute -right-0.5 -bottom-0.5 size-2 text-blue-700 stroke-3 animate-spin" />
    )}
  </div>
));
BaseNode.displayName = "BaseNode";

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const BaseNodeHeader = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    {...props}
    className={cn(
      "flex flex-row items-center gap-2 border-b px-3 py-2",
      className,
    )}
  />
));
BaseNodeHeader.displayName = "BaseNodeHeader";

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const BaseNodeHeaderTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="base-node-title"
    className={cn("user-select-none flex-1 font-semibold", className)}
    {...props}
  />
));
BaseNodeHeaderTitle.displayName = "BaseNodeHeaderTitle";

export interface BaseNodeHeaderTitleInputProps {
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** If true, skip variable-name regex validation (e.g. for trigger display names). */
  skipValidation?: boolean;
}

/**
 * Editable node name input: click to edit, save on blur/Enter, revert on Escape.
 * Validates with variable-name regex unless skipValidation is true.
 */
export function BaseNodeHeaderTitleInput({
  value,
  onSave,
  disabled = false,
  placeholder = "",
  className,
  skipValidation = false,
}: BaseNodeHeaderTitleInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      const length = input.value.length;
      try {
        input.setSelectionRange(length, length);
      } catch {
        // Ignore if setSelectionRange is not supported
      }
    }
  }, [isEditing]);

  const commitSave = (next: string) => {
    const trimmed = next.trim();
    if (!skipValidation && trimmed && !VARIABLE_NAME_REGEX.test(trimmed)) {
      setEditValue(value);
      setIsEditing(false);
      return;
    }
    const toSave = trimmed || value;
    if (toSave !== value) {
      onSave(toSave);
    }
    setEditValue(toSave);
    setIsEditing(false);
  };

  const handleBlur = () => {
    commitSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitSave(editValue);
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        aria-label="Node name"
        disabled={disabled}
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "nodrag h-7 min-w-[80px] flex-1 px-2 text-sm font-semibold",
          "bg-transparent border-none rounded-none outline-none shadow-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Edit node name"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      className={cn(
        "flex h-7 min-w-[80px] flex-1 items-center truncate px-2 text-sm font-semibold",
        "bg-transparent border-none rounded-none",
        "hover:text-foreground",
        !value && "text-muted-foreground",
        className,
      )}
    >
      {value || placeholder || "Name"}
    </button>
  );
}

export const BaseNodeContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="base-node-content"
    className={cn("flex flex-col gap-y-2 p-3", className)}
    {...props}
  />
));
BaseNodeContent.displayName = "BaseNodeContent";

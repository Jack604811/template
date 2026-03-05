"use client";

import { memo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const EditableText = memo(({ value, onChange, className = "" }: EditableTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync edit buffer when value updates from parent (e.g. after save/refetch) so display and next edit are correct
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    onChange(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-transparent dark:bg-transparent border-none outline-none w-full",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text text-left bg-transparent border-none p-0",
        className,
      )}
    >
      {value}
    </button>
  );
});

EditableText.displayName = "EditableText";

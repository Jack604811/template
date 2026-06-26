"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "./input";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Search({
  value,
  onChange,
  placeholder = "Search",
  className,
}: SearchProps) {
  return (
    <div className={`relative w-full${className ? ` ${className}` : ""}`}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        className="pl-9 bg-muted border-transparent focus-visible:border-border rounded-full"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

"use client";

import { memo, useCallback } from "react";
import {
  CalendarClockIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  TimerIcon,
  CalendarPlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const BOOKABLE_DETAIL_SECTIONS = [
  { id: "booking-setup", label: "Booking setup", icon: Settings2Icon },
  { id: "availability", label: "Availability", icon: CalendarClockIcon },
  { id: "booking-options", label: "Booking options", icon: SlidersHorizontalIcon },
  { id: "limit-buffers", label: "Limit & buffers", icon: TimerIcon },
  { id: "advance", label: "Advance", icon: CalendarPlusIcon },
] as const;

export type BookableDetailSectionId = (typeof BOOKABLE_DETAIL_SECTIONS)[number]["id"];

export const DEFAULT_BOOKABLE_SECTION: BookableDetailSectionId = "booking-setup";

interface BookableDetailsSidebarProps {
  className?: string;
  bookableId: string;
  section: BookableDetailSectionId;
  onSectionChange: (section: BookableDetailSectionId) => void;
}

export const BookableDetailsSidebar = memo(
  ({
    className,
    bookableId: _bookableId,
    section: currentSection,
    onSectionChange,
  }: BookableDetailsSidebarProps) => {
    const handleSectionClick = useCallback(
      (sectionId: BookableDetailSectionId) => {
        onSectionChange(sectionId);
      },
      [onSectionChange],
    );

    return (
      <div
        className={cn(
          "flex flex-col h-full border-r bg-background",
          className,
        )}
      >
        <nav className="flex-1 p-4 py-4 overflow-y-auto">
          <div className="mb-3 px-2">
            <span className="text-sm font-medium text-foreground">Settings</span>
          </div>
          <div className="space-y-1">
            {BOOKABLE_DETAIL_SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = currentSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSectionClick(id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-sm text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  },
);

BookableDetailsSidebar.displayName = "BookableDetailsSidebar";

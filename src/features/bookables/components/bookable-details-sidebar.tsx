"use client";

import { memo, useCallback } from "react";
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const BOOKABLE_DETAIL_SECTIONS = [
  { id: "booking-setup", label: "Configuración", icon: Settings2Icon },
  { id: "availability", label: "Disponibilidad", icon: CalendarClockIcon },
  { id: "booking-options", label: "Opciones de reserva", icon: SlidersHorizontalIcon },
  { id: "advance", label: "Avanzado", icon: CalendarPlusIcon },
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
        <nav className="flex-1 overflow-y-auto p-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1 mt-2">
            Configuración
          </p>
          <div className="space-y-0.5">
            {BOOKABLE_DETAIL_SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = currentSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSectionClick(id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors",
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
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

"use client";

import { memo, useMemo } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
} from "date-fns";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AgendaDaysToShow } from "./constants";
import type { CalendarView } from "./types";
import { getWeekStartOption } from "@/lib/format-utils";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onPrevious: () => void;
  onNext: () => void;
  onViewChange: (view: CalendarView) => void;
  onNewBooking: () => void;
  weekStart?: "monday" | "sunday";
}

export const CalendarHeader = memo(({
  currentDate,
  view,
  onPrevious,
  onNext,
  onViewChange,
  onNewBooking,
  weekStart = "sunday",
}: CalendarHeaderProps) => {
  const weekStartOption = getWeekStartOption(weekStart);
  const viewTitle = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    }
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: weekStartOption });
      const end = endOfWeek(currentDate, { weekStartsOn: weekStartOption });
      if (isSameMonth(start, end)) {
        return format(start, "MMMM yyyy");
      }
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
    }
    if (view === "day") {
      return (
        <>
          <span aria-hidden="true" className="min-[480px]:hidden">
            {format(currentDate, "MMM d, yyyy")}
          </span>
          <span aria-hidden="true" className="max-[479px]:hidden min-md:hidden">
            {format(currentDate, "MMMM d, yyyy")}
          </span>
          <span className="max-md:hidden">{format(currentDate, "EEE MMMM d, yyyy")}</span>
        </>
      );
    }
    if (view === "agenda") {
      const start = currentDate;
      const end = addDays(currentDate, AgendaDaysToShow - 1);

      if (isSameMonth(start, end)) {
        return format(start, "MMMM yyyy");
      }
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [currentDate, view]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <SidebarTrigger />
          <h2 className="font-semibold text-sm sm:text-lg md:text-xl">{viewTitle}</h2>
          <div className="flex items-center">
            <Button
              aria-label="Previous"
              onClick={onPrevious}
              size="icon"
              variant="ghost"
            >
              <ChevronLeftIcon aria-hidden="true" size={16} />
            </Button>
            <Button
              aria-label="Next"
              onClick={onNext}
              size="icon"
              variant="ghost"
            >
              <ChevronRightIcon aria-hidden="true" size={16} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-1.5 max-[479px]:h-8 bg-transparent" variant="outline">
                <span>
                  <span aria-hidden="true" className="min-[480px]:hidden">
                    {view.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-[479px]:sr-only">
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </span>
                </span>
                <ChevronDownIcon aria-hidden="true" className="-me-1 opacity-60" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32">
              <DropdownMenuItem onClick={() => onViewChange("month")}>
                Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange("week")}>
                Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange("day")}>
                Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange("agenda")}>
                Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="max-[479px]:aspect-square max-[479px]:p-0!"
            onClick={onNewBooking}
            size="sm"
          >
            <PlusIcon aria-hidden="true" className="sm:-ms-1 opacity-60" size={16} />
            <span className="max-sm:sr-only">New booking</span>
          </Button>
        </div>
      </div>
    </header>
  );
});

CalendarHeader.displayName = "CalendarHeader";


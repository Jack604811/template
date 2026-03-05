"use client";

import { BookingCalendar } from "./booking-calendar";
import { BookingSidebar } from "./booking-sidebar";
import { CalendarHeader } from "./calendar-header";
import { BookingDialog } from "./booking-dialog";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  addDays,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
} from "date-fns";
import { toast } from "sonner";
import type { CalendarBooking, BookingStatus, CalendarView } from "./types";
import { useSuspenseBookings, useRemoveBooking, useUpdateBooking } from "@/features/bookings/hooks/use-bookings";
import { useBookingsRealtime } from "@/features/bookings/hooks/use-bookings-realtime";
import { LoadingView, ErrorView } from "@/components/entity-components";
import { AgendaDaysToShow } from "./constants";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";

/**
 * Container component for the calendar page
 * Provides the layout structure for the calendar view
 * 
 * Note: This differs from other feature containers (BookingsContainer, WorkflowsContainer)
 * because the calendar uses a full-screen layout with its own sidebar containing search,
 * rather than the standard EntityContainer pattern with header/search/pagination at the top.
 */
export const CalendarContainer = ({ children }: { children: React.ReactNode }) => {
  return <div className="h-screen">{children}</div>;
};

/**
 * Main calendar content component
 * Handles optimistic updates and booking state management
 */
export const CalendarContent = () => {
  const router = useRouter();
  const { data: bookingsData } = useSuspenseBookings();
  const removeBooking = useRemoveBooking();
  const updateBooking = useUpdateBooking();
  const currentOrg = useCurrentOrganizationWithSettings();

  // Subscribe to real-time booking updates
  useBookingsRealtime();
  const [selectedStatuses, setSelectedStatuses] = useState<BookingStatus[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Get organization settings with defaults
  const dateTimeFormat = (currentOrg?.dateTimeFormat as "12" | "24") || "24";
  const weekStart = (currentOrg?.weekStart as "monday" | "sunday") || "sunday";

  // Convert database bookings to CalendarBooking format
  const baseBookings = useMemo<CalendarBooking[]>(() => {
    if (!bookingsData?.items) return [];
    return bookingsData.items.map((booking) => ({
      id: booking.id,
      title: booking.customer?.name || booking.id,
      start: new Date(booking.startTime),
      end: new Date(booking.endTime),
      allDay: false,
      color: "sky" as const,
      status: booking.status as BookingStatus,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : undefined,
    }));
  }, [bookingsData?.items]);

  /**
   * Optimistic UI Strategy:
   * 
   * We use useState for pendingOptimisticBookings instead of useOptimistic to ensure
   * immediate re-renders when bookings are added/updated. This provides instant UI
   * feedback while database operations complete in the background.
   * 
   * The merge logic:
   * 1. Optimistic bookings take precedence over base bookings (for instant updates)
   * 2. Temp bookings (new bookings with "temp-" prefix) are kept until real data arrives
   * 3. Optimistic updates for existing bookings are cleaned up when real data matches
   * 4. Query invalidation is wrapped in startTransition to prevent blocking renders
   */
  const [pendingOptimisticBookings, setPendingOptimisticBookings] = useState<CalendarBooking[]>([]);

  /**
   * Merge base bookings (from database) with optimistic bookings (pending updates)
   * Optimistic bookings take precedence to show updates immediately
   */
  const bookings = useMemo(() => {
    // Create a set of optimistic booking IDs to filter out base bookings that have optimistic updates
    const optimisticIds = new Set(pendingOptimisticBookings.map((b) => b.id));
    
    // Filter out base bookings that have optimistic updates (optimistic takes precedence)
    const baseBookingsWithoutOptimistic = baseBookings.filter(
      (b) => !optimisticIds.has(b.id),
    );
    
    // Create a set of real bookings by ID for quick lookup (for cleanup)
    const realBookingIds = new Set(baseBookings.map((b) => b.id));
    
    // Filter optimistic bookings:
    // - Keep temp bookings (new bookings not yet in database)
    // - Keep optimistic updates for existing bookings (will be cleaned up when real data arrives)
    const validOptimistic = pendingOptimisticBookings.filter((b) => {
      // Always keep temp bookings
      if (b.id.startsWith("temp-")) return true;
      // Keep optimistic updates for existing bookings
      return realBookingIds.has(b.id);
    });
    
    // Merge: base bookings (excluding those with optimistic updates) + valid optimistic bookings
    return [...baseBookingsWithoutOptimistic, ...validOptimistic];
  }, [baseBookings, pendingOptimisticBookings]);

  /**
   * Clean up optimistic bookings when real bookings arrive from the database
   * Only removes optimistic entries when we have a real booking (non-temp ID) that matches
   * the time range, ensuring smooth transition from optimistic to real data
   */
  useEffect(() => {
    if (pendingOptimisticBookings.length === 0) return;
    
    // Create a map of real bookings by time range for efficient lookup
    const realBookingTimeMap = new Map<string, CalendarBooking>();
    baseBookings.forEach((b) => {
      const timeKey = `${b.start.getTime()}-${b.end.getTime()}`;
      realBookingTimeMap.set(timeKey, b);
    });
    
    // Only proceed if we have real bookings to match against
    if (realBookingTimeMap.size === 0) return;
    
    setPendingOptimisticBookings((prev) => {
      const filtered = prev.filter((b) => {
        const timeKey = `${b.start.getTime()}-${b.end.getTime()}`;
        const realBooking = realBookingTimeMap.get(timeKey);
        
        // Only remove if we have a real booking with a non-temp ID (actual database booking)
        return !(realBooking && !realBooking.id.startsWith("temp-"));
      });
      
      // Only update state if something actually changed
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [baseBookings, pendingOptimisticBookings]);

  /**
   * Handle new booking creation with optimistic UI update
   * Creates a temporary booking with "temp-" prefix that appears instantly
   * The real booking will replace it when the database operation completes
   */
  const handleBookingAdd = (newBooking: CalendarBooking) => {
    // Add optimistic update immediately - booking appears instantly
    // This MUST be synchronous to trigger immediate re-render
    const tempId = newBooking.id || `temp-${Date.now()}`;
    const optimisticBooking = { ...newBooking, id: tempId };
    
    // Synchronous state update - triggers immediate re-render
    setPendingOptimisticBookings((prev) => {
      // Remove any existing optimistic booking with the same start time to avoid duplicates
      const filtered = prev.filter(
        (b) => !(b.id.startsWith("temp-") && b.start.getTime() === newBooking.start.getTime()),
      );
      return [...filtered, optimisticBooking];
    });
  };

  /**
   * Handle booking update (e.g., drag-and-drop) with optimistic UI update
   * Updates the UI immediately, then syncs with database in the background
   * If the update fails, the optimistic change will be reverted on query refetch
   */
  const handleBookingUpdate = (updatedBooking: CalendarBooking) => {
    // Skip update if this is a temp booking (not yet saved to database)
    if (updatedBooking.id.startsWith("temp-")) {
      // For temp bookings, just update optimistic state
      setPendingOptimisticBookings((prev) =>
        prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)),
      );
      return;
    }

    // Optimistically update the booking immediately for instant UI feedback
    // Add to pending optimistic bookings if not already there, or update if exists
    setPendingOptimisticBookings((prev) => {
      const existingIndex = prev.findIndex((b) => b.id === updatedBooking.id);
      if (existingIndex >= 0) {
        // Update existing optimistic booking
        return prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b));
      }
      // Add new optimistic update (for drag-and-drop of existing bookings)
      return [...prev, updatedBooking];
    });

    // Find the original booking to get required data for the update
    const originalBooking = bookingsData?.items.find((b) => b.id === updatedBooking.id);
    if (!originalBooking) {
      // If booking not found in database, it might be optimistic - just update state
      return;
    }

    // Update in database in the background (non-blocking)
    // Error handling is done by the mutation hook (toast notification)
    // The optimistic update will be reverted when query refetches if update fails
    updateBooking.mutate({
      id: updatedBooking.id,
      startTime: updatedBooking.start,
      endTime: updatedBooking.end,
      // Preserve other fields from original booking
      customerId: originalBooking.customerId,
      bookableId: originalBooking.bookableId || undefined,
      status: (updatedBooking.status || originalBooking.status) as "pending" | "approved" | "in_progress" | "canceled" | "completed",
      notes: originalBooking.notes || undefined,
      basePrice: originalBooking.basePrice,
      serviceFee: originalBooking.serviceFee,
      tax: originalBooking.tax,
      total: originalBooking.total,
    });
  };

  const handleBookingClick = (booking: CalendarBooking) => {
    router.push(`/calendar/${booking.id}`);
  };

  const handlePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (view === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else if (view === "agenda") {
      setCurrentDate(addDays(currentDate, -AgendaDaysToShow));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (view === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === "agenda") {
      setCurrentDate(addDays(currentDate, AgendaDaysToShow));
    }
  };

  const handleNewBooking = () => {
    setSelectedBooking(null);
    setIsBookingDialogOpen(true);
  };

  const handleBookingSave = (booking: CalendarBooking) => {
    // Trigger optimistic update immediately - booking appears instantly
    // Toast notifications are handled by mutation hooks to avoid duplicates
    if (booking.id && !booking.id.startsWith("temp-")) {
      handleBookingUpdate(booking);
    } else {
      handleBookingAdd(booking);
    }
    setIsBookingDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleBookingDelete = async (bookingId: string) => {
    const deletedBooking = bookings.find((b) => b.id === bookingId);
    await removeBooking.mutateAsync({ id: bookingId });
    setIsBookingDialogOpen(false);
    setSelectedBooking(null);
    if (deletedBooking) {
      toast(`Booking "${deletedBooking.title}" deleted`, {
        description: format(new Date(deletedBooking.start), "MMM d, yyyy"),
        position: "bottom-right",
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onViewChange={setView}
        onNewBooking={handleNewBooking}
        weekStart={weekStart}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <BookingCalendar
            bookings={bookings}
            onBookingAdd={handleBookingAdd}
            onBookingUpdate={handleBookingUpdate}
            onBookingDelete={handleBookingDelete}
            onBookingClick={handleBookingClick}
            selectedStatuses={selectedStatuses}
            currentDate={currentDate}
            onCurrentDateChange={setCurrentDate}
            view={view}
            onViewChange={setView}
            selectedBooking={selectedBooking}
            onSelectedBookingChange={setSelectedBooking}
            isBookingDialogOpen={isBookingDialogOpen}
            onBookingDialogOpenChange={setIsBookingDialogOpen}
            dateTimeFormat={dateTimeFormat}
            weekStart={weekStart}
          />
        </div>
        <BookingSidebar
          bookings={bookings}
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          onBookingClick={handleBookingClick}
          dateTimeFormat={dateTimeFormat}
        />
      </div>
      <BookingDialog
        booking={selectedBooking}
        isOpen={isBookingDialogOpen}
        onClose={() => {
          setIsBookingDialogOpen(false);
          setSelectedBooking(null);
        }}
        onDelete={handleBookingDelete}
        onSave={handleBookingSave}
      />
    </div>
  );
};

/**
 * Loading component for calendar page
 */
export const CalendarLoading = () => {
  return <LoadingView message="Loading calendar..." />;
};

/**
 * Error component for calendar page
 */
export const CalendarError = () => {
  return <ErrorView message="Error loading calendar" />;
};


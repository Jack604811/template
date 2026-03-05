"use client"

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { addMinutes, differenceInMinutes } from "date-fns"
import { createContext, type ReactNode, useContext, useId, useRef, useState } from "react"

import { type CalendarBooking } from "./types";
import { BookingItem } from "./booking-item";
import { checkDragConflicts, type BookingConflict } from "./conflict-detection"

type CalendarDndContextType = {
  activeBooking: CalendarBooking | null
  activeId: UniqueIdentifier | null
  activeView: "month" | "week" | "day" | null
  currentTime: Date | null
  bookingHeight: number | null
  isMultiDay: boolean
  segmentWidth: number | null
  segmentIsFirstDay: boolean
  segmentIsLastDay: boolean
  bookingDurationDays: number
  hoveredDate: Date | null
  dragConflicts: BookingConflict[]
  hasConflict: boolean
}

const CalendarDndContext = createContext<CalendarDndContextType>({
  activeBooking: null,
  activeId: null,
  activeView: null,
  currentTime: null,
  bookingHeight: null,
  isMultiDay: false,
  segmentWidth: null,
  segmentIsFirstDay: true,
  segmentIsLastDay: true,
  bookingDurationDays: 1,
  hoveredDate: null,
  dragConflicts: [],
  hasConflict: false,
})

export const useCalendarDnd = () => useContext(CalendarDndContext)

interface CalendarDndProviderProps {
  children: ReactNode
  onBookingUpdate: (booking: CalendarBooking) => void
  allBookings: CalendarBooking[]
}

/**
 * Calendar Drag-and-Drop Context Provider
 * 
 * Manages drag-and-drop state for calendar bookings, including:
 * - Active booking being dragged
 * - Hovered date/time for drop target
 * - Multi-day booking duration calculation
 * - Drag end handling with booking position updates
 * 
 * When a booking is dropped, it calculates the new start/end times based on
 * the drop target and calls onBookingUpdate to sync with the database.
 */
export const CalendarDndProvider = ({ children, onBookingUpdate, allBookings }: CalendarDndProviderProps) => {
  const [activeBooking, setActiveBooking] = useState<CalendarBooking | null>(null)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeView, setActiveView] = useState<"month" | "week" | "day" | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [bookingHeight, setBookingHeight] = useState<number | null>(null)
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [segmentWidth, setSegmentWidth] = useState<number | null>(null)
  const [segmentIsFirstDay, setSegmentIsFirstDay] = useState(true)
  const [segmentIsLastDay, setSegmentIsLastDay] = useState(true)
  const [bookingDurationDays, setBookingDurationDays] = useState(1)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [dragConflicts, setDragConflicts] = useState<BookingConflict[]>([])

  const bookingDimensions = useRef<{ height: number }>({ height: 0 })

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  const dndContextId = useId()

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event

    if (!active.data.current) return

    const {
      booking: calendarBooking,
      view,
      height,
      isMultiDay: bookingIsMultiDay,
      segmentWidth: bookingSegmentWidth,
      isFirstDay: segmentFirst,
      isLastDay: segmentLast,
    } = active.data.current as {
      booking: CalendarBooking
      view: "month" | "week" | "day"
      height?: number
      isMultiDay?: boolean
      segmentWidth?: number
      isFirstDay?: boolean
      isLastDay?: boolean
      segmentDate?: string
    }

    const bookingStart = new Date(calendarBooking.start)
    const bookingEnd = new Date(calendarBooking.end)
    bookingStart.setHours(0, 0, 0, 0)
    bookingEnd.setHours(0, 0, 0, 0)
    const durationMs = bookingEnd.getTime() - bookingStart.getTime()
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1

    setActiveBooking(calendarBooking)
    setActiveId(active.id)
    setActiveView(view)
    setCurrentTime(new Date(calendarBooking.start))
    setIsMultiDay(bookingIsMultiDay || false)
    setSegmentWidth(bookingSegmentWidth || null)
    setSegmentIsFirstDay(segmentFirst ?? true)
    setSegmentIsLastDay(segmentLast ?? true)
    setBookingDurationDays(durationDays)

    if (height) {
      bookingDimensions.current.height = height
      setBookingHeight(height)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event

    if (over && activeBooking && over.data.current) {
      const { date, time } = over.data.current as { date: Date; time?: number }

      const hoveredDateNormalized = new Date(date)
      hoveredDateNormalized.setHours(0, 0, 0, 0)

      if (
        !hoveredDate ||
        hoveredDate.getDate() !== hoveredDateNormalized.getDate() ||
        hoveredDate.getMonth() !== hoveredDateNormalized.getMonth() ||
        hoveredDate.getFullYear() !== hoveredDateNormalized.getFullYear()
      ) {
        setHoveredDate(hoveredDateNormalized)
      }

      if (time !== undefined && activeView !== "month") {
        const newTime = new Date(date)
        const hours = Math.floor(time)
        const fractionalHour = time - hours

        let minutes = 0
        if (fractionalHour < 0.125) minutes = 0
        else if (fractionalHour < 0.375) minutes = 15
        else if (fractionalHour < 0.625) minutes = 30
        else minutes = 45

        newTime.setHours(hours, minutes, 0, 0)

        if (
          !currentTime ||
          newTime.getHours() !== currentTime.getHours() ||
          newTime.getMinutes() !== currentTime.getMinutes() ||
          newTime.getDate() !== currentTime.getDate() ||
          newTime.getMonth() !== currentTime.getMonth() ||
          newTime.getFullYear() !== currentTime.getFullYear()
        ) {
          setCurrentTime(newTime)

          const originalStart = new Date(activeBooking.start)
          const originalEnd = new Date(activeBooking.end)
          const durationMinutes = differenceInMinutes(originalEnd, originalStart)
          const newEnd = addMinutes(newTime, durationMinutes)

          const conflicts = checkDragConflicts(activeBooking, newTime, newEnd, allBookings)
          setDragConflicts(conflicts)
        }
      } else if (activeView === "month") {
        const newTime = new Date(date)
        if (currentTime) {
          newTime.setHours(
            currentTime.getHours(),
            currentTime.getMinutes(),
            currentTime.getSeconds(),
            currentTime.getMilliseconds(),
          )
        }

        if (
          !currentTime ||
          newTime.getDate() !== currentTime.getDate() ||
          newTime.getMonth() !== currentTime.getMonth() ||
          newTime.getFullYear() !== currentTime.getFullYear()
        ) {
          setCurrentTime(newTime)

          const originalStart = new Date(activeBooking.start)
          const originalEnd = new Date(activeBooking.end)
          const durationMinutes = differenceInMinutes(originalEnd, originalStart)
          const newEnd = addMinutes(newTime, durationMinutes)

          const conflicts = checkDragConflicts(activeBooking, newTime, newEnd, allBookings)
          setDragConflicts(conflicts)
        }
      }
    } else if (hoveredDate) {
      setHoveredDate(null)
      setDragConflicts([])
    }
  }

  const resetDragState = () => {
    setActiveBooking(null)
    setActiveId(null)
    setActiveView(null)
    setCurrentTime(null)
    setBookingHeight(null)
    setIsMultiDay(false)
    setSegmentWidth(null)
    setSegmentIsFirstDay(true)
    setSegmentIsLastDay(true)
    setBookingDurationDays(1)
    setHoveredDate(null)
    setDragConflicts([])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !activeBooking || !currentTime) {
      resetDragState()
      return
    }

    if (!active.data.current || !over.data.current) {
      resetDragState()
      return
    }

    const activeData = active.data.current as {
      booking?: CalendarBooking
      view?: string
      segmentDate?: string
    }
    const overData = over.data.current as { date?: Date; time?: number }

    if (!activeData.booking || !overData.date) {
      resetDragState()
      return
    }

    const calendarBooking = activeData.booking
    const date = overData.date
    const time = overData.time

    if (activeData.segmentDate) {
      const segmentDate = new Date(activeData.segmentDate)
      const dropDate = new Date(date)

      const isSameDay =
        segmentDate.getFullYear() === dropDate.getFullYear() &&
        segmentDate.getMonth() === dropDate.getMonth() &&
        segmentDate.getDate() === dropDate.getDate()

      if (isSameDay) {
        resetDragState()
        return
      }
    }

    const newStart = new Date(date)

    if (time !== undefined) {
      const hours = Math.floor(time)
      const fractionalHour = time - hours

      let minutes = 0
      if (fractionalHour < 0.125) minutes = 0
      else if (fractionalHour < 0.375) minutes = 15
      else if (fractionalHour < 0.625) minutes = 30
      else minutes = 45

      newStart.setHours(hours, minutes, 0, 0)
    } else {
      newStart.setHours(
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds(),
      )
    }

    const originalStart = new Date(calendarBooking.start)
    const originalEnd = new Date(calendarBooking.end)
    const durationMinutes = differenceInMinutes(originalEnd, originalStart)
    const newEnd = addMinutes(newStart, durationMinutes)

    const hasStartTimeChanged =
      originalStart.getFullYear() !== newStart.getFullYear() ||
      originalStart.getMonth() !== newStart.getMonth() ||
      originalStart.getDate() !== newStart.getDate() ||
      originalStart.getHours() !== newStart.getHours() ||
      originalStart.getMinutes() !== newStart.getMinutes()

    if (hasStartTimeChanged) {
      onBookingUpdate({
        ...calendarBooking,
        end: newEnd,
        start: newStart,
      })
    }

    resetDragState()
  }

  return (
    <DndContext
      id={dndContextId}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <CalendarDndContext.Provider
        value={{
          activeBooking,
          activeId,
          activeView,
          currentTime,
          bookingHeight,
          isMultiDay,
          segmentWidth,
          segmentIsFirstDay,
          segmentIsLastDay,
          bookingDurationDays,
          hoveredDate,
          dragConflicts,
          hasConflict: dragConflicts.length > 0,
        }}
      >
        {children}

        <DragOverlay adjustScale={false} dropAnimation={null}>
          {activeBooking && activeView && (
            <div
              style={{
                height: bookingHeight ? `${bookingHeight}px` : "auto",
                width: isMultiDay && segmentWidth ? `${segmentWidth}px` : "auto",
                minWidth: isMultiDay ? "200px" : "auto",
              }}
            >
              {dragConflicts.length > 0 && (
                <div className="absolute -top-8 left-0 right-0 flex items-center justify-center">
                  <div className="rounded-full bg-red-500 px-3 py-1 text-white text-xs font-medium shadow-lg">
                    Conflict with {dragConflicts.length} booking{dragConflicts.length > 1 ? "s" : ""}
                  </div>
                </div>
              )}
              <BookingItem
                currentTime={currentTime || undefined}
                booking={activeBooking}
                isDragging={true}
                isFirstDay={segmentIsFirstDay}
                isLastDay={segmentIsLastDay}
                showTime={activeView !== "month"}
                view={activeView}
              />
            </div>
          )}
        </DragOverlay>
      </CalendarDndContext.Provider>
    </DndContext>
  );
};

"use client"

import type React from "react"

import { useLayoutEffect, useMemo, useRef, useState } from "react"

interface BookingVisibilityOptions {
  eventHeight: number
  eventGap: number
}

interface BookingVisibilityResult {
  contentRef: React.RefObject<HTMLDivElement>
  contentHeight: number | null
  getVisibleBookingCount: (totalBookings: number) => number
}

/**
 * Hook for calculating booking visibility based on container height
 * Uses ResizeObserver for efficient updates
 */
export const useBookingVisibility = ({ eventHeight, eventGap }: BookingVisibilityOptions): BookingVisibilityResult => {
  const contentRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!contentRef.current) return

    const updateHeight = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.clientHeight)
      }
    }

    updateHeight()

    if (!observerRef.current) {
      observerRef.current = new ResizeObserver(() => {
        updateHeight()
      })
    }

    observerRef.current.observe(contentRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const getVisibleBookingCount = useMemo(() => {
    return (totalBookings: number): number => {
      if (!contentHeight) return totalBookings

      // Calculate how many bookings can fit in the container
      const maxBookings = Math.floor(contentHeight / (eventHeight + eventGap))

      // If all bookings fit, show them all
      if (totalBookings <= maxBookings) {
        return totalBookings
      }
      // Otherwise, reserve space for "more" button by showing one less
      return maxBookings > 0 ? maxBookings - 1 : 0
    }
  }, [contentHeight, eventHeight, eventGap])

  return {
    contentHeight,
    contentRef,
    getVisibleBookingCount,
  } as BookingVisibilityResult
};

"use client"

import { endOfWeek, isSameDay, isWithinInterval, startOfWeek } from "date-fns"
import { useEffect, useState } from "react"

import { EndHour, StartHour } from "../constants";
import { getWeekStartOption } from "@/lib/format-utils";

export const useCurrentTimeIndicator = (currentDate: Date, view: "day" | "week", weekStart: "monday" | "sunday" = "sunday") => {
  const weekStartOption = getWeekStartOption(weekStart);
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(0)
  const [currentTimeVisible, setCurrentTimeVisible] = useState<boolean>(false)

  useEffect(() => {
    const calculateTimePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const totalMinutes = (hours - StartHour) * 60 + minutes
      const dayStartMinutes = 0
      const dayEndMinutes = (EndHour - StartHour) * 60

      const position = ((totalMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) * 100

      let isCurrentTimeVisible = false

      if (view === "day") {
        isCurrentTimeVisible = isSameDay(now, currentDate)
      } else if (view === "week") {
        const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: weekStartOption })
        const endOfWeekDate = endOfWeek(currentDate, { weekStartsOn: weekStartOption })
        isCurrentTimeVisible = isWithinInterval(now, {
          end: endOfWeekDate,
          start: startOfWeekDate,
        })
      }

      setCurrentTimePosition(position)
      setCurrentTimeVisible(isCurrentTimeVisible)
    }

    calculateTimePosition()

    const interval = setInterval(calculateTimePosition, 60000)

    return () => clearInterval(interval)
  }, [currentDate, view, weekStartOption])

  return { currentTimePosition, currentTimeVisible };
};

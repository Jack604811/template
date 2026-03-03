"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timelineEvents } from "@/features/bookings/constants";

export const TimelineCard = memo(({ className }: { className?: string }) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {timelineEvents.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {index < timelineEvents.length - 1 && (
                <div className="absolute left-[18px] top-10 h-[calc(100%-24px)] w-px bg-border" />
              )}

              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-secondary ${
                  event.status === "completed"
                    ? "border-accent bg-accent/10"
                    : event.status === "pending"
                      ? "border-warning bg-warning/10"
                      : "border-muted bg-muted"
                }`}
              >
                <event.icon
                  className={`h-4 w-4 ${
                    event.status === "completed"
                      ? "text-accent"
                      : event.status === "pending"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  {event.status === "pending" && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Pending
                    </Badge>
                  )}
                  {event.status === "upcoming" && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Upcoming
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {event.date} • {event.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

TimelineCard.displayName = "TimelineCard";


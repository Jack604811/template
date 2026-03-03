"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { BookingStatus } from "@/features/bookings/types";
import { getStatusConfig } from "@/features/bookings/components/booking-calendar/status-config";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";

interface BookingHeaderProps {
  bookingId?: string;
  status?: BookingStatus | string;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  baseRoute?: string;
}

export const BookingHeader = ({ bookingId, status = "Confirmed", onSave, onCancel, isSaving = false, baseRoute = "/calendar" }: BookingHeaderProps) => {
  const { handleBreadcrumbClick } = useDetailPageNavigation(baseRoute);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
      <SidebarTrigger />
      <div className="flex flex-row items-center justify-between gap-x-4 w-full">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link 
                  prefetch 
                  href={baseRoute}
                  onClick={(e) => {
                    e.preventDefault();
                    handleBreadcrumbClick();
                  }}
                >
                  Calendar
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {bookingId ? `Reservation #${bookingId}` : "New Reservation"}
            </BreadcrumbItem>
            {status && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <Badge variant="outline" className="text-xs">
                    {getStatusConfig(status as BookingStatus).label}
                  </Badge>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        {(onSave || onCancel) && (
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
            {onSave && (
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}


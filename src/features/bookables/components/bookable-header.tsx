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
import Link from "next/link";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";

interface BookableHeaderProps {
  title: string;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  baseRoute?: string;
}

export const BookableHeader = ({ title, onSave, onCancel, isSaving = false, baseRoute = "/services" }: BookableHeaderProps) => {
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
                  Servicios
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{title}</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {(onSave || onCancel) && (
          <div className="flex items-center gap-2">
            {/* {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )} */}
            {onSave && (
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { PlusIcon } from "lucide-react";

interface BookablesListHeaderProps {
  onNew?: () => void;
  disabled?: boolean;
  isCreating?: boolean;
}

export const BookablesListHeader = ({ onNew, disabled, isCreating }: BookablesListHeaderProps) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
      <SidebarTrigger />
      <div className="flex flex-row items-center justify-between gap-x-4 w-full">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Services</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {onNew && (
          <Button
            disabled={isCreating || disabled}
            size="sm"
            onClick={onNew}
          >
            <PlusIcon className="size-4" />
            New item
          </Button>
        )}
      </div>
    </header>
  );
};

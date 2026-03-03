"use client";

import { memo, useState } from "react";
import { PencilIcon, TrashIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CustomField } from "@/generated/prisma";
import { CustomFieldDisplayLocation } from "@/generated/prisma";
import { EntityItem, type EntityMenuGroup } from "@/components/entity-components";
import { cn } from "@/lib/utils";
import { CUSTOM_FIELD_TYPE_LABELS } from "../constants";

interface CustomFieldItemProps {
  field: CustomField;
  onEdit: () => void;
  onToggle: (fieldId: string, enabled: boolean) => void;
  onDelete: (fieldId: string) => void;
  isDragging?: boolean;
}

export const CustomFieldItem = memo(({ field, onEdit, onToggle, onDelete, isDragging = false }: CustomFieldItemProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await onDelete(field.id);
      setDeleteDialogOpen(false);
    } catch {
      // Error handling is done in parent mutation hooks via toast notifications
      // Keep dialog open on error so user can retry
    }
  };

  const menuGroups: EntityMenuGroup[] = [
    {
      items: [
        {
          label: "Edit",
          icon: PencilIcon,
          onClick: onEdit,
        },
      ],
    },
    {
      separator: true,
      items: [
        {
          label: "Delete",
          icon: TrashIcon,
          onClick: () => setDeleteDialogOpen(true),
          variant: "destructive",
        },
      ],
    },
  ];

  const displayLocationLabel = field.displayLocation === CustomFieldDisplayLocation.CUSTOMER ? "Customer" : "Booking";
  const subtitle = `${CUSTOM_FIELD_TYPE_LABELS[field.type]} • ${displayLocationLabel}`;

  return (
    <>
      <EntityItem
        title={field.name}
        subtitle={subtitle}
        menuGroups={menuGroups}
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50",
        )}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{field.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

CustomFieldItem.displayName = "CustomFieldItem";

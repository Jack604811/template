"use client";

import { memo, useEffect, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { NewItemHandlerContext } from "./bookables";
import { EmptyView } from "@/components/entity-components";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { formatCurrency } from "@/lib/format-utils";
import type { BookableWithRelations } from "../types";
import { useSuspenseBookables } from "../hooks/use-bookables";
import { useBookablesParams } from "../hooks/use-bookables-params";
import { formatDuration, getStatusColor, getStatusLabel } from "../lib/utils";
import { BookableImage } from "./bookable-image";

export const BookablesTable = memo(() => {
  const router = useRouter();
  const newItemContext = useContext(NewItemHandlerContext);
  const [params] = useBookablesParams();
  const collectionId = params.collectionId ?? null;

  const bookables = useSuspenseBookables(collectionId);
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency || "USD";

  const handleNewItem = useCallback(() => {
    const url = collectionId
      ? `/services/new?collectionId=${collectionId}`
      : "/services/new";
    router.push(url);
  }, [router, collectionId]);

  useEffect(() => {
    if (newItemContext) {
      newItemContext.setHandler(handleNewItem);
    }
  }, [newItemContext, handleNewItem]);

  const items = bookables.data.items as BookableWithRelations[];

  if (items.length === 0) {
    return (
      <EmptyView
        message="No bookables yet. Create one to get started."
        onNew={handleNewItem}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((bookable) => (
        <button
          key={bookable.id}
          type="button"
          onClick={() => router.push(`/services/${bookable.id}`)}
          className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <BookableImage images={bookable.images} alt={bookable.title} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {bookable.title}
            </p>
            <p className="truncate text-sm font-medium text-primary">
              {formatCurrency(bookable.basePrice, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDuration(bookable.durationValue, bookable.durationUnit)}
            </p>
          </div>
          <Badge variant="secondary" className={getStatusColor(bookable.status)}>
            {getStatusLabel(bookable.status)}
          </Badge>
        </button>
      ))}
    </div>
  );
});

BookablesTable.displayName = "BookablesTable";

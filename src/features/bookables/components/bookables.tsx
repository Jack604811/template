"use client";

import { memo, useState, createContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  EntityContainer,
  EntitySearch,
  EntityPagination,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { Pills } from "@/components/ui/pills";
import { BookablesTable } from "./bookables-table";
import { BookablesListHeader } from "./bookables-list-header";
import { useBookablesParams } from "../hooks/use-bookables-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { useSuspenseBookables } from "../hooks/use-bookables";
import { useTRPC } from "@/trpc/client";

export const NewItemHandlerContext = createContext<{
  setHandler: (handler: () => void) => void;
} | null>(null);

/** @deprecated Sidebar removed — kept for type compat only */
export const SelectedCollectionContext = createContext<{
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
} | null>(null);

export const BookablesSearch = memo(() => {
  const [params, setParams] = useBookablesParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search bookables..."
    />
  );
});

BookablesSearch.displayName = "BookablesSearch";

const CollectionFilter = memo(() => {
  const trpc = useTRPC();
  const [params, setParams] = useBookablesParams();
  const { data: collections = [] } = useQuery(
    trpc.bookableCollections.getMany.queryOptions(),
  );

  if (collections.length === 0) return null;

  const items = [
    { id: "", label: "All" },
    ...collections.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <Pills
      items={items}
      value={params.collectionId ?? ""}
      onValueChange={(id) => setParams({ collectionId: id || null, page: 1 })}
      className="overflow-x-auto scrollbar-none pb-1"
    />
  );
});

CollectionFilter.displayName = "CollectionFilter";

export const BookablesContainer = memo(
  ({ children }: { children: React.ReactNode }) => {
    const [newItemHandler, setNewItemHandler] = useState<(() => void) | null>(null);

    const handleSetHandler = useCallback((handler: () => void) => {
      setNewItemHandler(() => handler);
    }, []);

    const contextValue = { setHandler: handleSetHandler };

    return (
      <NewItemHandlerContext.Provider value={contextValue}>
        <div className="flex h-full flex-col">
          <BookablesListHeader onNew={newItemHandler || undefined} />
          <div className="flex-1 overflow-auto">
            <EntityContainer
              search={<BookablesSearch />}
              pagination={<BookablesPagination />}
            >
              <CollectionFilter />
              {children}
            </EntityContainer>
          </div>
        </div>
      </NewItemHandlerContext.Provider>
    );
  },
);

BookablesContainer.displayName = "BookablesContainer";

export const BookablesPagination = memo(() => {
  const [params, setParams] = useBookablesParams();
  const bookables = useSuspenseBookables(params.collectionId ?? null);

  return (
    <EntityPagination
      disabled={bookables.isFetching}
      totalPages={bookables.data.totalPages}
      page={bookables.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
});

BookablesPagination.displayName = "BookablesPagination";

export const BookablesList = memo(() => {
  return <BookablesTable />;
});

BookablesList.displayName = "BookablesList";

export const BookablesLoading = () => {
  return <LoadingView message="Loading bookables..." />;
};

export const BookablesError = () => {
  return <ErrorView message="Error loading bookables" />;
};

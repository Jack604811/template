"use client";

import { memo, useState, createContext, useCallback, useContext } from "react";
import {
  EntityContainer,
  EntitySearch,
  EntityPagination,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { BookablesSidebar } from "./bookables-sidebar";
import { BookablesTable } from "./bookables-table";
import { BookablesListHeader } from "./bookables-list-header";
import { useBookablesParams } from "../hooks/use-bookables-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { useSuspenseBookables } from "../hooks/use-bookables";

export const NewItemHandlerContext = createContext<{
  setHandler: (handler: () => void) => void;
} | null>(null);

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

export const BookablesContainer = memo(
  ({ children }: { children: React.ReactNode }) => {
    const [newItemHandler, setNewItemHandler] = useState<(() => void) | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

    const handleSetHandler = useCallback((handler: () => void) => {
      setNewItemHandler(() => handler);
    }, []);

    const contextValue = { setHandler: handleSetHandler };

    const collectionContextValue = { selectedCollectionId, setSelectedCollectionId };

    const fallbackHandler = useCallback(() => {
      // Handler not set yet
    }, []);

    return (
      <NewItemHandlerContext.Provider value={contextValue}>
        <SelectedCollectionContext.Provider value={collectionContextValue}>
          <div className="flex h-full flex-col">
            <div className="flex flex-1 overflow-hidden">
              <BookablesSidebar className="w-64 flex-shrink-0" />
              <div className="flex-1 flex flex-col overflow-hidden">
                <BookablesListHeader onNew={newItemHandler || undefined} />
                <div className="flex-1 overflow-auto">
                  <EntityContainer
                    search={<BookablesSearch />}
                    pagination={<BookablesPagination />}
                  >
                    {children}
                  </EntityContainer>
                </div>
              </div>
            </div>
          </div>
        </SelectedCollectionContext.Provider>
      </NewItemHandlerContext.Provider>
    );
  },
);

BookablesContainer.displayName = "BookablesContainer";


export const BookablesPagination = memo(() => {
  const collectionContext = useContext(SelectedCollectionContext);
  if (!collectionContext) {
    throw new Error("BookablesPagination must be used within SelectedCollectionContext");
  }
  const { selectedCollectionId } = collectionContext;
  const bookables = useSuspenseBookables(selectedCollectionId);
  const [params, setParams] = useBookablesParams();

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


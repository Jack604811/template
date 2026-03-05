# Optimistic Updates Guide

This document explains how to implement smooth, flicker-free optimistic updates in the Nodebase codebase. Optimistic updates make the UI feel instant by updating the interface immediately, before the server responds.

## Table of Contents

- [Overview](#overview)
- [Pattern 1: React Query Cache Updates (Recommended)](#pattern-1-react-query-cache-updates-recommended)
- [Pattern 2: Component State with Merging (Complex Scenarios)](#pattern-2-component-state-with-merging-complex-scenarios)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

Optimistic updates provide instant UI feedback by:
1. **Immediately updating the UI** with expected changes
2. **Performing the actual mutation** in the background
3. **Replacing optimistic data** with real server data when it arrives
4. **Reverting on error** if the mutation fails

This prevents the jarring experience of items disappearing and reappearing, making the app feel responsive and professional.

## Pattern 1: React Query Cache Updates (Recommended)

This is the **primary pattern** used throughout the codebase. It directly manipulates the React Query cache using `queryClient.setQueryData`, ensuring the optimistic update is part of the query data from the start.

### When to Use

- ✅ List/table views (bookables, collections, workflows)
- ✅ Simple CRUD operations
- ✅ When you have a single source of truth (React Query cache)

### Implementation Steps

#### 1. Update Cache Immediately in Component

```typescript
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

const handleDelete = useCallback(async (itemId: string) => {
  const queryOptions = trpc.items.getMany.queryOptions({
    // ... your query params
  });
  
  // Update cache IMMEDIATELY - remove item optimistically
  queryClient.setQueryData(
    queryOptions.queryKey,
    (oldData: typeof items.data | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        items: oldData.items.filter((item) => item.id !== itemId),
        totalCount: Math.max(0, oldData.totalCount - 1),
      };
    },
  );
  
  // Perform actual delete
  try {
    await removeItem.mutateAsync({ id: itemId });
  } catch {
    // On error, revert optimistic update by invalidating
    queryClient.invalidateQueries(queryOptions);
  }
}, [removeItem, trpc, queryClient]);
```

#### 2. Update Mutation Hook to Replace Temp IDs

For **duplicate/create** operations, the mutation hook should replace temporary IDs with real server IDs:

```typescript
export const useDuplicateItem = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.items.duplicate.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Item "${data.name}" duplicated`);
        
        // Update cache directly to prevent item from disappearing
        // Find and replace optimistic duplicate (with temp ID) with real data
        // This MUST happen before any query invalidation to prevent flicker
        queryClient.setQueriesData(
          { queryKey: [["items", "getMany"]] },
          (oldData: Awaited<ReturnType<typeof trpc.items.getMany.query>> | undefined) => {
            if (!oldData) return oldData;
            
            // Find optimistic duplicate with matching name and temp ID
            const optimisticIndex = oldData.items.findIndex(
              (item) => item.name === data.name && item.id.startsWith("temp-"),
            );
            
            if (optimisticIndex >= 0) {
              // Replace optimistic item with real data
              const updated = { ...oldData };
              updated.items = [...oldData.items];
              updated.items[optimisticIndex] = data as typeof oldData.items[number];
              return updated;
            }
            
            // Check if real item already exists
            if (oldData.items.some((item) => item.id === data.id)) {
              return oldData;
            }
            
            // Add new item if not found
            return {
              ...oldData,
              items: [...oldData.items, data as typeof oldData.items[number]],
              totalCount: oldData.totalCount + 1,
            };
          },
        );
        
        // Only invalidate related queries (e.g., counts)
        // Don't invalidate main query - cache update above is sufficient
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.itemCollections.getMany.queryOptions(),
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to duplicate item: ${error.message}`);
      },
    }),
  );
};
```

### Complete Example: Delete Operation

```typescript
"use client";

import { memo, useCallback } from "react";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSuspenseItems } from "../hooks/use-items";
import { useRemoveItem } from "../hooks/use-items";

export const ItemsTable = memo(() => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const items = useSuspenseItems();
  const removeItem = useRemoveItem();
  
  const handleDelete = useCallback(async (itemId: string) => {
    // Update cache optimistically - remove immediately
    const queryOptions = trpc.items.getMany.queryOptions({
      // ... your query params
    });
    
    queryClient.setQueryData(
      queryOptions.queryKey,
      (oldData: typeof items.data | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((item) => item.id !== itemId),
          totalCount: Math.max(0, oldData.totalCount - 1),
        };
      },
    );
    
    // Perform actual delete
    try {
      await removeItem.mutateAsync({ id: itemId });
    } catch {
      // On error, revert optimistic update by invalidating
      queryClient.invalidateQueries(queryOptions);
    }
  }, [removeItem, trpc, queryClient, items.data]);
  
  // ... rest of component
});
```

### Complete Example: Duplicate Operation

```typescript
const handleDuplicate = useCallback(async (itemId: string) => {
  // Find the item to duplicate
  const baseItems = items.data.items;
  const originalItem = baseItems.find((item) => item.id === itemId);
  
  if (!originalItem) return;
  
  const tempId = `temp-${Date.now()}`;
  const optimisticDuplicate = {
    ...originalItem,
    id: tempId,
    name: `${originalItem.name} Copy`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Update cache IMMEDIATELY with optimistic duplicate
  const queryOptions = trpc.items.getMany.queryOptions({
    // ... your query params
  });
  
  queryClient.setQueryData(
    queryOptions.queryKey,
    (oldData: typeof items.data | undefined) => {
      if (!oldData) {
        const newData: typeof items.data = {
          items: [optimisticDuplicate as typeof items.data.items[number]],
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        };
        return newData;
      }
      return {
        ...oldData,
        items: [...oldData.items, optimisticDuplicate as typeof oldData.items[number]],
        totalCount: oldData.totalCount + 1,
      };
    },
  );
  
  // Perform actual duplicate - mutation hook will replace temp ID with real ID
  try {
    await duplicateItem.mutateAsync({ id: itemId });
  } catch {
    // On error, remove optimistic item from cache
    queryClient.setQueryData(
      queryOptions.queryKey,
      (oldData: typeof items.data | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((item) => item.id !== tempId),
          totalCount: Math.max(0, oldData.totalCount - 1),
        };
      },
    );
  }
}, [duplicateItem, items.data, trpc, queryClient]);
```

## Pattern 2: Component State with Merging (Complex Scenarios)

This pattern uses local component state and `useMemo` to merge optimistic updates with real data. Use this for complex scenarios where you need custom merging logic (e.g., calendar views with time-based matching).

### When to Use

- ✅ Calendar/calendar views with time-based matching
- ✅ Complex merging logic (e.g., matching by time range, not just ID)
- ✅ When optimistic updates need to persist across query refetches

### Implementation Example

```typescript
const [pendingOptimisticItems, setPendingOptimisticItems] = useState<Item[]>([]);

/**
 * Merge base items (from database) with optimistic items (pending updates)
 * Optimistic items take precedence to show updates immediately
 */
const items = useMemo(() => {
  // Create a set of optimistic item IDs to filter out base items that have optimistic updates
  const optimisticIds = new Set(pendingOptimisticItems.map((item) => item.id));
  
  // Filter out base items that have optimistic updates (optimistic takes precedence)
  const baseItemsWithoutOptimistic = baseItems.filter(
    (item) => !optimisticIds.has(item.id),
  );
  
  // Create a set of real item IDs for quick lookup (for cleanup)
  const realItemIds = new Set(baseItems.map((item) => item.id));
  
  // Filter optimistic items:
  // - Keep temp items (new items not yet in database)
  // - Keep optimistic updates for existing items (will be cleaned up when real data arrives)
  const validOptimistic = pendingOptimisticItems.filter((item) => {
    // Always keep temp items
    if (item.id.startsWith("temp-")) return true;
    // Keep optimistic updates for existing items
    return realItemIds.has(item.id);
  });
  
  // Merge: base items (excluding those with optimistic updates) + valid optimistic items
  return [...baseItemsWithoutOptimistic, ...validOptimistic];
}, [baseItems, pendingOptimisticItems]);

/**
 * Clean up optimistic items when real items arrive from the database
 * Only removes optimistic entries when we have a real item that matches
 */
useEffect(() => {
  if (pendingOptimisticItems.length === 0) return;
  
  const realItemIds = new Set(baseItems.map((item) => item.id));
  
  setPendingOptimisticItems((prev) => {
    // Remove optimistic items that now exist in real data (non-temp IDs)
    const filtered = prev.filter((item) => {
      // Keep temp items
      if (item.id.startsWith("temp-")) return true;
      // Remove if exists in real data
      return !realItemIds.has(item.id);
    });
    
    // Only update state if something actually changed
    return filtered.length !== prev.length ? filtered : prev;
  });
}, [baseItems, pendingOptimisticItems]);

const handleAdd = (newItem: Item) => {
  const tempId = `temp-${Date.now()}`;
  const optimisticItem = { ...newItem, id: tempId };
  
  // Synchronous state update - triggers immediate re-render
  setPendingOptimisticItems((prev) => [...prev, optimisticItem]);
};
```

## Best Practices

### 1. Always Update Cache Before Mutation

```typescript
// ✅ GOOD: Update cache first, then mutate
queryClient.setQueryData(queryKey, newData);
await mutation.mutateAsync();

// ❌ BAD: Mutate first, then update cache (causes flicker)
await mutation.mutateAsync();
queryClient.setQueryData(queryKey, newData);
```

### 2. Use Temp IDs for New Items

```typescript
// ✅ GOOD: Use temp ID prefix
const tempId = `temp-${Date.now()}`;

// ❌ BAD: Use random UUID or empty string
const tempId = crypto.randomUUID();
```

### 3. Replace Temp IDs in Mutation Hook

```typescript
// ✅ GOOD: Mutation hook replaces temp ID with real ID
onSuccess: (data) => {
  queryClient.setQueriesData(
    { queryKey: [["items", "getMany"]] },
    (oldData) => {
      const index = oldData.items.findIndex(
        (item) => item.id.startsWith("temp-") && item.name === data.name
      );
      if (index >= 0) {
        oldData.items[index] = data;
      }
      return oldData;
    }
  );
}
```

### 4. Handle Errors Gracefully

```typescript
// ✅ GOOD: Revert optimistic update on error
try {
  await mutation.mutateAsync();
} catch {
  queryClient.invalidateQueries(queryOptions);
}

// ❌ BAD: Leave optimistic update in place on error
await mutation.mutateAsync(); // No error handling
```

### 5. Use `startTransition` for Non-Blocking Invalidations

```typescript
// ✅ GOOD: Non-blocking invalidation
startTransition(() => {
  queryClient.invalidateQueries(relatedQueryOptions);
});

// ❌ BAD: Blocking invalidation
queryClient.invalidateQueries(relatedQueryOptions);
```

### 6. Don't Invalidate Main Query After Cache Update

```typescript
// ✅ GOOD: Update cache, only invalidate related queries
queryClient.setQueriesData({ queryKey: [["items", "getMany"]] }, updater);
startTransition(() => {
  queryClient.invalidateQueries(trpc.itemCounts.getMany.queryOptions());
});

// ❌ BAD: Invalidate main query (causes flicker)
queryClient.setQueriesData({ queryKey: [["items", "getMany"]] }, updater);
queryClient.invalidateQueries({ queryKey: [["items", "getMany"]] }); // Causes refetch!
```

## Common Patterns

### Delete Operation

```typescript
const handleDelete = useCallback(async (itemId: string) => {
  const queryOptions = trpc.items.getMany.queryOptions(params);
  
  // Remove immediately
  queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      items: oldData.items.filter((item) => item.id !== itemId),
      totalCount: Math.max(0, oldData.totalCount - 1),
    };
  });
  
  try {
    await removeItem.mutateAsync({ id: itemId });
  } catch {
    queryClient.invalidateQueries(queryOptions);
  }
}, [removeItem, trpc, queryClient]);
```

### Duplicate Operation

```typescript
const handleDuplicate = useCallback(async (itemId: string) => {
  const original = items.find((item) => item.id === itemId);
  if (!original) return;
  
  const tempId = `temp-${Date.now()}`;
  const optimistic = { ...original, id: tempId, name: `${original.name} Copy` };
  
  // Add immediately
  queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
    if (!oldData) return { items: [optimistic], ...paginationDefaults };
    return {
      ...oldData,
      items: [...oldData.items, optimistic],
      totalCount: oldData.totalCount + 1,
    };
  });
  
  try {
    await duplicateItem.mutateAsync({ id: itemId });
    // Mutation hook replaces temp ID with real ID
  } catch {
    // Remove on error
    queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        items: oldData.items.filter((item) => item.id !== tempId),
        totalCount: Math.max(0, oldData.totalCount - 1),
      };
    });
  }
}, [duplicateItem, items, trpc, queryClient]);
```

### Update Operation

```typescript
const handleUpdate = useCallback(async (itemId: string, updates: Partial<Item>) => {
  const queryOptions = trpc.items.getMany.queryOptions(params);
  
  // Update immediately
  queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      items: oldData.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    };
  });
  
  try {
    await updateItem.mutateAsync({ id: itemId, ...updates });
    // Mutation hook can update with real data if needed
  } catch {
    queryClient.invalidateQueries(queryOptions);
  }
}, [updateItem, trpc, queryClient]);
```

## Troubleshooting

### Items Disappear and Reappear

**Problem**: Items flicker - disappear then reappear after mutation.

**Solution**: 
- Ensure cache update happens **before** mutation
- Don't invalidate the main query after updating cache
- Use `setQueriesData` instead of `invalidateQueries` for the main query

```typescript
// ❌ BAD: Causes flicker
queryClient.setQueryData(queryKey, newData);
queryClient.invalidateQueries(queryKey); // Refetches, causes flicker

// ✅ GOOD: No flicker
queryClient.setQueryData(queryKey, newData);
// Only invalidate related queries
startTransition(() => {
  queryClient.invalidateQueries(relatedQueryOptions);
});
```

### Temp Items Not Replaced

**Problem**: Temporary items with `temp-` prefix remain in the UI.

**Solution**: Ensure mutation hook's `onSuccess` finds and replaces temp items:

```typescript
onSuccess: (data) => {
  queryClient.setQueriesData(
    { queryKey: [["items", "getMany"]] },
    (oldData) => {
      const index = oldData.items.findIndex(
        (item) => item.id.startsWith("temp-") && /* matching criteria */
      );
      if (index >= 0) {
        oldData.items[index] = data; // Replace temp with real
      }
      return oldData;
    }
  );
}
```

### Optimistic Update Reverts on Success

**Problem**: Item disappears when mutation succeeds.

**Solution**: Mutation hook must update cache, not just invalidate:

```typescript
// ❌ BAD: Invalidates, causes item to disappear
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: [["items", "getMany"]] });
}

// ✅ GOOD: Updates cache directly
onSuccess: (data) => {
  queryClient.setQueriesData(
    { queryKey: [["items", "getMany"]] },
    (oldData) => {
      // Replace temp item with real data
      return updatedData;
    }
  );
}
```

### Type Errors with Cache Updates

**Problem**: TypeScript errors when updating cache.

**Solution**: Use proper type assertions:

```typescript
queryClient.setQueryData(
  queryOptions.queryKey,
  (oldData: typeof items.data | undefined) => {
    if (!oldData) {
      const newData: typeof items.data = {
        items: [optimisticItem as typeof items.data.items[number]],
        // ... rest of structure
      };
      return newData;
    }
    return {
      ...oldData,
      items: [...oldData.items, optimisticItem as typeof oldData.items[number]],
    };
  },
);
```

## References

- **Bookables Table**: `src/features/bookables/components/bookables-table.tsx`
- **Collections Sidebar**: `src/features/bookables/components/bookables-sidebar.tsx`
- **Bookings Calendar**: `src/features/bookings/components/booking-calendar/calendar.tsx`
- **Mutation Hooks**: `src/features/bookables/hooks/use-bookables.ts`


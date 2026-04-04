"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { triggerSchemaRegistry } from "@/config/trigger-schema-registry";
import { cn } from "@/lib/utils";
import type { NodeVariables, VariableEntry } from "../types/variables";
import { isPointerTargetInsideVariableInputRoot } from "../utils/variable-picker-visibility";

// Static set of fixed contextKeys from the registry (e.g. "bold", "stripe").
const registeredTriggerContextKeys = new Set(
  Object.values(triggerSchemaRegistry)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => s.contextKey),
);

// Build a lookup: variableName (could be user-defined) → schema, for display labels.
function findSchemaForVariableName(variableName: string) {
  // First try exact contextKey match
  const byKey = Object.values(triggerSchemaRegistry).find(
    (s) => s?.contextKey === variableName,
  );
  if (byKey) return byKey;
  // Then try by NodeType key to match node type entries in the registry
  return Object.values(triggerSchemaRegistry).find(
    (s) => s?.label.toLowerCase() === variableName.toLowerCase(),
  );
}

interface VariablePickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  variables: NodeVariables[];
  isLoading: boolean;
  isLive?: boolean;
  onSelect: (variablePath: string) => void;
  currentNodeId?: string;
  currentNodeVariableName?: string;
}

type FlattenedVariable = {
  entry: VariableEntry;
  label: string;
  root: string;
};

/** Convert technical paths to readable labels for non-developers (e.g. "paymentMethod" → "Payment Method", "payer_email" → "Payer Email"). */
function toFriendlyDisplayLabel(path: string): string {
  const lastSegment = path.split(".").pop() ?? path;
  const withSpaces = lastSegment
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
  return withSpaces
    .split(" ")
    .map((word) =>
      word.toLowerCase() === "id"
        ? "ID"
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

const flattenVariables = (
  entries: VariableEntry[],
  root: string,
  parentLabel?: string,
): FlattenedVariable[] => {
  return entries.flatMap((entry) => {
    const relativePath =
      entry.path.length > 1 ? entry.path.slice(1).join(".") : entry.path[0];
    const label = parentLabel
      ? `${parentLabel}.${entry.key}`
      : relativePath || entry.key;

    const current: FlattenedVariable = {
      entry,
      label,
      root,
    };

    if (!entry.children || entry.children.length === 0) {
      return [current];
    }

    return [current, ...flattenVariables(entry.children, root, label)];
  });
};

/**
 * Check if a node should be excluded from the picker
 * Excludes nodes that match the current nodeId OR have a nodeId starting with "context:"
 * that matches the current node's variableName (for context variables)
 */
const shouldExcludeNode = (
  node: NodeVariables,
  currentNodeId?: string,
  currentNodeVariableName?: string,
): boolean => {
  if (!currentNodeId) {
    return false;
  }

  // Exclude if nodeId matches exactly
  if (node.nodeId === currentNodeId) {
    return true;
  }

  // Exclude context variables that match the current node's variableName
  // Context variables have nodeId format: "context:${variableName}"
  if (
    currentNodeVariableName &&
    node.nodeId.startsWith("context:") &&
    node.variableName === currentNodeVariableName
  ) {
    return true;
  }

  return false;
};

/**
 * Filter nodes to show all directly connected nodes, excluding the current node
 * Shows nodes regardless of execution state - empty state will be shown in variables column
 */
const filterConnectedNodes = (
  nodes: NodeVariables[],
  currentNodeId?: string,
  currentNodeVariableName?: string,
): NodeVariables[] => {
  return nodes.filter(
    (node) => !shouldExcludeNode(node, currentNodeId, currentNodeVariableName),
  );
};

const EmptyState = ({ hasSearch }: { hasSearch: boolean }) => {
  return (
    <div className="flex h-full items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
      {hasSearch
        ? "No variables match your search"
        : "Variables will appear here after the workflow runs at least once"}
    </div>
  );
};

const VariablePreview = ({ preview }: { preview: string }) => {
  return (
    <span className="line-clamp-2 font-mono text-xs text-muted-foreground">
      {preview}
    </span>
  );
};

const NodeColumn = ({
  nodes,
  activeNodeId,
  selectedNodeIndex,
  onSelectNode,
  onActivateNode,
}: {
  nodes: NodeVariables[];
  activeNodeId: string | null;
  selectedNodeIndex: number;
  onSelectNode: (node: NodeVariables) => void;
  onActivateNode: (nodeId: string) => void;
}) => {
  const selectedNodeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedNodeRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
        Run previous nodes to unlock variables
      </div>
    );
  }

  return (
    <ScrollArea className="h-72">
      <div className="flex flex-col">
        {nodes.map((node, index) => {
          const isActive = node.nodeId === activeNodeId;
          const isSelected = index === selectedNodeIndex;
          return (
            <button
              key={node.nodeId}
              ref={isSelected ? selectedNodeRef : null}
              type="button"
              tabIndex={-1}
              onClick={() => onSelectNode(node)}
              onDoubleClick={() => onActivateNode(node.nodeId)}
              className={cn(
                "flex h-12 items-center border-l-2 border-transparent pl-3 pr-2 text-left text-sm transition-colors hover:bg-muted/70",
                isActive && "border-primary bg-muted",
                isSelected && !isActive && "bg-muted/50",
              )}
            >
              <div className="flex-1 truncate font-medium">
                {node.nodeLabel}
              </div>
              <div className="ml-2 text-xs text-muted-foreground">
                {node.variables.length || (node.rootEntry ? 1 : 0)}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

const VariablesColumn = ({
  variables,
  selectedVariableIndex,
  onSelect,
  searchTerm,
}: {
  variables: FlattenedVariable[];
  selectedVariableIndex: number;
  onSelect: (entry: FlattenedVariable) => void;
  searchTerm: string;
}) => {
  const selectedVariableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedVariableRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, []);

  if (variables.length === 0) {
    return <EmptyState hasSearch={Boolean(searchTerm)} />;
  }

  const getDisplayName = (entry: VariableEntry, label: string) => {
    if (
      entry.path[0] === "webhook" &&
      entry.path[1] === "body" &&
      entry.path.length === 2
    ) {
      return "Request data";
    }

    const contextKey = entry.path[0];
    if (contextKey) {
      const schema = registeredTriggerContextKeys.has(contextKey)
        ? Object.values(triggerSchemaRegistry).find(
            (s) => s?.contextKey === contextKey,
          )
        : findSchemaForVariableName(contextKey);
      const fieldKey = entry.path[entry.path.length - 1] ?? "";
      if (schema?.fieldLabels?.[fieldKey]) {
        return schema.fieldLabels[fieldKey];
      }
    }

    return toFriendlyDisplayLabel(label);
  };

  const getPreview = (entry: VariableEntry) => {
    if (
      entry.path[0] === "webhook" &&
      entry.path[1] === "body" &&
      entry.path.length === 2 &&
      entry.children?.length
    ) {
      const fieldNames = entry.children
        .map((c) => toFriendlyDisplayLabel(c.key))
        .join(", ");
      return `Contains: ${fieldNames}`;
    }
    return entry.preview;
  };

  return (
    <ScrollArea className="h-72">
      <div className="flex flex-col">
        {variables.map(({ entry, label }, index) => {
          const isSelected = index === selectedVariableIndex;
          return (
            <button
              key={entry.path.join(".")}
              ref={isSelected ? selectedVariableRef : null}
              type="button"
              tabIndex={-1}
              onClick={() => onSelect({ entry, label, root: entry.path[0] })}
              className={cn(
                "flex flex-col gap-1 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted/70 max-w-[358px]",
                isSelected && "bg-muted",
              )}
            >
              <span className="truncate text-sm font-medium" title={label}>
                {getDisplayName(entry, label)}
              </span>
              <VariablePreview preview={getPreview(entry)} />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export const VariablePickerPopover = memo(
  ({
    open,
    onOpenChange,
    children,
    variables,
    isLoading,
    isLive = false,
    onSelect,
    currentNodeId,
    currentNodeVariableName,
  }: VariablePickerPopoverProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
    const [selectedVariableIndex, setSelectedVariableIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
      if (!open || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.top,
        left: Math.max(8, rect.left - 520 - 32),
      });
    }, [open]);

    // Filter nodes: exclude current node, show all directly connected nodes
    // This ensures the current node is never included, even in search results
    const availableNodes = useMemo(() => {
      return filterConnectedNodes(
        variables,
        currentNodeId,
        currentNodeVariableName,
      );
    }, [variables, currentNodeId, currentNodeVariableName]);

    // Apply search filtering on the already-filtered nodes
    const filteredNodes = useMemo(() => {
      if (!searchTerm.trim()) {
        return availableNodes;
      }

      const term = searchTerm.toLowerCase();
      return availableNodes
        .map((node) => {
          const flattened = flattenVariables(node.variables, node.variableName);
          const candidates = node.rootEntry
            ? [
                {
                  entry: node.rootEntry,
                  label: node.rootEntry.path[0] ?? node.nodeLabel,
                  root: node.rootEntry.path[0] ?? node.nodeLabel,
                },
                ...flattened,
              ]
            : flattened;

          const matchingEntries = candidates.filter((item) => {
            return (
              item.label.toLowerCase().includes(term) ||
              item.entry.preview.toLowerCase().includes(term)
            );
          });

          if (matchingEntries.length === 0) {
            return null;
          }

          return {
            ...node,
            variables: node.variables,
            matches: matchingEntries,
          };
        })
        .filter(Boolean) as Array<
        NodeVariables & { matches: FlattenedVariable[] }
      >;
    }, [availableNodes, searchTerm]);

    // Use filtered nodes for search, or available nodes when no search
    const collection = searchTerm ? filteredNodes : availableNodes;

    // Reset selections when collection changes
    useEffect(() => {
      if (!collection.length) {
        setActiveNodeId(null);
        setSelectedNodeIndex(0);
        setSelectedVariableIndex(0);
        return;
      }

      if (
        !activeNodeId ||
        !collection.some((item) => item.nodeId === activeNodeId)
      ) {
        setActiveNodeId(collection[0].nodeId);
        setSelectedNodeIndex(0);
        setSelectedVariableIndex(0);
      }
    }, [collection, activeNodeId]);

    // Clear search when popover closes
    useEffect(() => {
      if (!open) {
        setSearchTerm("");
        setSelectedNodeIndex(0);
        setSelectedVariableIndex(0);
      }
    }, [open]);

    useEffect(() => {
      if (!open) {
        return;
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (isPointerTargetInsideVariableInputRoot(event.target)) {
          return;
        }
        if (pickerRef.current?.contains(event.target as Node)) {
          return;
        }
        onOpenChange(false);
      };

      document.addEventListener("pointerdown", handlePointerDown, true);

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown, true);
      };
    }, [open, onOpenChange]);

    const activeNode = useMemo(() => {
      if (!collection.length || !activeNodeId) {
        return null;
      }

      return collection.find((item) => item.nodeId === activeNodeId) ?? null;
    }, [collection, activeNodeId]);

    const flattenedVariables = useMemo(() => {
      if (!activeNode) {
        return [];
      }

      const isTriggerNode =
        activeNode.variableName === "webhook" ||
        registeredTriggerContextKeys.has(activeNode.variableName) ||
        Boolean(findSchemaForVariableName(activeNode.variableName));

      if (searchTerm) {
        const filtered = filteredNodes.find(
          (item) => item.nodeId === activeNode.nodeId,
        ) as (NodeVariables & { matches: FlattenedVariable[] }) | undefined;
        let matches = filtered?.matches ?? [];
        if (activeNode.variableName === "webhook") {
          matches = matches.filter(
            (m) => m.entry.path[0] === "webhook" && m.entry.path[1] === "body",
          );
        } else if (isTriggerNode) {
          matches = matches.filter((m) => m.entry.path.length === 2);
        }
        return matches;
      }

      const flattened = flattenVariables(
        activeNode.variables,
        activeNode.variableName,
      );

      if (activeNode.variableName === "webhook") {
        return flattened.filter(
          (item) =>
            item.entry.path[0] === "webhook" && item.entry.path[1] === "body",
        );
      }

      if (isTriggerNode) {
        return flattened.filter((item) => item.entry.path.length === 2);
      }

      if (activeNode.rootEntry) {
        return [
          {
            entry: activeNode.rootEntry,
            label: activeNode.rootEntry.path[0] ?? activeNode.nodeLabel,
            root: activeNode.rootEntry.path[0] ?? activeNode.nodeLabel,
          },
          ...flattened,
        ];
      }

      return flattened;
    }, [activeNode, filteredNodes, searchTerm]);

    const handleSelectVariable = useCallback(
      (item: FlattenedVariable) => {
        onSelect(item.entry.template);
        setSearchTerm("");
        setSelectedVariableIndex(0);
      },
      [onSelect],
    );

    const handleSelectNode = useCallback(
      (node: NodeVariables) => {
        if (node.nodeId === activeNodeId && node.rootEntry) {
          // Double-click behavior - insert root
          onSelect(node.rootEntry.template);
          setSearchTerm("");
          setSelectedNodeIndex(0);
        } else {
          // Single-click - activate node
          setActiveNodeId(node.nodeId);
          setSelectedNodeIndex(
            collection.findIndex((n) => n.nodeId === node.nodeId),
          );
          setSelectedVariableIndex(0);
        }
      },
      [activeNodeId, collection, onSelect],
    );

    const handleActivateNode = useCallback(
      (nodeId: string) => {
        const node = collection.find((n) => n.nodeId === nodeId);
        if (node?.rootEntry) {
          onSelect(node.rootEntry.template);
          setSearchTerm("");
        }
      },
      [collection, onSelect],
    );

    const pickerContent = open && pickerPos && (
      /* biome-ignore lint/a11y/noStaticElementInteractions: div needs onMouseDown to prevent focus loss, onWheel to prevent canvas pan */
      <div
        ref={pickerRef}
        style={{ position: "fixed", top: pickerPos.top, left: pickerPos.left, width: 520, zIndex: 200 }}
        className="rounded-md border bg-popover text-popover-foreground shadow-md p-0"
        onMouseDown={(e) => {
          if (
            searchInputRef.current &&
            searchInputRef.current.contains(e.target as Node)
          ) {
            return;
          }
          e.preventDefault();
        }}
        onWheel={(e) => e.stopPropagation()}
      >
            <div className="border-b border-border/60 px-3 py-2">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSelectedVariableIndex(0);
                  }}
                  placeholder="Search variables..."
                  className="h-7 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 shadow-none"
                  autoFocus
                />
                {isLoading ? (
                  <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                ) : isLive ? (
                  <span
                    className="relative flex size-2 shrink-0"
                    title="Live — updates as nodes complete"
                    aria-hidden="true"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex divide-x divide-border/60">
              <div className="w-40">
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <NodeColumn
                    nodes={collection}
                    activeNodeId={activeNodeId}
                    selectedNodeIndex={selectedNodeIndex}
                    onSelectNode={handleSelectNode}
                    onActivateNode={handleActivateNode}
                  />
                )}
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : (
                  <VariablesColumn
                    variables={flattenedVariables}
                    selectedVariableIndex={selectedVariableIndex}
                    searchTerm={searchTerm}
                    onSelect={handleSelectVariable}
                  />
                )}
              </div>
            </div>
          </div>
    );

    return (
      <>
        <div ref={wrapperRef}>{children}</div>
        {pickerContent && typeof document !== "undefined"
          ? createPortal(pickerContent, document.body)
          : null}
      </>
    );
  },
);

VariablePickerPopover.displayName = "VariablePickerPopover";

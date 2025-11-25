"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { VariablePickerPopover } from "@/features/editor/components/variable-picker-popover";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import {
  parseValueToTokens,
  renderTokensToNodes,
  serializeContentToValue,
  insertVariableAtCursor,
  handleBackspaceOnVariable,
  handleDeleteOnVariable,
  handlePaste,
} from "@/lib/variable-utils";

type VariableTextareaProps = Omit<
  React.ComponentProps<"div">,
  "children" | "onChange"
> & {
  nodeId: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: ((value: string) => void) | ((event: { target: { value: string } }) => void);
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  rows?: number;
};

export const VariableTextarea = forwardRef<
  HTMLDivElement,
  VariableTextareaProps
>(
  (
    {
      nodeId,
      value,
      defaultValue,
      placeholder,
      onChange,
      onFocus,
      onBlur,
      disabled = false,
      rows = 3,
      className,
      ...props
    },
    ref,
  ) => {
    const contentEditableRef = useRef<HTMLDivElement | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const isUpdatingRef = useRef(false);
    const { getNode } = useReactFlow();

    const { variables, isLoading, isFetching, refetch } =
      useWorkflowVariables(nodeId);

    // Get the current node's variableName from React Flow node data
    const currentNodeVariableName = useMemo(() => {
      const node = getNode(nodeId);
      return (node?.data?.variableName as string | undefined)?.trim() || undefined;
    }, [getNode, nodeId]);

    // Expose the contentEditable element via ref
    useImperativeHandle(
      ref,
      () => contentEditableRef.current as HTMLDivElement,
      [],
    );

    // Update content when value changes externally
    useEffect(() => {
      const element = contentEditableRef.current;
      if (!element || isUpdatingRef.current) {
        return;
      }

      const currentValue = value ?? defaultValue ?? "";
      const serializedValue = serializeContentToValue(element);

      // Only update if values differ
      if (serializedValue !== currentValue) {
        isUpdatingRef.current = true;

        // Clear and re-render content
        element.innerHTML = "";
        const tokens = parseValueToTokens(currentValue);
        const nodes = renderTokensToNodes(tokens);
        for (const node of nodes) {
          element.appendChild(node);
        }

        setIsEmpty(!currentValue);

        isUpdatingRef.current = false;
      }
    }, [value, defaultValue]);

    // Initialize content on mount
    useEffect(() => {
      const element = contentEditableRef.current;
      if (!element) {
        return;
      }

      // Only initialize if element is truly empty
      const hasContent = element.textContent?.trim() || element.querySelector('[data-variable]');
      if (hasContent) {
        setIsEmpty(false);
        return;
      }

      const initialValue = value ?? defaultValue ?? "";
      if (initialValue) {
        const tokens = parseValueToTokens(initialValue);
        const nodes = renderTokensToNodes(tokens);
        for (const node of nodes) {
          element.appendChild(node);
        }
        setIsEmpty(false);
      } else {
        setIsEmpty(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInput = useCallback(() => {
      if (isUpdatingRef.current) {
        return;
      }

      const element = contentEditableRef.current;
      if (!element) {
        return;
      }

      const serialized = serializeContentToValue(element);
      const empty = !serialized || serialized.trim() === "";
      setIsEmpty(empty);
      
      // React Hook Form's onChange accepts the value directly
      if (onChange) {
        // @ts-expect-error - React Hook Form onChange can accept string directly
        onChange(serialized);
      }
    }, [onChange]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        // Handle backspace on variables
        if (event.key === "Backspace") {
          if (handleBackspaceOnVariable(event.nativeEvent)) {
            handleInput();
            return;
          }
        }

        // Handle delete on variables
        if (event.key === "Delete") {
          if (handleDeleteOnVariable(event.nativeEvent)) {
            handleInput();
            return;
          }
        }

        // Handle Escape to blur
        if (event.key === "Escape") {
          event.preventDefault();
          contentEditableRef.current?.blur();
        }

        // Allow Enter for new lines (default behavior for contentEditable)
      },
      [handleInput],
    );

    const handlePasteEvent = useCallback(
      (event: React.ClipboardEvent<HTMLDivElement>) => {
        const element = contentEditableRef.current;
        if (!element) {
          return;
        }

        handlePaste(event.nativeEvent, element);
        handleInput();
      },
      [handleInput],
    );

    const handleFocusEvent = useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        setIsFocused(true);
        void refetch();
        onFocus?.(event);
      },
      [onFocus, refetch],
    );

    const handleBlurEvent = useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        // Delay blur to allow popover clicks
        setTimeout(() => {
          const element = contentEditableRef.current;
          if (element && !element.contains(document.activeElement)) {
            setIsFocused(false);
        onBlur?.(event);
          }
        }, 100);
      },
      [onBlur],
    );

    const handleSelectVariable = useCallback(
      (template: string) => {
        const element = contentEditableRef.current;
        if (!element) {
          return;
        }

        // Extract display text from template
        const match = /\{\{\s*([^}]+?)\s*\}\}/.exec(template);
        if (!match) {
          return;
        }

        const label = match[1].trim();
        const jsonMatch = /^json\s+(.+)$/i.exec(label);
        const display = jsonMatch ? jsonMatch[1] : label;

        // Focus the element first
        element.focus();

        // Insert variable at cursor
        insertVariableAtCursor(template, display);

        // Trigger input event
        handleInput();

        // Keep focus
        element.focus();
      },
      [handleInput],
    );

    // Calculate min-height based on rows prop
    const minHeight = `${rows * 1.5}rem`;

    return (
      <div className="relative">
      <VariablePickerPopover
          open={isFocused}
          onOpenChange={setIsFocused}
        variables={variables}
        isLoading={isLoading}
        isFetching={isFetching}
        onSelect={handleSelectVariable}
          currentNodeId={nodeId}
          currentNodeVariableName={currentNodeVariableName}
      >
        <div className="relative">
            {/* Placeholder */}
            {isEmpty && placeholder && (
          <div
                className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground"
            aria-hidden="true"
              >
                {placeholder}
              </div>
            )}

            {/* ContentEditable Textarea */}
            {/* biome-ignore lint/a11y/useSemanticElements: contentEditable requires div for variable pills */}
            <div
              ref={contentEditableRef}
              contentEditable={!disabled}
              role="textbox"
              aria-multiline="true"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteEvent}
              onFocus={handleFocusEvent}
              onBlur={handleBlurEvent}
              onClick={(e) => {
                // Ensure focus on click
                if (!disabled && contentEditableRef.current) {
                  contentEditableRef.current.focus();
                }
                props.onClick?.(e);
              }}
              tabIndex={disabled ? -1 : 0}
              style={{ minHeight }}
            className={cn(
                "w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors outline-none",
                "whitespace-pre-wrap break-words",
                "md:text-sm",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
              {...props}
          />
        </div>
      </VariablePickerPopover>
      </div>
    );
  },
);

VariableTextarea.displayName = "VariableTextarea";

"use client";

import { useReactFlow } from "@xyflow/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { VariablePickerPopover } from "@/features/editor/components/variable-picker-popover";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { cn } from "@/lib/utils";
import {
  handleBackspaceOnVariable,
  handleDeleteOnVariable,
  handlePaste,
  insertVariableAtCursor,
  parseValueToTokens,
  renderTokensToNodes,
  serializeContentToValue,
} from "@/lib/variable-utils";

type VariableInputProps = Omit<
  React.ComponentProps<"div">,
  "children" | "onChange"
> & {
  nodeId: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: { target: { value: string } }) => void);
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  /**
   * When true, always keep at most a single variable/token in this input.
   * Used for places like the Condition node where only one variable makes sense.
   */
  singleVariable?: boolean;
};

export const VariableInput = forwardRef<HTMLDivElement, VariableInputProps>(
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
      singleVariable = false,
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

    const { variables, isLoading, isLive } =
      useWorkflowVariables(nodeId);

    // Get the current node's variableName from React Flow node data
    const currentNodeVariableName = useMemo(() => {
      const node = getNode(nodeId);
      return (
        (node?.data?.variableName as string | undefined)?.trim() || undefined
      );
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
    // biome-ignore lint/correctness/useExhaustiveDependencies: we only want this to run once on mount
    useEffect(() => {
      const element = contentEditableRef.current;
      if (!element) {
        return;
      }

      // Only initialize if element is truly empty
      const hasContent =
        element.textContent?.trim() || element.querySelector("[data-variable]");
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

    const moveCaretToEnd = (element: HTMLDivElement) => {
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    };

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
        const element = contentEditableRef.current;

        // Handle backspace on variables
        if (event.key === "Backspace") {
          if (singleVariable && element) {
            // In single-variable mode, if there's any variable chip, clear it entirely
            const hasVariable = element.querySelector("[data-variable]");
            if (hasVariable) {
              event.preventDefault();
              element.innerHTML = "";
              handleInput();
              return;
            }
          }

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

        // Prevent Enter key (single line input)
        if (event.key === "Enter") {
          event.preventDefault();
        }

        // Handle Escape to blur
        if (event.key === "Escape") {
          event.preventDefault();
          contentEditableRef.current?.blur();
        }
      },
      [handleInput, singleVariable],
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
        onFocus?.(event);
      },
      [onFocus],
    );

    const handleBlurEvent = useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        // Delay blur to allow popover interactions (search input, list items, etc.)
        setTimeout(() => {
          const element = contentEditableRef.current;
          if (!element) {
            return;
          }

          // Treat clicks inside the variable picker popover as \"inside\" the control
          const root = element.closest<HTMLDivElement>(
            "[data-variable-input-root]",
          );
          const active = document.activeElement;

          if (root && active && root.contains(active)) {
            return;
          }

          setIsFocused(false);
          onBlur?.(event);
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

        // In "singleVariable" mode, always replace existing content with just this variable
        if (singleVariable) {
          element.innerHTML = "";
        }

        // Insert variable at cursor
        insertVariableAtCursor(template, display);

        // Trigger input event
        handleInput();

        // Keep focus
        element.focus();
      },
      [handleInput, singleVariable],
    );

    return (
      <div className="relative min-w-0 w-full" data-variable-input-root>
        <VariablePickerPopover
          open={isFocused}
          onOpenChange={setIsFocused}
          variables={variables}
          isLoading={isLoading}
          isLive={isLive}
          onSelect={handleSelectVariable}
          currentNodeId={nodeId}
          currentNodeVariableName={currentNodeVariableName}
        >
          <div className="relative min-w-0 w-full">
            {/* Placeholder */}
            {isEmpty && placeholder && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center truncate px-3 text-sm text-muted-foreground"
                aria-hidden="true"
              >
                {placeholder}
              </div>
            )}

            {/* ContentEditable Input */}
            {/* biome-ignore lint/a11y/useSemanticElements: contentEditable requires div for variable pills */}
            <div
              ref={contentEditableRef}
              contentEditable={!disabled}
              role="textbox"
              aria-multiline="false"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteEvent}
              onFocus={handleFocusEvent}
              onBlur={handleBlurEvent}
              onClick={(e) => {
                // Ensure focus and place caret at the end so it feels editable
                if (!disabled && contentEditableRef.current) {
                  const el = contentEditableRef.current;
                  el.focus();
                  moveCaretToEnd(el);
                }
                props.onClick?.(e);
              }}
              tabIndex={disabled ? -1 : 0}
              className={cn(
                "flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none cursor-text",
                "overflow-x-auto whitespace-nowrap",
                "md:text-sm",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "[&:empty]:before:content-[attr(data-placeholder)]",
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

VariableInput.displayName = "VariableInput";

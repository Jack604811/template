"use client";

import { useReactFlow } from "@xyflow/react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { VariablePickerPopover } from "@/features/editor/components/variable-picker-popover";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

type VariableTextareaProps = {
  nodeId: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: { target: { value: string } }) => void);
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
};

export const VariableTextarea = forwardRef<
  HTMLTextAreaElement,
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
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const { getNode } = useReactFlow();

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement, []);

    const { variables, isLoading, isLive } = useWorkflowVariables(nodeId);

    const currentNodeVariableName = useMemo(() => {
      const node = getNode(nodeId);
      return (node?.data?.variableName as string | undefined)?.trim() || undefined;
    }, [getNode, nodeId]);

    const fireChange = useCallback(
      (newValue: string) => {
        if (onChange) {
          // @ts-expect-error - RHF onChange accepts string directly
          onChange(newValue);
        }
      },
      [onChange],
    );

    const handleSelectVariable = useCallback(
      (template: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        const current = textarea.value;

        const newValue =
          current.slice(0, start) + template + current.slice(end);

        fireChange(newValue);

        requestAnimationFrame(() => {
          textarea.focus();
          const pos = start + template.length;
          textarea.setSelectionRange(pos, pos);
        });
      },
      [fireChange],
    );

    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLTextAreaElement>) => {
        setTimeout(() => {
          const root = textareaRef.current?.closest("[data-variable-input-root]");
          if (root?.contains(document.activeElement)) return;
          setIsFocused(false);
          onBlur?.(event);
        }, 100);
      },
      [onBlur],
    );

    return (
      <div className="relative w-full min-w-0" data-variable-input-root>
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
          <Textarea
            ref={textareaRef}
            value={value ?? defaultValue ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            onChange={(e) => fireChange(e.target.value)}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => e.stopPropagation()}
            className={cn("nodrag resize-none", className)}
          />
        </VariablePickerPopover>
      </div>
    );
  },
);

VariableTextarea.displayName = "VariableTextarea";

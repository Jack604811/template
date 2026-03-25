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
import { Input } from "./input";

type VariableInputProps = {
  nodeId: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: { target: { value: string } }) => void);
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  singleVariable?: boolean;
  className?: string;
};

export const VariableInput = forwardRef<HTMLInputElement, VariableInputProps>(
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
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const { getNode } = useReactFlow();

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

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
        const input = inputRef.current;
        if (!input) return;

        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const current = input.value;

        const newValue = singleVariable
          ? template
          : current.slice(0, start) + template + current.slice(end);

        fireChange(newValue);

        requestAnimationFrame(() => {
          input.focus();
          const pos = singleVariable ? newValue.length : start + template.length;
          input.setSelectionRange(pos, pos);
        });
      },
      [fireChange, singleVariable],
    );

    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setTimeout(() => {
          const root = inputRef.current?.closest("[data-variable-input-root]");
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
          <Input
            ref={inputRef}
            value={value ?? defaultValue ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => fireChange(e.target.value)}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => e.stopPropagation()}
            className={cn("nodrag", className)}
          />
        </VariablePickerPopover>
      </div>
    );
  },
);

VariableInput.displayName = "VariableInput";

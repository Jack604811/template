"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useReactFlow } from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { VariablePickerPopover } from "@/features/editor/components/variable-picker-popover";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { cn } from "@/lib/utils";
import type { JavascriptNodeData } from "./executor";

const formSchema = z.object({
  code: z.string(),
});

export type JavascriptFormValues = z.infer<typeof formSchema>;

interface JavascriptNodeContentProps {
  nodeId: string;
  defaultValues: Partial<JavascriptNodeData>;
  onDataChange: (values: JavascriptFormValues) => void;
}

interface CodeEditorProps {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function CodeEditor({ nodeId, value, onChange, className }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { getNode } = useReactFlow();

  const { variables, isLoading, isLive } = useWorkflowVariables(nodeId);

  const currentNodeVariableName = useMemo(() => {
    const node = getNode(nodeId);
    return (node?.data?.variableName as string | undefined)?.trim() || undefined;
  }, [getNode, nodeId]);

  const lines = value === "" ? 1 : value.split("\n").length;

  const syncScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleSelectVariable = useCallback(
    (template: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const newValue = `${value.slice(0, start)}${template}${value.slice(end)}`;

      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + template.length;
        textarea.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
      const root = textareaRef.current?.closest("[data-variable-input-root]");
      if (root?.contains(document.activeElement)) return;
      setIsFocused(false);
    }, 100);
    void e;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation();

      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = `${value.substring(0, start)}  ${value.substring(end)}`;
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange],
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
        <div
          className={cn(
            "nodrag nopan flex overflow-hidden rounded-md border border-border bg-[#0d0d0d] font-mono text-xs",
            className,
          )}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <div
            ref={gutterRef}
            className="overflow-hidden select-none flex-shrink-0 py-3 pr-3 pl-2 text-right text-[#4a4a5a] border-r border-[#1e1e2e]"
            style={{ minWidth: "2.75rem" }}
            aria-hidden
          >
            {Array.from({ length: lines }, (_, i) => (
              <div key={`line-${i + 1}`} className="leading-[1.6rem]">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 resize-none bg-transparent py-3 px-3 outline-none leading-[1.6rem] text-[#cdd6f4] placeholder:text-[#4a4a5a] overflow-auto"
            style={{ minHeight: "100%" }}
            placeholder={
              "// Write JavaScript here\n// Use `context` to access previous node outputs\n// Return a value: return context.myNode.data;"
            }
          />
        </div>
      </VariablePickerPopover>
    </div>
  );
}

export function JavascriptNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: JavascriptNodeContentProps) {
  const form = useForm<JavascriptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange({ code: value.code ?? "" });
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Code</FormLabel>
              <FormControl>
                <CodeEditor
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  className="min-h-[180px] max-h-[418px]"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

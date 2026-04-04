"use client";

import {
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { type Diagnostic, lintGutter, linter } from "@codemirror/lint";
import { type Extension, RangeSetBuilder } from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariablePickerPopover } from "@/features/editor/components/variable-picker-popover";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";

const VARIABLE_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const TEMPLATE_RE = /\{\{[^}]*\}\}/g;

class VariablePillWidget extends WidgetType {
  constructor(
    readonly display: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-variable-pill";
    span.textContent = this.display;
    return span;
  }

  eq(other: VariablePillWidget): boolean {
    return this.display === other.display;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    VARIABLE_RE.lastIndex = 0;
    for (
      let match = VARIABLE_RE.exec(text);
      match !== null;
      match = VARIABLE_RE.exec(text)
    ) {
      const start = from + match.index;
      const end = start + match[0].length;
      const label = match[1].trim();
      const jsonMatch = /^json\s+(.+)$/i.exec(label);
      const display = (jsonMatch ? jsonMatch[1] : label).replace(
        /\[([^\]]+)\]/g,
        "$1",
      );
      builder.add(
        start,
        end,
        Decoration.replace({
          widget: new VariablePillWidget(display),
        }),
      );
    }
  }
  return builder.finish();
}

const variableDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

const nodebaseTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0d0d0d",
      color: "#cdd6f4",
      fontSize: "12px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    },
    ".cm-content": {
      caretColor: "#cdd6f4",
      padding: "8px 0",
    },
    ".cm-gutters": {
      backgroundColor: "#0d0d0d",
      color: "#585b70",
      border: "none",
      minWidth: "32px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#cdd6f4",
    },
    ".cm-activeLine": {
      backgroundColor: "#1e1e2e33",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#cdd6f4",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#45475a66",
    },
    ".cm-scroller": {
      overflow: "auto",
      minHeight: "180px",
      maxHeight: "418px",
    },
    ".cm-variable-pill": {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: "9999px",
      backgroundColor: "hsl(262 80% 50% / 0.15)",
      padding: "1px 10px",
      fontSize: "12px",
      fontWeight: "500",
      color: "hsl(262 80% 65%)",
      margin: "0 2px",
      cursor: "default",
      userSelect: "none",
      verticalAlign: "baseline",
      lineHeight: "1.4",
    },
    ".cm-lintRange-error": {
      backgroundImage: "none",
      borderBottom: "2px solid #f38ba8",
      paddingBottom: "1px",
    },
    ".cm-lint-marker-error": {
      color: "#f38ba8",
      content: "'●'",
    },
    ".cm-diagnostic-error": {
      borderLeft: "3px solid #f38ba8",
      color: "#cdd6f4",
      paddingLeft: "6px",
    },
    ".cm-gutter-lint": {
      width: "16px",
    },
    ".cm-gutter-lint .cm-gutterElement": {
      padding: "0 2px",
    },
  },
  { dark: true },
);

// Replace {{...}} templates with same-length valid JS so Lezer positions
// in the sanitized string map 1:1 to positions in the original code.
function sanitizeTemplates(code: string): string {
  return code.replace(TEMPLATE_RE, (m) => {
    const len = m.length;
    // "(null)" is 6 chars — pad the middle with spaces for longer templates.
    if (len >= 6) return `(null${" ".repeat(len - 6)})`;
    // For shorter (edge case): fall back to zero-padded number literal.
    return `0${" ".repeat(len - 1)}`;
  });
}

const jsSyntaxLinter = linter((view) => {
  const code = view.state.doc.toString();
  const sanitized = sanitizeTemplates(code);

  // Get a human-readable error message from the browser's JS engine.
  let errorMessage = "Syntax error";
  try {
    new Function(sanitized);
  } catch (e) {
    if (e instanceof SyntaxError) {
      errorMessage = e.message;
    }
  }

  // Parse the sanitized code with Lezer for accurate positions.
  // Because sanitizeTemplates preserves string length, positions are identical
  // to the original — no offset arithmetic needed.
  const diagnostics: Diagnostic[] = [];
  javascriptLanguage.parser.parse(sanitized).cursor().iterate((node) => {
    if (node.type.isError) {
      diagnostics.push({
        from: node.from,
        to: Math.max(node.from + 1, node.to),
        severity: "error",
        message: errorMessage,
      });
    }
  });
  return diagnostics;
});

function reactFlowIsolation(): Extension {
  return EditorView.domEventHandlers({
    keydown(event) {
      event.stopPropagation();
    },
    wheel(event) {
      event.stopPropagation();
    },
  });
}

interface CodeEditorProps {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxHeight?: string;
}

export function CodeEditor({
  nodeId,
  value,
  onChange,
  placeholder,
  maxHeight,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isInternalRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const { getNode } = useReactFlow();

  const { variables, isLoading, isLive } = useWorkflowVariables(nodeId);

  const currentNodeVariableName = useMemo(() => {
    const node = getNode(nodeId);
    return (
      (node?.data?.variableName as string | undefined)?.trim() || undefined
    );
  }, [getNode, nodeId]);

  onChangeRef.current = onChange;

  // Create editor once on mount — value/placeholder/maxHeight are handled via
  // separate sync effects or are static per instance, so they are intentionally excluded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: editor created once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      javascript(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      indentUnit.of("  "),
      highlightActiveLine(),
      history(),
      keymap.of([...closeBracketsKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap]),
      nodebaseTheme,
      ...(maxHeight
        ? [EditorView.theme({ ".cm-scroller": { maxHeight } })]
        : []),
      syntaxHighlighting(oneDarkHighlightStyle),
      variableDecorationPlugin,
      lintGutter(),
      jsSyntaxLinter,
      reactFlowIsolation(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && isInternalRef.current) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.domEventHandlers({
        focus() {
          setIsFocused(true);
        },
        blur() {
          setTimeout(() => {
            const root = containerRef.current?.closest(
              "[data-variable-input-root]",
            );
            const active = document.activeElement;
            if (root && active && root.contains(active)) return;
            setIsFocused(false);
          }, 100);
        },
      }),
    ];

    if (placeholder) {
      extensions.push(placeholderExt(placeholder));
    }

    const view = new EditorView({
      doc: value,
      extensions,
      parent: containerRef.current,
      dispatch(tr) {
        if (tr.docChanged) {
          isInternalRef.current = true;
        }
        view.update([tr]);
        isInternalRef.current = false;
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  const handleSelectVariable = useCallback((template: string) => {
    const view = viewRef.current;
    if (!view) return;

    view.focus();
    const { from, to } = view.state.selection.main;
    isInternalRef.current = true;
    view.dispatch({
      changes: { from, to, insert: template },
      selection: { anchor: from + template.length },
    });
    isInternalRef.current = false;
    onChangeRef.current(view.state.doc.toString());
  }, []);

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
        <div
          ref={containerRef}
          className="nodrag nopan nowheel w-full rounded-md border border-input overflow-hidden cursor-text"
        />
      </VariablePickerPopover>
    </div>
  );
}

import { useState, useCallback } from "react";
import { PanOnScrollMode } from "@xyflow/react";

export type EditorMode = "pointer" | "hand";

export const useEditorMode = () => {
  const [mode, setMode] = useState<EditorMode>("hand");

  const toggleMode = useCallback((newMode: EditorMode) => {
    setMode(newMode);
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => (current === "hand" ? "pointer" : "hand"));
  }, []);

  const flowProps = {
    panOnScroll: true,
    panOnDrag: mode === "hand",
    selectionOnDrag: mode === "pointer",
    panOnScrollMode: (mode === "pointer" ? PanOnScrollMode.Free : PanOnScrollMode.Vertical),
  } as const;

  return {
    mode,
    setMode: toggleMode,
    toggle,
    flowProps,
  };
};

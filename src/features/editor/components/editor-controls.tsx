"use client";

import { Panel } from "@xyflow/react";
import { Hand, MousePointer2, Redo, Undo, Moon, Sun } from "lucide-react";
import { memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { EditorMode } from "../hooks/use-editor-mode";
import { useWorkflowTemporal } from "../store/workflow-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useTheme } from "next-themes";

interface EditorControlsProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onToggle?: () => void;
}

export const EditorControls = memo(
  ({
    mode,
    onModeChange,
    onToggle,
  }: EditorControlsProps) => {
    const temporalStore = useWorkflowTemporal();
    const { theme, setTheme } = useTheme();
    
    const { undo, redo, pastStates, futureStates } = useStore(
      temporalStore,
      useShallow((state) => ({
        undo: state.undo,
        redo: state.redo,
        pastStates: state.pastStates,
        futureStates: state.futureStates,
      }))
    );

    // Keyboard shortcuts for Undo/Redo and Tab to toggle mode
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Tab key to toggle between pointer and hand (only when not in an input/textarea)
        if (event.key === "Tab" && onToggle) {
          const activeElement = document.activeElement;
          const isInputFocused = 
            activeElement?.tagName === "INPUT" || 
            activeElement?.tagName === "TEXTAREA" ||
            activeElement?.getAttribute("contenteditable") === "true";
          
          if (!isInputFocused) {
            event.preventDefault();
            onToggle();
          }
        }
        
        // Undo/Redo shortcuts
        if ((event.metaKey || event.ctrlKey) && event.key === "z") {
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          event.preventDefault();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, onToggle]);

    return (
      <Panel position="bottom-center" className="flex gap-2">
        <div className="flex items-center gap-2 rounded-full bg-neutral-950 p-2 shadow-lg border border-white/10">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(val) => val && onModeChange(val as EditorMode)}
            className="gap-1"
          >
            <ToggleGroupItem
              value="hand"
              size="sm"
              className="h-8 w-8 rounded-full first:rounded-full last:rounded-full data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Hand Mode"
            >
              <Hand className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="pointer"
              size="sm"
              className="h-8 w-8 rounded-full first:rounded-full last:rounded-full data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Pointer Mode"
            >
              <MousePointer2 className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </Button>
          <div className="h-4 w-px bg-white/20 mx-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => undo()}
              disabled={pastStates.length === 0}
              className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Undo className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => redo()}
              disabled={futureStates.length === 0}
              className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Redo className="size-4" />
            </Button>
          </div>
        </div>
      </Panel>
    );
  },
);

EditorControls.displayName = "EditorControls";

"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
}

/**
 * Hook to handle keyboard shortcuts for clipboard operations
 * @param options - Callback functions for each shortcut
 */
export function useKeyboardShortcuts({
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if modifier key is pressed (Cmd on Mac, Ctrl on Windows/Linux)
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed) {
        return;
      }

      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.hasAttribute("contenteditable"));

      if (isInputFocused) {
        return;
      }

      // Handle keyboard shortcuts
      switch (event.key.toLowerCase()) {
        case "c":
          if (onCopy) {
            event.preventDefault();
            onCopy();
          }
          break;
        case "x":
          if (onCut) {
            event.preventDefault();
            onCut();
          }
          break;
        case "v":
          if (onPaste) {
            event.preventDefault();
            onPaste();
          }
          break;
        case "d":
          if (onDuplicate) {
            event.preventDefault();
            onDuplicate();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCopy, onCut, onPaste, onDuplicate]);
}


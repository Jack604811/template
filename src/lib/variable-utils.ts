/**
 * Shared utilities for variable input/textarea components
 * Handles parsing, serialization, and DOM manipulation for variable pills
 */

export const VARIABLE_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

export interface ParsedToken {
  type: "text" | "variable";
  value: string;
  template?: string;
  label?: string;
  display?: string;
}

/**
 * Parse a string value into tokens (text and variables)
 */
export const parseValueToTokens = (value: string): ParsedToken[] => {
  VARIABLE_REGEX.lastIndex = 0;

  const tokens: ParsedToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_REGEX.exec(value)) !== null) {
    // Add text before variable
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: value.slice(lastIndex, match.index),
      });
    }

    // Add variable token
    const template = match[1].trim();
    const jsonMatch = /^json\s+(.+)$/i.exec(template);
    const display = jsonMatch ? jsonMatch[1] : template;

    tokens.push({
      type: "variable",
      value: match[0],
      template: match[0],
      label: template,
      display,
    });

    lastIndex = VARIABLE_REGEX.lastIndex;
  }

  // Add remaining text
  if (lastIndex < value.length) {
    tokens.push({
      type: "text",
      value: value.slice(lastIndex),
    });
  }

  return tokens;
};

/**
 * Convert contentEditable DOM content back to string value
 */
export const serializeContentToValue = (element: HTMLElement): string => {
  let result = "";

  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Check if it's a variable pill
      if (el.hasAttribute("data-variable")) {
        result += el.getAttribute("data-variable") || "";
      } else if (el.tagName === "BR") {
        result += "\n";
      } else if (el.tagName === "DIV") {
        // Handle div elements created by contentEditable on Enter
        if (result && !result.endsWith("\n")) {
          result += "\n";
        }
        // Process children
        Array.from(el.childNodes).forEach(processNode);
        result += "\n";
      } else {
        // Process children for other elements
        Array.from(el.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(element.childNodes).forEach(processNode);

  // Clean up excessive newlines
  return result.replace(/\n\n+/g, "\n").trim();
};

/**
 * Create a text node
 */
export const createTextNode = (text: string): Text => {
  return document.createTextNode(text);
};

/**
 * Create a variable pill element
 */
export const createVariablePill = (
  template: string,
  display: string,
): HTMLElement => {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.setAttribute("data-variable", template);
  span.className =
    "inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mx-0.5 cursor-default select-none";
  span.textContent = display;

  // Prevent dragging
  span.draggable = false;

  return span;
};

/**
 * Render parsed tokens into DOM nodes
 */
export const renderTokensToNodes = (tokens: ParsedToken[]): Node[] => {
  return tokens.flatMap((token) => {
    if (token.type === "text") {
      // Split by newlines and create BR elements
      const lines = token.value.split("\n");
      const nodes: Node[] = [];

      lines.forEach((line, index) => {
        if (index > 0) {
          nodes.push(document.createElement("br"));
        }
        if (line) {
          nodes.push(createTextNode(line));
        }
      });

      return nodes;
    }

    // Variable token
    return [createVariablePill(token.template!, token.display!)];
  });
};

/**
 * Insert a variable at the current cursor position
 */
export const insertVariableAtCursor = (
  template: string,
  display: string,
): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Create variable pill
  const pill = createVariablePill(template, display);

  // Insert pill
  range.insertNode(pill);

  // Add a space after the pill for better UX
  const space = document.createTextNode(" ");
  range.setStartAfter(pill);
  range.insertNode(space);

  // Move cursor after the space
  range.setStartAfter(space);
  range.setEndAfter(space);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Check if cursor is at the start of a variable pill
 */
export const isCursorBeforeVariable = (): HTMLElement | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    return null;
  }

  // Check if next sibling is a variable pill
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    // If at end of text node, check next sibling
    if (range.startOffset === node.textContent?.length) {
      const nextSibling = node.nextSibling;
      if (
        nextSibling &&
        nextSibling.nodeType === Node.ELEMENT_NODE &&
        (nextSibling as HTMLElement).hasAttribute("data-variable")
      ) {
        return nextSibling as HTMLElement;
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const childAtOffset = el.childNodes[range.startOffset];
    if (
      childAtOffset &&
      childAtOffset.nodeType === Node.ELEMENT_NODE &&
      (childAtOffset as HTMLElement).hasAttribute("data-variable")
    ) {
      return childAtOffset as HTMLElement;
    }
  }

  return null;
};

/**
 * Check if cursor is after a variable pill (for backspace handling)
 */
export const isCursorAfterVariable = (): HTMLElement | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    return null;
  }

  const node = range.startContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    // If at start of text node, check previous sibling
    if (range.startOffset === 0) {
      const prevSibling = node.previousSibling;
      if (
        prevSibling &&
        prevSibling.nodeType === Node.ELEMENT_NODE &&
        (prevSibling as HTMLElement).hasAttribute("data-variable")
      ) {
        return prevSibling as HTMLElement;
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const childBeforeOffset = el.childNodes[range.startOffset - 1];
    if (
      childBeforeOffset &&
      childBeforeOffset.nodeType === Node.ELEMENT_NODE &&
      (childBeforeOffset as HTMLElement).hasAttribute("data-variable")
    ) {
      return childBeforeOffset as HTMLElement;
    }
  }

  return null;
};

/**
 * Handle backspace key to delete variable pills cleanly
 */
export const handleBackspaceOnVariable = (
  event: KeyboardEvent,
): boolean => {
  const variablePill = isCursorAfterVariable();

  if (variablePill) {
    event.preventDefault();
    variablePill.remove();
    return true;
  }

  return false;
};

/**
 * Handle delete key to remove variable pills in front of cursor
 */
export const handleDeleteOnVariable = (event: KeyboardEvent): boolean => {
  const variablePill = isCursorBeforeVariable();

  if (variablePill) {
    event.preventDefault();
    variablePill.remove();
    return true;
  }

  return false;
};

/**
 * Set cursor position at the end of contentEditable element
 */
export const setCursorToEnd = (element: HTMLElement): void => {
  const range = document.createRange();
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Handle paste event to strip formatting and preserve variables
 */
export const handlePaste = (
  event: ClipboardEvent,
  element: HTMLElement,
): void => {
  event.preventDefault();

  const text = event.clipboardData?.getData("text/plain") || "";
  if (!text) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Parse the pasted text for variables
  const tokens = parseValueToTokens(text);
  const nodes = renderTokensToNodes(tokens);

  // Insert nodes
  nodes.forEach((node) => {
    range.insertNode(node);
    range.setStartAfter(node);
  });

  // Collapse range to end
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  // Trigger input event
  element.dispatchEvent(new Event("input", { bubbles: true }));
};


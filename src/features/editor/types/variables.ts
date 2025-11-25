export type VariablePreviewValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | Array<unknown>;

export type VariablePathSegment = string;

export interface VariableEntry {
  /**
   * Variable key within the node context (e.g. "text", "httpResponse").
   */
  key: string;
  /**
   * Complete path segments for nested values (e.g. ["AI", "text"]).
   * The first segment is always the node variable name.
   */
  path: VariablePathSegment[];
  /**
   * Raw value returned from execution context.
   */
  value: unknown;
  /**
   * Stringified preview shown in the UI popover.
   */
  preview: string;
  /**
   * Template string (e.g. "{{AI.text}}" or "{{json webhook}}") used when inserting.
   */
  template: string;
  /**
   * Nested variables derived from objects/arrays.
   */
  children?: VariableEntry[];
}

export interface NodeVariables {
  /**
   * React Flow node id (cuid).
   */
  nodeId: string;
  /**
   * Human-readable node name shown in the editor sidebar.
   */
  nodeLabel: string;
  /**
   * Variable name configured for the node (e.g. "AI").
   */
  variableName: string;
  /**
   * Variables exposed by this node.
   */
  variables: VariableEntry[];
  /**
   * Root entry representing the entire context object for this node (if available).
   */
  rootEntry?: VariableEntry;
}

export interface WorkflowVariables {
  workflowId: string;
  nodes: NodeVariables[];
}


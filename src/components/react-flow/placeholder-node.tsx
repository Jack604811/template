"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { forwardRef, type ReactNode } from "react";

import { BaseNode } from "./base-node";

export type PlaceholderNodeProps = Partial<NodeProps> & {
  children?: ReactNode;
  onClick?: () => void;
};

export const PlaceholderNode = forwardRef<HTMLDivElement, PlaceholderNodeProps>(
  ({ children, onClick }, ref) => {
    return (
      <BaseNode
        ref={ref}
        className="w-auto h-auto border-dashed border-muted-foreground/50 bg-card p-4 text-center text-muted-foreground shadow-none cursor-pointer hover:border-muted-foreground hover:bg-accent py-32"
        onClick={onClick}
      >
        {children}
        <Handle
          type="target"
          style={{ visibility: "hidden" }}
          position={Position.Top}
          isConnectable={false}
        />
        <Handle
          type="source"
          style={{ visibility: "hidden" }}
          position={Position.Bottom}
          isConnectable={false}
        />
      </BaseNode>
    );
  },
);

PlaceholderNode.displayName = "PlaceholderNode";

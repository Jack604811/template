"use client";

import { NodeToolbar } from "@xyflow/react";
import { PlayIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface WorkflowNodeProps {
  children: ReactNode;
  showToolbar?: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
  onExecute?: () => void;
  isExecuting?: boolean;
}

export function WorkflowNode({
  children,
  showToolbar = true,
  onDelete,
  onSettings,
  onExecute,
  isExecuting = false,
}: WorkflowNodeProps) {
  return (
    <>
      {showToolbar && (
        <NodeToolbar>
          {onExecute && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onExecute}
                  disabled={isExecuting}
                >
                  <PlayIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Execute workflow</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={onSettings}>
                  <SettingsIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onDelete}>
                <Trash2Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete</p>
            </TooltipContent>
          </Tooltip>
        </NodeToolbar>
      )}
      {children}
    </>
  );
};

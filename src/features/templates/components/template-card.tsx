"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WorkflowIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow, NodeType } from "@/generated/prisma";
import { extractAppNodeTypes, getNodeTypeIcon } from "../utils/node-type-icons";

interface TemplateCardProps {
  template: Workflow & { 
    category: { name: string; id: string } | null;
    nodes: Array<{ type: NodeType }>;
  };
  onClick: () => void;
  isCreating?: boolean;
}

export const TemplateCard = memo(({
  template,
  onClick,
  isCreating,
}: TemplateCardProps) => {
  const appNodeTypes = useMemo(() => {
    return extractAppNodeTypes(template.nodes);
  }, [template.nodes]);

  const appIcons = useMemo(() => {
    return appNodeTypes
      .slice(0, 5)
      .map((nodeType) => ({
        type: nodeType,
        icon: getNodeTypeIcon(nodeType),
      }))
      .filter((item): item is { type: NodeType; icon: NonNullable<ReturnType<typeof getNodeTypeIcon>> } => 
        item.icon !== null
      );
  }, [appNodeTypes]);

  const remainingCount = appNodeTypes.length - appIcons.length;

  return (
    <button
      type="button"
      onClick={isCreating ? undefined : onClick}
      disabled={isCreating}
      className={cn(
        "group w-full text-left",
        "bg-card border border-border rounded-lg p-4",
        "transition-all duration-200",
        "hover:border-primary/50 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "size-10 shrink-0 rounded-lg",
          "bg-primary/10",
          "flex items-center justify-center",
          "transition-colors duration-200",
          "group-hover:bg-primary/15"
        )}>
          <WorkflowIcon className="size-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-sm leading-tight mb-1.5",
            "text-foreground line-clamp-2"
          )}>
            {template.name}
          </h3>
          
          {template.category && (
            <Badge
              variant="secondary"
              className="text-xs font-normal"
            >
              {template.category.name}
            </Badge>
          )}
        </div>
      </div>
      
      {appIcons.length > 0 && (
        <div className="flex items-center gap-2 mb-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {appIcons.map(({ type, icon }) => {
              if (typeof icon === "string") {
                return (
                  <Image
                    key={type}
                    src={icon}
                    alt={type}
                    width={16}
                    height={16}
                    className="size-4 object-contain rounded-sm"
                  />
                );
              }
              const IconComponent = icon;
              return (
                <IconComponent key={type} className="size-4 text-muted-foreground" />
              );
            })}
          </div>
          {remainingCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              +{remainingCount}
            </Badge>
          )}
        </div>
      )}
      
      <div className="pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">Use template</span>
      </div>
    </button>
  );
});

TemplateCard.displayName = "TemplateCard";


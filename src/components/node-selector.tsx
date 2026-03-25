"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";
import { Bot, CodeXml, GitBranch, GlobeIcon, MousePointerIcon } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buildNodesAfterSelection } from "@/features/editor/utils/node-selector-utils";
import { NodeType } from "@/generated/prisma";
import { Separator } from "./ui/separator";

const DEFAULT_VARIABLE_NAME: Partial<Record<NodeType, string>> = {
  [NodeType.HTTP_REQUEST]: "HTTP Request",
  [NodeType.IF_ELSE]: "condition",
  [NodeType.AGENT]: "Agent",
  [NodeType.OPENAI]: "myOpenAi",
  [NodeType.ANTHROPIC]: "myAnthropic",
  [NodeType.GEMINI]: "myGemini",
  [NodeType.SLACK]: "mySlack",
  [NodeType.DISCORD]: "myDiscord",
  [NodeType.GMAIL]: "Gmail",
  [NodeType.WHATSAPP]: "WhatsApp",
  [NodeType.JAVASCRIPT]: "jsResult",
};

const DEFAULT_TRIGGER_NAME: Partial<Record<NodeType, string>> = {
  [NodeType.MANUAL_TRIGGER]: "Manual",
  [NodeType.WEBHOOK_TRIGGER]: "Webhook",
  [NodeType.BOLD_TRIGGER]: "Bold",
  [NodeType.GMAIL_TRIGGER]: "Gmail",
  [NodeType.WHATSAPP_TRIGGER]: "WhatsApp",
};

function getInitialDataForType(type: NodeType): Record<string, unknown> {
  const variableName = DEFAULT_VARIABLE_NAME[type];
  if (variableName !== undefined) {
    return { variableName };
  }
  const name = DEFAULT_TRIGGER_NAME[type];
  if (name !== undefined) {
    return { name };
  }
  return {};
}

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
};

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger manually",
    description:
      "Runs the flow on clicking a button. Good for getting started quickly",
    icon: MousePointerIcon,
  },
  {
    type: NodeType.WEBHOOK_TRIGGER,
    label: "Webhook",
    description: "Runs the flow when a webhook is called",
    icon: "/logos/webhooks.svg",
  },
  {
    type: NodeType.BOLD_TRIGGER,
    label: "Bold",
    description: "Recibe eventos de pago desde Bold",
    icon: "/logos/Bold.svg",
  },
  {
    type: NodeType.GMAIL_TRIGGER,
    label: "Gmail",
    description: "Runs when a new email arrives in a connected Gmail account",
    icon: "/logos/gmail.svg",
  },
  {
    type: NodeType.WHATSAPP_TRIGGER,
    label: "WhatsApp",
    description: "Runs when a new WhatsApp message is received",
    icon: "/logos/whatsapp.svg",
  },
];

const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes an HTTP request",
    icon: GlobeIcon,
  },
  {
    type: NodeType.IF_ELSE,
    label: "Condition",
    description: "Add simple conditions to branch your workflow",
    icon: GitBranch,
  },
  {
    type: NodeType.AGENT,
    label: "Agent",
    description: "LLM agent with MCP and native tools (AI Gateway)",
    icon: Bot,
  },
  {
    type: NodeType.GMAIL,
    label: "Gmail",
    description: "Send emails with a connected Gmail account",
    icon: "/logos/gmail.svg",
  },
  {
    type: NodeType.WHATSAPP,
    label: "WhatsApp",
    description: "Send messages via WhatsApp Business API",
    icon: "/logos/whatsapp.svg",
  },
  {
    type: NodeType.JAVASCRIPT,
    label: "JavaScript",
    description: "Run custom JavaScript code with access to previous node outputs",
    icon: CodeXml,
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function NodeSelector({
  open,
  onOpenChange,
  children,
}: NodeSelectorProps) {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption) => {
      // Check if trying to add a manual trigger when one already exists
      if (selection.type === NodeType.MANUAL_TRIGGER) {
        const nodes = getNodes();
        const hasManualTrigger = nodes.some(
          (node) => node.type === NodeType.MANUAL_TRIGGER,
        );

        if (hasManualTrigger) {
          toast.error("Only one manual trigger is allowed per workflow");
          return;
        }
      }

      setNodes((nodes) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const flowPosition = screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
        });

        const newNode = {
          id: createId(),
          data: getInitialDataForType(selection.type),
          position: flowPosition,
          type: selection.type,
        };

        return buildNodesAfterSelection(nodes, newNode);
      });

      onOpenChange(false);
    },
    [setNodes, getNodes, onOpenChange, screenToFlowPosition],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>What triggers this workflow?</SheetTitle>
          <SheetDescription>
            A trigger is a step that starts your workflow.
          </SheetDescription>
        </SheetHeader>
        <div>
          {triggerNodes.map((nodeType) => {
            const Icon = nodeType.icon;

            return (
              <button
                key={nodeType.type}
                type="button"
                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary text-left"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <Image
                      src={Icon}
                      alt={nodeType.label}
                      width={20}
                      height={20}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">
                      {nodeType.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <Separator />
        <div>
          {executionNodes.map((nodeType) => {
            const Icon = nodeType.icon;

            return (
              <button
                key={nodeType.type}
                type="button"
                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary text-left"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <Image
                      src={Icon}
                      alt={nodeType.label}
                      width={20}
                      height={20}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">
                      {nodeType.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

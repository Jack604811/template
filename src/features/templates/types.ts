import type { Workflow, TemplateCategory } from "@/generated/prisma";
import type { NodeType } from "@/generated/prisma";

export type Template = Workflow & {
  category: TemplateCategory | null;
  nodes: Array<{ type: NodeType }>;
};

export type TemplateWithMetadata = Template & {
  appNodeTypes: NodeType[];
  nodeCount: number;
};

export type TemplateFilters = {
  categoryId?: string;
  search?: string;
  isUserTemplate?: boolean;
};

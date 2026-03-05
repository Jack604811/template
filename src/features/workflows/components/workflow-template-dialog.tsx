"use client";

import { memo, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WorkflowIcon,
  FileTextIcon,
  Loader2Icon,
  StarIcon,
} from "lucide-react";
import Image from "next/image";
import { useCreateWorkflow } from "../hooks/use-workflows";
import { useTemplates, useTemplateCategories, useCreateFromTemplate } from "@/features/templates/hooks/use-templates";
import { filterTemplatesBySearch, filterSystemTemplatesByCategory } from "@/features/templates/utils/template-filters";
import { extractAppNodeTypes, getNodeTypeIcon } from "@/features/templates/utils/node-type-icons";
import { cn } from "@/lib/utils";
import { EntityHeader, EntitySearch, EntityGrid, EntityGridItem } from "@/components/entity-components";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SelectedCategory = "all" | string | "my-templates";

export const WorkflowTemplateDialog = memo(({ open, onOpenChange }: Props) => {
  const router = useRouter();
  const templates = useTemplates();
  const categories = useTemplateCategories();
  const createFromTemplate = useCreateFromTemplate();
  const createWorkflow = useCreateWorkflow();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>("all");

  const filteredSystemTemplates = useMemo(() => {
    if (!templates.data) return {};
    
    // Flatten system templates for filtering
    const allSystemTemplates = Object.values(templates.data.system).flat();
    const filtered = filterTemplatesBySearch(allSystemTemplates, searchQuery);
    
    // Re-group by category
    return filterSystemTemplatesByCategory(filtered);
  }, [templates.data, searchQuery]);

  const filteredUserTemplates = useMemo(() => {
    if (!templates.data) return [];
    return filterTemplatesBySearch(templates.data.user, searchQuery);
  }, [templates.data, searchQuery]);

  const displayedTemplates = useMemo(() => {
    if (selectedCategory === "my-templates") {
      return filteredUserTemplates;
    }
    
    if (selectedCategory === "all") {
      // Flatten all system templates and include user templates
      const allSystemTemplates = Object.values(filteredSystemTemplates).flat();
      return [...allSystemTemplates, ...filteredUserTemplates];
    }
    
    // Filter by specific category - find category name by ID
    const category = categories.data?.find((cat) => cat.id === selectedCategory);
    if (!category) {
      return [];
    }
    
    return filteredSystemTemplates[category.name] || [];
  }, [selectedCategory, filteredSystemTemplates, filteredUserTemplates, categories.data]);

  const handleCreateFromTemplate = (templateId: string) => {
    createFromTemplate.mutate(
      { templateId },
      {
        onSuccess: (data) => {
          router.push(`/workflows/${data.id}`);
          onOpenChange(false);
        },
      },
    );
  };

  const handleCreateFromScratch = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
        onOpenChange(false);
      },
    });
  };

  const hasTemplates = displayedTemplates.length > 0;

  if (templates.isLoading || categories.isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[98vw] w-[98vw] !max-h-[98vh] h-[98vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Templates</DialogTitle>
          <div className="px-8 pt-8 pb-6">
            <EntityHeader
              title="Templates"
              description="Choose a template to get started"
              onNew={handleCreateFromScratch}
              newButtonLabel="Create from Scratch"
              isCreating={createWorkflow.isPending}
            />
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2Icon className="size-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] w-[98vw] !max-h-[98vh] h-[98vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Templates</DialogTitle>
        {/* Header - Using EntityHeader */}
        <div className="px-8 pt-8 pb-6 border-b border-border/50">
          <EntityHeader
            title="Templates"
            description="Choose a template to get started"
            onNew={handleCreateFromScratch}
            newButtonLabel="Create from Scratch"
            isCreating={createWorkflow.isPending}
          />
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-border/50 bg-muted/20 flex flex-col">
            <div className="flex-1 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-muted",
                  selectedCategory === "all" && "bg-primary/10 text-primary"
                )}
              >
                All
              </button>
              
              {categories.data?.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    "hover:bg-muted",
                    selectedCategory === category.id && "bg-primary/10 text-primary"
                  )}
                >
                  {category.name}
                </button>
              ))}
              
              <div className="h-px bg-border/50 my-2" />
              
              <button
                type="button"
                onClick={() => setSelectedCategory("my-templates")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-muted",
                  selectedCategory === "my-templates" && "bg-primary/10 text-primary"
                )}
              >
                <div className="flex items-center gap-2">
                  <StarIcon className="size-4" />
                  My Templates
                </div>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-8 pt-6 pb-4 border-b border-border/50 flex justify-end">
              <EntitySearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search templates..."
              />
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              {hasTemplates ? (
                <EntityGrid
                  items={displayedTemplates}
                  getKey={(template) => template.id}
                  renderItem={(template) => {
                    const appNodeTypes = extractAppNodeTypes(template.nodes);
                    const firstAppIcon = appNodeTypes.length > 0 
                      ? getNodeTypeIcon(appNodeTypes[0])
                      : null;
                    
                    let iconElement: React.ReactNode;
                    if (firstAppIcon) {
                      if (typeof firstAppIcon === "string") {
                        iconElement = (
                          <Image
                            src={firstAppIcon}
                            alt={template.name}
                            width={24}
                            height={24}
                            className="size-6 object-contain"
                          />
                        );
                      } else {
                        const IconComponent = firstAppIcon;
                        iconElement = <IconComponent className="size-6 text-primary" />;
                      }
                    } else {
                      iconElement = <WorkflowIcon className="size-6 text-primary" />;
                    }
                    
                    return (
                      <EntityGridItem
                        title={template.name}
                        description={template.category?.name || "Template"}
                        icon={iconElement}
                        onClick={() => handleCreateFromTemplate(template.id)}
                      />
                    );
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="relative mb-6">
                    <div className="size-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 flex items-center justify-center shadow-lg">
                      {selectedCategory === "my-templates" ? (
                        <StarIcon className="size-10 text-primary/60" />
                      ) : (
                        <FileTextIcon className="size-10 text-muted-foreground/60" />
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-foreground">
                    {selectedCategory === "my-templates" 
                      ? "No templates yet"
                      : "No templates found"}
                  </h3>
                  <p className="text-sm text-muted-foreground/80 max-w-md leading-relaxed">
                    {searchQuery
                      ? "Try adjusting your search terms to find what you're looking for"
                      : selectedCategory === "my-templates"
                      ? "Save workflows as templates to access them here quickly and share with your team"
                      : "Templates will appear here once they're available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

WorkflowTemplateDialog.displayName = "WorkflowTemplateDialog";

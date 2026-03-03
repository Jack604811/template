"use client";

import { memo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useSaveTemplate, useTemplateCategories, useCreateTemplateCategory } from "@/features/templates/hooks/use-templates";
import { PlusIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const formSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().optional(),
});

export type SaveTemplateFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
}

export const SaveTemplateDialog = memo(
  ({ open, onOpenChange, workflowId, workflowName }: Props) => {
    const categories = useTemplateCategories();
    const saveAsTemplate = useSaveTemplate();
    const createCategory = useCreateTemplateCategory();
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const form = useForm<SaveTemplateFormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        categoryId: undefined,
        name: workflowName,
      },
    });

    useEffect(() => {
      if (open) {
        form.reset({
          categoryId: undefined,
          name: workflowName,
        });
        setNewCategoryName("");
        setCreateCategoryOpen(false);
      }
    }, [open, workflowName, form]);

    const handleCreateCategory = () => {
      if (!newCategoryName.trim()) return;

      createCategory.mutate(
        { name: newCategoryName.trim() },
        {
          onSuccess: (newCategory) => {
            form.setValue("categoryId", newCategory.id);
            setNewCategoryName("");
            setCreateCategoryOpen(false);
          },
        },
      );
    };

    const handleSubmit = (values: SaveTemplateFormValues) => {
      saveAsTemplate.mutate(
        {
          workflowId,
          ...(values.categoryId && { categoryId: values.categoryId }),
          ...(values.name && { name: values.name }),
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this workflow as a template for future use
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a category (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.data?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Popover open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={createCategory.isPending}
                          >
                            <PlusIcon className="size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2">Create New Category</h4>
                              <Input
                                placeholder="Category name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateCategory();
                                  }
                                }}
                                disabled={createCategory.isPending}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCreateCategoryOpen(false);
                                  setNewCategoryName("");
                                }}
                                disabled={createCategory.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateCategory}
                                disabled={!newCategoryName.trim() || createCategory.isPending}
                              >
                                Create
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormDescription>
                      Optional: Choose a category for this template or create a new one
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Template name"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional: Customize the template name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saveAsTemplate.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveAsTemplate.isPending}>
                  Save Template
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  },
);

SaveTemplateDialog.displayName = "SaveTemplateDialog";


"use client";

import { memo, useEffect } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useSaveTemplate } from "../hooks/use-templates";

const formSchema = z.object({
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
    const saveAsTemplate = useSaveTemplate();

    const form = useForm<SaveTemplateFormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        name: workflowName,
      },
    });

    useEffect(() => {
      if (open) {
        form.reset({
          name: workflowName,
        });
      }
    }, [open, workflowName, form]);

    const handleSubmit = (values: SaveTemplateFormValues) => {
      saveAsTemplate.mutate(
        {
          workflowId,
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


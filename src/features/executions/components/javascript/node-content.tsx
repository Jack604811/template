"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import type { JavascriptNodeData } from "./executor";

const formSchema = z.object({
  code: z.string(),
});

export type JavascriptFormValues = z.infer<typeof formSchema>;

interface JavascriptNodeContentProps {
  nodeId: string;
  defaultValues: Partial<JavascriptNodeData>;
  onDataChange: (values: JavascriptFormValues) => void;
}

export function JavascriptNodeContent({
  nodeId,
  defaultValues,
  onDataChange,
}: JavascriptNodeContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<JavascriptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange({ code: value.code ?? "" });
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <form className="flex flex-col space-y-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs text-muted-foreground">Code</FormLabel>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Maximize2 className="size-3.5" />
                </button>
              </div>
              <FormControl>
                <CodeEditor
                  nodeId={nodeId}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="// Write JavaScript here&#10;// Use variables from the picker&#10;// Return a value: return result;"
                />
              </FormControl>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[40vw] sm:max-w-[90vw] max-h-[90vh] flex flex-col gap-0 p-0">
                  <DialogHeader className="px-4 py-3 border-b shrink-0">
                    <DialogTitle className="text-sm font-medium">JavaScript Editor</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 p-4">
                    <CodeEditor
                      nodeId={nodeId}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="// Write JavaScript here&#10;// Use variables from the picker&#10;// Return a value: return result;"
                      maxHeight="calc(90vh - 120px)"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

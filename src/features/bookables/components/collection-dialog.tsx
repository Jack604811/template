"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  useCreateCollection,
  useUpdateCollection,
} from "../hooks/use-collections";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  icon: z.string().optional(),
});

export type CollectionFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
  defaultValues?: Partial<CollectionFormValues>;
}

export const CollectionDialog = ({
  open,
  onOpenChange,
  collectionId,
  defaultValues = {},
}: Props) => {
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const isEdit = !!collectionId;

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues.name || "",
      icon: defaultValues.icon || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues.name || "",
        icon: defaultValues.icon || "",
      });
    }
  }, [open, defaultValues.name, defaultValues.icon, form]);

  const handleSubmit = async (values: CollectionFormValues) => {
    if (isEdit && collectionId) {
      await updateCollection.mutateAsync({
        id: collectionId,
        ...values,
      });
    } else {
      await createCollection.mutateAsync(values);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Collection" : "New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the collection details."
              : "Create a new collection to organize your bookables."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Rooms, Spa Services"
                      {...field}
                      disabled={
                        createCollection.isPending || updateCollection.isPending
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Icon name or URL"
                      {...field}
                      disabled={
                        createCollection.isPending || updateCollection.isPending
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={
                  createCollection.isPending || updateCollection.isPending
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createCollection.isPending || updateCollection.isPending
                }
              >
                {isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


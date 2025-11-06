"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { CredentialType } from "@/generated/prisma";
import {
  useCreateCredential,
  useUpdateCredential,
} from "../hooks/use-credentials";
import { getCredentialOption } from "./credential";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(CredentialType),
  value: z.string().min(1, "Credential value is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialType: CredentialType;
  onCredentialCreated?: (credentialId: string) => void;
  existingCredential?: {
    id: string;
    name: string;
    value: string;
  };
}

export const CredentialConnectionDialog = ({
  open,
  onOpenChange,
  credentialType,
  onCredentialCreated,
  existingCredential,
}: Props) => {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const app = getCredentialOption(credentialType);
  const isEditMode = !!existingCredential;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingCredential?.name || "",
      type: credentialType,
      value: existingCredential?.value || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: existingCredential?.name || "",
        type: credentialType,
        value: existingCredential?.value || "",
      });
    }
  }, [open, credentialType, existingCredential, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditMode && existingCredential) {
        await updateCredential.mutateAsync({
          id: existingCredential.id,
          name: values.name,
          type: credentialType,
          value: values.value,
        });
        toast.success(`${app?.label} credential updated successfully`);
      } else {
        const newCredential = await createCredential.mutateAsync(values);
        toast.success(`${app?.label} account connected successfully`);

        if (onCredentialCreated) {
          onCredentialCreated(newCredential.id);
        }
      }

      if (!onCredentialCreated) {
        router.push("/credentials");
      }

      onOpenChange(false);
    } catch {
      // Error handled by hook
    }
  };

  if (!app) {
    return null;
  }

  // For OAuth apps (placeholder for future implementation)
  if (app.authMethod === "oauth") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Image src={app.logo} alt={app.label} width={32} height={32} />
              <div>
                <DialogTitle>Connect {app.label}</DialogTitle>
                <DialogDescription>{app.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-12 border rounded-lg">
            <Image
              src={app.logo}
              alt={app.label}
              width={64}
              height={64}
              className="mb-4"
            />
            <h3 className="font-semibold text-lg mb-2">Connect {app.label}</h3>
            <p className="text-sm text-muted-foreground text-center">
              OAuth authentication will be implemented soon
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // For API key apps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Image src={app.logo} alt={app.label} width={32} height={32} />
            <div>
              <DialogTitle>
                {isEditMode
                  ? `Edit ${app.label} Credential`
                  : `Connect ${app.label}`}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update your API key or credential details"
                  : app.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`My ${app.label} API key`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={app.placeholder || "Enter your API key"}
                      {...field}
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isEditMode
                    ? updateCredential.isPending
                    : createCredential.isPending
                }
              >
                {isEditMode
                  ? updateCredential.isPending
                    ? "Updating..."
                    : "Update"
                  : createCredential.isPending
                    ? "Connecting..."
                    : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

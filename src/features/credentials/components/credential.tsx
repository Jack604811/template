"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CredentialType } from "@/generated/prisma";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import {
  useCreateCredential,
  useSuspenseCredential,
  useUpdateCredential,
} from "../hooks/use-credentials";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(CredentialType),
  value: z.string().min(1, "API key is required"),
});

type FormValues = z.infer<typeof formSchema>;

export const credentialTypeOptions = [
  {
    value: CredentialType.OPENAI,
    label: "OpenAI",
    logo: "/logos/openai.svg",
    description: "Access GPT models for text generation, embeddings, and more",
    category: "ai" as const,
    authMethod: "api_key" as const,
    placeholder: "sk-...",
  },
  {
    value: CredentialType.ANTHROPIC,
    label: "Anthropic",
    logo: "/logos/anthropic.svg",
    description: "Claude AI for advanced reasoning and conversation",
    category: "ai" as const,
    authMethod: "api_key" as const,
    placeholder: "sk-ant-...",
  },
  {
    value: CredentialType.GEMINI,
    label: "Gemini",
    logo: "/logos/gemini.svg",
    description: "Google's AI model for multimodal understanding",
    category: "ai" as const,
    authMethod: "api_key" as const,
    placeholder: "AIza...",
  },
  {
    value: CredentialType.GMAIL,
    label: "Gmail",
    logo: "/logos/gmail.svg",
    description: "Send and receive emails, manage inbox and labels",
    category: "communication" as const,
    authMethod: "oauth" as const,
    placeholder: "",
  },
  {
    value: CredentialType.DRIVE,
    label: "Google Drive",
    logo: "/logos/drive.svg",
    description: "Store, share, and collaborate on files and folders",
    category: "productivity" as const,
    authMethod: "oauth" as const,
    placeholder: "",
  },
  {
    value: CredentialType.SHEETS,
    label: "Google Sheets",
    logo: "/logos/sheets.svg",
    description: "Create and edit spreadsheets with data automation",
    category: "productivity" as const,
    authMethod: "oauth" as const,
    placeholder: "",
  },
  {
    value: CredentialType.WHATSAPP,
    label: "WhatsApp",
    logo: "/logos/whatsapp.svg",
    description: "Send messages and notifications via WhatsApp Business API",
    category: "communication" as const,
    authMethod: "api_key" as const,
    placeholder: "Paste your Meta access token (EAA...)",
    primaryLabel: "Access Token",
    extraFields: [
      { name: "phoneNumberId", label: "Phone Number ID", placeholder: "e.g. 579009288620612" },
      { name: "wabaId", label: "WhatsApp Business Account ID", placeholder: "e.g. 550611414800536" },
    ],
  },
  {
    value: CredentialType.INSTAGRAM,
    label: "Instagram",
    logo: "/logos/instagram.svg",
    description: "Post content, manage comments, and analyze insights",
    category: "social" as const,
    authMethod: "oauth" as const,
    placeholder: "",
  },
  {
    value: CredentialType.TIKTOK,
    label: "TikTok",
    logo: "/logos/tiktok.svg",
    description: "Create videos, manage content, and track analytics",
    category: "social" as const,
    authMethod: "oauth" as const,
    placeholder: "",
  },
  {
    value: CredentialType.MESSENGER,
    label: "Messenger",
    logo: "/logos/messenger.svg",
    description: "Send messages and automate conversations on Messenger",
    category: "communication" as const,
    authMethod: "api_key" as const,
    placeholder: "Enter your Messenger API token",
  },
  {
    value: CredentialType.MYBUSINESS,
    label: "Google My Business",
    logo: "/logos/my-business.svg",
    description: "Manage your business profile, reviews, and posts",
    category: "business" as const,
    authMethod: "oauth" as const,
    placeholder: "",
  },
] as const;

export const credentialLogos: Record<CredentialType, string> =
  Object.fromEntries(
    credentialTypeOptions.map((option) => [option.value, option.logo]),
  ) as Record<CredentialType, string>;

export const getCredentialOption = (type: CredentialType) => {
  return credentialTypeOptions.find((opt) => opt.value === type);
};

export const searchCredentialOptions = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return credentialTypeOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(lowerQuery) ||
      opt.description.toLowerCase().includes(lowerQuery),
  );
};

interface CredentialFormProps {
  initialData?: {
    id?: string;
    name: string;
    type: CredentialType;
    value: string;
  };
}

export const CredentialForm = ({ initialData }: CredentialFormProps) => {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const { handleError, modal } = useUpgradeModal();

  const isEdit = !!initialData?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      type: CredentialType.OPENAI,
      value: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (isEdit && initialData?.id) {
      await updateCredential.mutateAsync({
        id: initialData.id,
        ...values,
      });
    } else {
      await createCredential.mutateAsync(values, {
        onSuccess: (data) => {
          router.push(`/credentials/${data.id}`);
        },
        onError: (error) => {
          handleError(error);
        },
      });
    }
  };

  return (
    <>
      {modal}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            {isEdit ? "Edit Credential" : "Create Credential"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Update your API key or credential details"
              : "Add a new API key or credential to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My API key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {credentialTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Image
                                src={option.logo}
                                alt={option.label}
                                width={16}
                                height={16}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input type="password" placeholder="sk-..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={
                    createCredential.isPending || updateCredential.isPending
                  }
                >
                  {isEdit ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/credentials" prefetch>
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};

export const CredentialView = ({ credentialId }: { credentialId: string }) => {
  const { data: credential } = useSuspenseCredential(credentialId);

  return <CredentialForm initialData={credential} />;
};

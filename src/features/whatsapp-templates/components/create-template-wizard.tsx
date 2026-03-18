"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontal,
  Image,
  LayoutTemplate,
  Lock,
  Megaphone,
  PhoneCall,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Video,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ElementType, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

// ── Types ────────────────────────────────────────────────────────────────────

type Category = "MARKETING" | "UTILITY" | "AUTHENTICATION";
type SubCategory = "DEFAULT" | "CAROUSEL";
type ButtonType = "QUICK_REPLY" | "PHONE_NUMBER" | "URL";

// ── Form Schema ───────────────────────────────────────────────────────────────

const buttonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "PHONE_NUMBER", "URL"]),
  text: z.string().min(1, "Button text is required").max(25, "Max 25 characters"),
  phone_number: z.string().optional(),
  url: z.string().optional(),
  url_has_variable: z.boolean().optional(),
});

const carouselButtonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "URL"]),
  text: z.string().min(1, "Button text is required"),
  url: z.string().optional(),
  url_has_variable: z.boolean().optional(),
});

const carouselCardSchema = z.object({
  headerFormat: z.enum(["IMAGE", "VIDEO"]),
  headerHandle: z.string().optional(), // media handle from Meta upload
  bodyText: z.string().optional(),
  buttons: z.array(carouselButtonSchema),
});

const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(512)
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
  language: z.string().min(1, "Language is required"),
  isCarousel: z.boolean(),
  // Standard header
  headerFormat: z.enum(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"]),
  headerText: z.string().max(60, "Header text must be ≤ 60 characters").optional(),
  headerMediaUrl: z.string().optional(),
  // Body (optional when carousel)
  bodyText: z.string().max(1024, "Body must be ≤ 1,024 characters").optional(),
  // Footer
  footerText: z.string().max(60, "Footer must be ≤ 60 characters").optional(),
  // Buttons
  buttons: z.array(buttonSchema),
  // Carousel
  outerBodyText: z.string().optional(),
  carouselCards: z.array(carouselCardSchema),
  // Auth specific
  authButtonText: z.string().optional(),
  addSecurityRecommendation: z.boolean().optional(),
  codeExpiryEnabled: z.boolean().optional(),
  codeExpiryMinutes: z.number().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "en_US", name: "English (US)" },
  { code: "es", name: "Spanish" },
  { code: "es_ES", name: "Spanish (Spain)" },
  { code: "es_MX", name: "Spanish (Mexico)" },
  { code: "pt_BR", name: "Portuguese (Brazil)" },
  { code: "pt_PT", name: "Portuguese (Portugal)" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "zh_CN", name: "Chinese (Simplified)" },
  { code: "zh_TW", name: "Chinese (Traditional)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "id", name: "Indonesian" },
];

const CATEGORIES = [
  {
    value: "MARKETING" as Category,
    label: "Marketing",
    description: "Promotions, offers, announcements",
    detail: "Send promotional messages, product updates, event announcements, and re-engagement campaigns.",
    icon: Megaphone,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    selectedBorder: "border-orange-500",
  },
  {
    value: "UTILITY" as Category,
    label: "Utility",
    description: "Order updates, alerts, reminders",
    detail: "Send transactional messages like order confirmations, shipping updates, appointment reminders, and account alerts.",
    icon: Settings2,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    selectedBorder: "border-blue-500",
  },
  {
    value: "AUTHENTICATION" as Category,
    label: "Authentication",
    description: "OTP and verification codes",
    detail: "Send one-time passwords and verification codes to authenticate users securely.",
    icon: ShieldCheck,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    selectedBorder: "border-green-500",
  },
];

const SUBCATEGORIES: Record<
  "MARKETING" | "UTILITY",
  Array<{
    value: SubCategory;
    label: string;
    description: string;
    icon: ElementType;
    available: boolean;
  }>
> = {
  MARKETING: [
    { value: "DEFAULT", label: "Default", description: "Send messages with media and customized buttons to engage your customers.", icon: LayoutTemplate, available: true },
    { value: "CAROUSEL", label: "Carousel", description: "Send up to 10 swipeable cards, each with image/video, body, and buttons.", icon: GalleryHorizontal, available: true },
    { value: "DEFAULT", label: "Catalog", description: "Send messages that drive sales by connecting your product catalog.", icon: ShoppingBag, available: false },
    { value: "DEFAULT", label: "Flows", description: "Send a form to capture customer interests, appointment requests or run surveys.", icon: Workflow, available: false },
    { value: "DEFAULT", label: "Calling permissions", description: "Ask customers if you can call them on WhatsApp.", icon: PhoneCall, available: false },
  ],
  UTILITY: [
    { value: "DEFAULT", label: "Default", description: "Send messages about an existing order or account.", icon: LayoutTemplate, available: true },
    { value: "CAROUSEL", label: "Carousel", description: "Send up to 10 swipeable cards for order items or delivery updates.", icon: GalleryHorizontal, available: true },
    { value: "DEFAULT", label: "Flows", description: "Send a form to collect feedback, send reminders or manage orders.", icon: Workflow, available: false },
    { value: "DEFAULT", label: "Calling permissions", description: "Ask customers if you can call them on WhatsApp.", icon: PhoneCall, available: false },
  ],
};

// ── Variable helpers ──────────────────────────────────────────────────────────

function countVariables(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? [];
  const indices = matches.map((m) => parseInt(m.replace(/\D/g, ""), 10));
  return indices.length > 0 ? Math.max(...indices) : 0;
}

function buildExamples(text: string): string[] {
  const count = countVariables(text);
  return Array.from({ length: count }, (_, i) => `Example ${i + 1}`);
}

// ── Step 1: Category Picker ───────────────────────────────────────────────────

function CategoryStep({
  onSelect,
}: {
  onSelect: (category: Category) => void;
}) {
  const [hovered, setHovered] = useState<Category | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create WhatsApp Template</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose a category for your template. This determines how Meta classifies your message.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isHovered = hovered === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              className={cn(
                "group flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-150 hover:shadow-md",
                cat.bg,
                isHovered ? cat.selectedBorder : cat.border,
              )}
              onMouseEnter={() => setHovered(cat.value)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(cat.value)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Icon className={cn("h-5 w-5", cat.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cat.label}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {cat.value}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{cat.detail}</p>
              </div>
              <ArrowRight className={cn("h-4 w-4 shrink-0 transition-colors", cat.color)} />
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Tip:</span> Templates must be approved by Meta before use. Marketing templates usually take a few minutes; Utility templates are faster. Authentication templates are pre-approved.
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Sub-category Picker ───────────────────────────────────────────────

function SubCategoryStep({
  category,
  onSelect,
  onBack,
}: {
  category: "MARKETING" | "UTILITY";
  onSelect: (sub: SubCategory) => void;
  onBack: () => void;
}) {
  const catMeta = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const CatIcon = catMeta.icon;
  const options = SUBCATEGORIES[category];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-md border hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <CatIcon className={cn("h-3.5 w-3.5", catMeta.color)} />
            <span className="text-xs text-muted-foreground">{catMeta.label}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Choose a template type</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={!opt.available}
              onClick={() => opt.available && onSelect(opt.value)}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-150",
                opt.available
                  ? "hover:shadow-md hover:border-foreground/20 cursor-pointer"
                  : "opacity-50 cursor-not-allowed",
                !opt.available && "bg-muted/30",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Icon className={cn("h-5 w-5", opt.available ? catMeta.color : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{opt.label}</span>
                  {!opt.available && (
                    <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" /> Coming soon
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
              </div>
              {opt.available && <ArrowRight className={cn("h-4 w-4 shrink-0", catMeta.color)} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/// ── Step 3: Template Form ─────────────────────────────────────────────────────

function TemplateForm({
  category,
  isCarousel,
  credentialId,
  onBack,
}: {
  category: Category;
  isCarousel: boolean;
  credentialId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const catMeta = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      language: "en",
      isCarousel,
      headerFormat: "NONE",
      headerText: "",
      headerMediaUrl: "",
      bodyText: "",
      footerText: "",
      buttons: [],
      outerBodyText: "",
      carouselCards: [
        { headerFormat: "IMAGE", headerHandle: "", bodyText: "", buttons: [] },
        { headerFormat: "IMAGE", headerHandle: "", bodyText: "", buttons: [] },
      ],
      authButtonText: "Copy code",
      addSecurityRecommendation: true,
      codeExpiryEnabled: false,
      codeExpiryMinutes: 10,
    },
  });

  const { fields: buttonFields, append: appendButton, remove: removeButton } = useFieldArray({
    control: form.control,
    name: "buttons",
  });

  const {
    fields: cardFields,
    append: appendCard,
    remove: removeCard,
  } = useFieldArray({
    control: form.control,
    name: "carouselCards",
  });

  const carouselScrollRef = useRef<HTMLDivElement>(null);
  const [activeCardIdx, setActiveCardIdx] = useState(0);

  const scrollToCard = (idx: number) => {
    const container = carouselScrollRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(idx, cardFields.length - 1));
    setActiveCardIdx(clamped);
    const cardWidth = 260 + 16; // card width + gap
    container.scrollTo({ left: clamped * cardWidth, behavior: "smooth" });
  };

  const createMutation = useMutation(
    trpc.credentials.createWhatsAppTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Template submitted for review");
        router.back();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const headerFormat = form.watch("headerFormat");
  const bodyText = form.watch("bodyText") ?? "";
  const varCount = countVariables(bodyText);

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return `https://${url}`;
    return url;
  };

  const buildUrlButton = (btn: { text: string; url?: string; url_has_variable?: boolean }) => {
    const hasVar = btn.url_has_variable;
    const baseUrl = normalizeUrl(btn.url ?? "");
    return {
      type: "URL" as const,
      text: btn.text,
      url: hasVar ? `${baseUrl}{{1}}` : baseUrl,
      ...(hasVar ? { example: [`${baseUrl}example`] } : {}),
    };
  };

  const onSubmit = (values: TemplateFormValues) => {
    const components: Record<string, unknown>[] = [];

    if (category === "AUTHENTICATION") {
      // ── Auth ──────────────────────────────────────────────────────────────
      components.push({
        type: "BODY",
        add_security_recommendation: values.addSecurityRecommendation ?? false,
      });
      const btns = [
        { type: "OTP", otp_type: "COPY_CODE", text: values.authButtonText ?? "Copy code" },
      ];
      if (values.codeExpiryEnabled && values.codeExpiryMinutes) {
        components.push({ type: "BUTTONS", code_expiration_minutes: values.codeExpiryMinutes, buttons: btns });
      } else {
        components.push({ type: "BUTTONS", buttons: btns });
      }
    } else if (values.isCarousel) {
      // ── Carousel ──────────────────────────────────────────────────────────
      // Validate: each card needs an uploaded media handle, body text, and at least one button
      const invalidCards = (values.carouselCards ?? []).reduce<number[]>((acc, card, i) => {
        if (!card.headerHandle?.trim() || !card.bodyText?.trim() || card.buttons.length === 0) acc.push(i + 1);
        return acc;
      }, []);
      if (invalidCards.length > 0) {
        toast.error(`Card${invalidCards.length > 1 ? "s" : ""} ${invalidCards.join(", ")}: each card needs an uploaded image/video, body text, and at least one button.`);
        return;
      }
      // Validate: all buttons within each card must be the same type (no mixing Quick Reply + URL)
      const mixedCards = (values.carouselCards ?? []).reduce<number[]>((acc, card, i) => {
        const types = new Set(card.buttons.map((b) => b.type));
        if (types.size > 1) acc.push(i + 1);
        return acc;
      }, []);
      if (mixedCards.length > 0) {
        toast.error(`Card${mixedCards.length > 1 ? "s" : ""} ${mixedCards.join(", ")}: buttons in a card must all be the same type — remove the mixed button.`);
        return;
      }
      // Validate: all cards must have the same number of buttons and same types at each position
      const cards0 = values.carouselCards?.[0];
      if (cards0) {
        const refTypes = cards0.buttons.map((b) => b.type);
        const inconsistentCards = (values.carouselCards ?? []).slice(1).reduce<number[]>((acc, card, i) => {
          const cardTypes = card.buttons.map((b) => b.type);
          const mismatch = cardTypes.length !== refTypes.length || cardTypes.some((t, idx) => t !== refTypes[idx]);
          if (mismatch) acc.push(i + 2);
          return acc;
        }, []);
        if (inconsistentCards.length > 0) {
          toast.error(`All cards must have the same button structure. Card${inconsistentCards.length > 1 ? "s" : ""} ${inconsistentCards.join(", ")} differ${inconsistentCards.length === 1 ? "s" : ""} from Card 1.`);
          return;
        }
      }

      if (values.outerBodyText?.trim()) {
        const ex = buildExamples(values.outerBodyText);
        components.push({
          type: "BODY",
          text: values.outerBodyText.trim(),
          ...(ex.length > 0 ? { example: { body_text: [ex] } } : {}),
        });
      }
      const cards = (values.carouselCards ?? []).map((card) => {
        const cardComponents: Record<string, unknown>[] = [];
        cardComponents.push({
          type: "HEADER",
          format: card.headerFormat,
          example: { header_handle: [card.headerHandle ?? ""] },
        });
        const ex = buildExamples(card.bodyText ?? "");
        cardComponents.push({
          type: "BODY",
          text: (card.bodyText ?? "").trim(),
          ...(ex.length > 0 ? { example: { body_text: [ex] } } : {}),
        });
        const btns = card.buttons.map((btn) =>
          btn.type === "QUICK_REPLY"
            ? { type: "QUICK_REPLY", text: btn.text }
            : buildUrlButton(btn),
        );
        cardComponents.push({ type: "BUTTONS", buttons: btns });
        return { components: cardComponents };
      });
      components.push({ type: "CAROUSEL", cards });
    } else {
      // ── Standard ──────────────────────────────────────────────────────────
      if (values.headerFormat !== "NONE") {
        if (values.headerFormat === "TEXT" && values.headerText) {
          const ex = buildExamples(values.headerText);
          components.push({
            type: "HEADER",
            format: "TEXT",
            text: values.headerText,
            ...(ex.length > 0 ? { example: { header_text: ex } } : {}),
          });
        } else if (values.headerFormat === "LOCATION") {
          components.push({ type: "HEADER", format: "LOCATION" });
        } else if (
          (values.headerFormat === "IMAGE" || values.headerFormat === "VIDEO" || values.headerFormat === "DOCUMENT") &&
          values.headerMediaUrl
        ) {
          components.push({ type: "HEADER", format: values.headerFormat, example: { header_url: [values.headerMediaUrl] } });
        }
      }
      const bodyEx = buildExamples(values.bodyText ?? "");
      components.push({
        type: "BODY",
        text: values.bodyText ?? "",
        ...(bodyEx.length > 0 ? { example: { body_text: [bodyEx] } } : {}),
      });
      if (values.footerText?.trim()) components.push({ type: "FOOTER", text: values.footerText.trim() });
      if (values.buttons.length > 0) {
        const btns = values.buttons.map((btn) => {
          if (btn.type === "QUICK_REPLY") return { type: "QUICK_REPLY" as const, text: btn.text };
          if (btn.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER" as const, text: btn.text, phone_number: btn.phone_number ?? "" };
          return buildUrlButton(btn);
        });
        components.push({ type: "BUTTONS", buttons: btns });
      }
    }

    createMutation.mutate({ credentialId, name: values.name, language: values.language, category, components });
  };

  const CatIcon = catMeta.icon;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-md border hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <CatIcon className={cn("h-3.5 w-3.5", catMeta.color)} />
            <span className="text-xs text-muted-foreground">{catMeta.label}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">New Template</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Basic Info */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Basic Info
            </h2>
            <div className="grid grid-cols-2 items-start gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. order_confirmation"
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Lowercase letters, numbers, underscores only
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Authentication-specific */}
          {category === "AUTHENTICATION" ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Authentication
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Meta auto-generates the OTP body. Configure the button and optional security settings.
              </p>
              <div className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="authButtonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Copy code button text</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Copy code" maxLength={25} />
                      </FormControl>
                      <FormDescription className="text-xs">Max 25 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="font-medium">Security recommendation</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Adds "For your security, do not share this code."
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="addSecurityRecommendation"
                    render={({ field }) => (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          field.value ? "bg-primary" : "bg-muted",
                        )}
                        onClick={() => field.onChange(!field.value)}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                            field.value ? "translate-x-6" : "translate-x-1",
                          )}
                        />
                      </button>
                    )}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="font-medium">Code expiry</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show expiry time in the message
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="codeExpiryEnabled"
                    render={({ field }) => (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          field.value ? "bg-primary" : "bg-muted",
                        )}
                        onClick={() => field.onChange(!field.value)}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                            field.value ? "translate-x-6" : "translate-x-1",
                          )}
                        />
                      </button>
                    )}
                  />
                </div>
                {form.watch("codeExpiryEnabled") && (
                  <FormField
                    control={form.control}
                    name="codeExpiryMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={90}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 10)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          ) : isCarousel ? (
            <>
              {/* Carousel — outer body */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Outer Body{" "}
                  <span className="ml-1 text-xs font-normal normal-case text-muted-foreground/60">optional</span>
                </h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  Shown above the carousel cards. Use <code className="rounded bg-muted px-1">{"{{1}}"}</code> for variables.
                </p>
                <FormField
                  control={form.control}
                  name="outerBodyText"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="e.g. Check out our latest offers 👇"
                          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Carousel cards — horizontal scrollable inline editors */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Cards
                    <span className="ml-2 text-xs font-normal normal-case text-muted-foreground/60">min 2 · max 10</span>
                  </h2>
                </div>
                <div className="relative">
                  {/* Left arrow */}
                  {activeCardIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => scrollToCard(activeCardIdx - 1)}
                      className="absolute -left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  {/* Scrollable cards row */}
                  <div
                    ref={carouselScrollRef}
                    className="flex gap-4 overflow-x-auto pb-3 scrollbar-none"
                    onScroll={(e) => {
                      const cardWidth = 260 + 16;
                      const idx = Math.round((e.currentTarget.scrollLeft) / cardWidth);
                      setActiveCardIdx(Math.max(0, Math.min(idx, cardFields.length - 1)));
                    }}
                  >
                    {cardFields.map((card, idx) => (
                      <CarouselCardSection
                        key={card.id}
                        index={idx}
                        credentialId={credentialId}
                        form={form}
                        canRemove={cardFields.length > 2}
                        onRemove={() => removeCard(idx)}
                      />
                    ))}
                    {/* Add card tile */}
                    {cardFields.length < 10 && (
                      <button
                        type="button"
                        onClick={() => appendCard({ headerFormat: "IMAGE", headerHandle: "", bodyText: "", buttons: [] })}
                        className="flex w-[240px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 py-16 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <Plus className="h-6 w-6" />
                        <span className="text-sm">Add card</span>
                      </button>
                    )}
                  </div>

                  {/* Right arrow */}
                  {activeCardIdx < cardFields.length - 1 && (
                    <button
                      type="button"
                      onClick={() => scrollToCard(activeCardIdx + 1)}
                      className="absolute -right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-colors hover:bg-accent"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dots */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {cardFields.map((card, idx) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => scrollToCard(idx)}
                      className={cn(
                        "rounded-full transition-all",
                        activeCardIdx === idx
                          ? "h-2 w-4 bg-primary"
                          : "h-2 w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                      )}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Header + Body + Footer */}
              <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-6">
                {/* Header */}
                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Header{" "}
                    <span className="ml-1 text-xs font-normal normal-case text-muted-foreground/60">
                      optional
                    </span>
                  </h2>
                  <FormField
                    control={form.control}
                    name="headerFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"] as const).map((fmt) => (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() => field.onChange(fmt)}
                                className={cn(
                                  "rounded-full border px-3 py-1 text-sm transition-colors",
                                  field.value === fmt
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted",
                                )}
                              >
                                {fmt.charAt(0) + fmt.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {headerFormat === "TEXT" && (
                    <FormField
                      control={form.control}
                      name="headerText"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Header text</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Your order is ready! Use {{1}} for variables." />
                          </FormControl>
                          <div className="flex justify-end">
                            <span className={cn("text-[11px] tabular-nums", (field.value?.length ?? 0) > 55 ? "text-destructive" : "text-muted-foreground/60")}>
                              {field.value?.length ?? 0}/60
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {(headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT") && (
                    <FormField
                      control={form.control}
                      name="headerMediaUrl"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Example media URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={
                                headerFormat === "IMAGE"
                                  ? "https://example.com/image.jpg"
                                  : headerFormat === "VIDEO"
                                    ? "https://example.com/video.mp4"
                                    : "https://example.com/document.pdf"
                              }
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Provide a sample URL for Meta review. The actual URL is set dynamically in your workflow.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {headerFormat === "LOCATION" && (
                    <p className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                      Displays a generic map pin. The actual location coordinates are set dynamically in your workflow — no example needed here.
                    </p>
                  )}
                </div>

                <div className="border-t" />

                {/* Body */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Body
                    </h2>
                    {varCount > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        {varCount} variable{varCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="bodyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <textarea
                            {...field}
                            rows={5}
                            placeholder={"Hello {{1}}, your order {{2}} has been confirmed.\n\nUse {{1}}, {{2}}, etc. for dynamic variables."}
                            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Use <code className="rounded bg-muted px-1">{"{{1}}"}</code>,{" "}
                          <code className="rounded bg-muted px-1">{"{{2}}"}</code>… for dynamic values.
                          Examples are auto-generated for Meta review.
                        </FormDescription>
                        <div className="flex justify-end">
                          <span className={cn("text-[11px] tabular-nums", (field.value?.length ?? 0) > 950 ? "text-destructive" : "text-muted-foreground/60")}>
                            {field.value?.length ?? 0}/1,024
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t" />

                {/* Footer */}
                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Footer{" "}
                    <span className="ml-1 text-xs font-normal normal-case text-muted-foreground/60">
                      optional
                    </span>
                  </h2>
                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Reply STOP to unsubscribe" maxLength={60} />
                        </FormControl>
                        <FormDescription className="text-xs">Max 60 characters. Static text only.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Buttons{" "}
                    <span className="ml-1 text-xs font-normal normal-case text-muted-foreground/60">
                      optional
                    </span>
                  </h2>
                </div>
                {buttonFields.length === 0 && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Add up to 10 quick replies <em>or</em> up to 2 URL + 1 phone button. Quick replies and call-to-action buttons cannot be mixed.
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {buttonFields.map((btn, idx) => (
                    <ButtonRow
                      key={btn.id}
                      index={idx}
                      form={form}
                      onRemove={() => removeButton(idx)}
                    />
                  ))}
                  {(() => {
                    const btns = form.watch("buttons");
                    const qrCount = btns.filter((b) => b.type === "QUICK_REPLY").length;
                    const urlCount = btns.filter((b) => b.type === "URL").length;
                    const phoneCount = btns.filter((b) => b.type === "PHONE_NUMBER").length;
                    const hasCTA = urlCount > 0 || phoneCount > 0;
                    const hasQR = qrCount > 0;
                    // WhatsApp: can't mix Quick Reply with CTA buttons
                    const canAddQR = !hasCTA && qrCount < 10;
                    const canAddPhone = !hasQR && phoneCount < 1;
                    const canAddURL = !hasQR && urlCount < 2;
                    if (!canAddQR && !canAddPhone && !canAddURL) return null;
                    return (
                      <div className="flex flex-wrap gap-2">
                        {canAddQR && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => appendButton({ type: "QUICK_REPLY", text: "" })}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Quick reply
                          </Button>
                        )}
                        {canAddPhone && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => appendButton({ type: "PHONE_NUMBER", text: "", phone_number: "" })}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Phone number
                          </Button>
                        )}
                        {canAddURL && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => appendButton({ type: "URL", text: "", url: "", url_has_variable: false })}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            URL
                          </Button>
                        )}
                        {hasQR && qrCount < 10 && (
                          <span className="self-center text-xs text-muted-foreground">{qrCount}/10 quick replies</span>
                        )}
                        {hasCTA && (
                          <span className="self-center text-xs text-muted-foreground">{urlCount}/2 URLs · {phoneCount}/1 phone</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="submit" className="gap-2 px-6">
              Submit for review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ── Carousel Card Section ─────────────────────────────────────────────────────

function CarouselCardSection({
  index,
  credentialId,
  form,
  canRemove,
  onRemove,
}: {
  index: number;
  credentialId: string;
  form: ReturnType<typeof useForm<TemplateFormValues>>;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const headerFormat = form.watch(`carouselCards.${index}.headerFormat`);
  const headerHandle = form.watch(`carouselCards.${index}.headerHandle`);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `carouselCards.${index}.buttons`,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setFileName(file.name);
    form.setValue(`carouselCards.${index}.headerHandle`, "");
    try {
      const fd = new FormData();
      fd.append("credentialId", credentialId);
      fd.append("file", file);
      const res = await fetch("/api/whatsapp-upload", { method: "POST", body: fd });
      const json = await res.json() as { handle?: string; error?: string };
      if (!res.ok || !json.handle) {
        setUploadError(json.error ?? "Upload failed");
      } else {
        form.setValue(`carouselCards.${index}.headerHandle`, json.handle);
      }
    } catch {
      setUploadError("Upload failed — check your connection");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex w-[260px] shrink-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
      {/* Media type toggle + card header */}
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {(["IMAGE", "VIDEO"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => {
                form.setValue(`carouselCards.${index}.headerFormat`, fmt);
                form.setValue(`carouselCards.${index}.headerHandle`, "");
                setFileName(null);
                setUploadError(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                headerFormat === fmt
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {fmt === "IMAGE" ? "Image" : "Video"}
            </button>
          ))}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Media upload area */}
      <label
        className={cn(
          "mx-3 mt-2 flex h-[140px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-colors",
          uploading
            ? "cursor-not-allowed opacity-60"
            : headerHandle
              ? "border-green-400/60 bg-green-50 dark:bg-green-950/20 hover:bg-green-50/80"
              : uploadError
                ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10"
                : "border-border hover:border-primary/40 hover:bg-muted/40",
        )}
      >
        <input
          type="file"
          accept={headerFormat === "VIDEO" ? "video/mp4,video/3gpp" : "image/jpeg,image/png,image/webp"}
          className="sr-only"
          disabled={uploading}
          onChange={handleFileChange}
        />
        {uploading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
            <span className="text-xs text-muted-foreground">Uploading…</span>
          </>
        ) : headerHandle ? (
          <>
            {headerFormat === "IMAGE" ? (
              <Image className="h-7 w-7 text-green-500" />
            ) : (
              <Video className="h-7 w-7 text-green-500" />
            )}
            <span className="max-w-[200px] truncate text-xs font-medium text-green-700 dark:text-green-400">
              {fileName ?? "Uploaded"}
            </span>
            <span className="text-[11px] text-muted-foreground">Click to replace</span>
          </>
        ) : (
          <>
            {headerFormat === "IMAGE" ? (
              <Image className="h-7 w-7 text-muted-foreground/30" />
            ) : (
              <Video className="h-7 w-7 text-muted-foreground/30" />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {headerFormat === "VIDEO" ? "Add a video" : "Add an image"}
            </span>
            <span className="text-[11px] text-muted-foreground/60">
              {headerFormat === "VIDEO" ? "MP4 · 3GPP" : "JPG · PNG · WEBP"}
            </span>
          </>
        )}
      </label>
      {uploadError && (
        <p className="mt-1 px-3 text-[11px] text-destructive">{uploadError}</p>
      )}

      {/* Body */}
      <div className="px-3 pt-3">
        <FormField
          control={form.control}
          name={`carouselCards.${index}.bodyText`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <textarea
                  {...field}
                  rows={2}
                  placeholder="Add body text…"
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 border-t" />

      {/* Buttons */}
      <div className="flex flex-col px-3 pb-3 pt-2">
        {fields.map((btn, btnIdx) => (
          <CarouselButtonRow
            key={btn.id}
            cardIndex={index}
            buttonIndex={btnIdx}
            form={form}
            onRemove={() => remove(btnIdx)}
          />
        ))}
        {(() => {
          if (fields.length >= 2) return null;
          const existingType = fields.length > 0
            ? form.getValues(`carouselCards.${index}.buttons.0.type`)
            : null;
          const canAddQR = existingType === null || existingType === "QUICK_REPLY";
          const canAddURL = existingType === null || existingType === "URL";
          return (
            <div className="flex gap-2 pt-1">
              {canAddQR && (
                <button
                  type="button"
                  onClick={() => append({ type: "QUICK_REPLY", text: "" })}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Plus className="h-3 w-3" /> Reply
                </button>
              )}
              {canAddURL && (
                <button
                  type="button"
                  onClick={() => append({ type: "URL", text: "", url: "", url_has_variable: false })}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Plus className="h-3 w-3" /> URL
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function CarouselButtonRow({
  cardIndex,
  buttonIndex,
  form,
  onRemove,
}: {
  cardIndex: number;
  buttonIndex: number;
  form: ReturnType<typeof useForm<TemplateFormValues>>;
  onRemove: () => void;
}) {
  const type = form.watch(`carouselCards.${cardIndex}.buttons.${buttonIndex}.type`);

  return (
    <div className="group mb-1 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <FormField
            control={form.control}
            name={`carouselCards.${cardIndex}.buttons.${buttonIndex}.text`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <input
                    {...field}
                    placeholder={type === "QUICK_REPLY" ? "Quick reply label" : "Button label"}
                    maxLength={25}
                    className="w-full bg-transparent text-xs font-medium text-primary placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {type === "URL" && (
            <FormField
              control={form.control}
              name={`carouselCards.${cardIndex}.buttons.${buttonIndex}.url`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="https://example.com/"
                      className="w-full bg-transparent text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Button Row ────────────────────────────────────────────────────────────────

function ButtonRow({
  index,
  form,
  onRemove,
}: {
  index: number;
  form: ReturnType<typeof useForm<TemplateFormValues>>;
  onRemove: () => void;
}) {
  const type = form.watch(`buttons.${index}.type`) as ButtonType;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {type === "QUICK_REPLY" ? "Quick reply" : type === "PHONE_NUMBER" ? "Phone" : "URL"}
        </Badge>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <FormField
        control={form.control}
        name={`buttons.${index}.text`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} placeholder="Button label" className="text-sm" maxLength={25} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {type === "PHONE_NUMBER" && (
        <FormField
          control={form.control}
          name={`buttons.${index}.phone_number`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="+1 555 000 0000" className="text-sm" />
              </FormControl>
              <FormDescription className="text-xs">International format, e.g. +1 555 000 0000</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {type === "URL" && (
        <FormField
          control={form.control}
          name={`buttons.${index}.url`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="https://example.com/" className="text-sm" />
              </FormControl>
              <FormDescription className="text-xs">
                Max 2,000 characters. One dynamic variable <code>{"{{1}}"}</code> can be appended at the end.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

// ── Wizard Shell ─────────────────────────────────────────────────────────────

export function CreateWhatsAppTemplateWizard({ credentialId }: { credentialId: string }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subCategory, setSubCategory] = useState<SubCategory | null>(null);

  const handleCategorySelect = (cat: Category) => {
    setCategory(cat);
    if (cat === "AUTHENTICATION") setSubCategory("DEFAULT");
  };

  const handleBack = () => {
    if (category === "AUTHENTICATION") {
      setCategory(null);
      setSubCategory(null);
    } else {
      setSubCategory(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {!category ? (
        <CategoryStep onSelect={handleCategorySelect} />
      ) : !subCategory ? (
        <SubCategoryStep
          category={category as "MARKETING" | "UTILITY"}
          onSelect={setSubCategory}
          onBack={() => setCategory(null)}
        />
      ) : (
        <TemplateForm
          category={category}
          isCarousel={subCategory === "CAROUSEL"}
          credentialId={credentialId}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

import prisma from "@/lib/db";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import { decrypt, encrypt } from "@/lib/encryption";

export const credentialsRouter = createTRPCRouter({
  create: organizationProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required")
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, name, value, type } = input;

      return prisma.credential.create({
        data: {
          ...(id ? { id } : {}),
          name,
          organizationId: ctx.organizationId,
          type,
          value: encrypt(value),
        },
      });
  }),
  remove: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.credential.delete({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      })
    }),
  update: organizationProcedure
    .input(
      z.object({ 
        id: z.string(), 
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, name, type, value } = input;

      return prisma.credential.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          name,
          type,
          ...(value ? { value: encrypt(value) } : {}),
        }
      });
    }),
  getOne: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return prisma.credential.findUniqueOrThrow({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),
  /** Returns credential with decrypted value for use in edit form only. */
  getOneForEdit: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const credential = await prisma.credential.findUniqueOrThrow({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
      let value = "";
      try {
        value = decrypt(credential.value);
      } catch {
        // Leave empty if decryption fails (e.g. corrupted)
      }
      return { ...credential, value };
    }),
  getMany: organizationProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.credential.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { 
            organizationId: ctx.organizationId,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.credential.count({
          where: {
            organizationId: ctx.organizationId,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
  getByType: organizationProcedure
    .input(
      z.object({
        type: z.enum(CredentialType),
      })
    )
    .query(({ input, ctx }) => {
      const { type } = input;

      return prisma.credential.findMany({
        where: { type, organizationId: ctx.organizationId },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }),
  /**
   * Complete the WhatsApp Embedded Signup flow: exchange the auth code returned by
   * FB.login() for a business token, subscribe the app to webhooks on the customer's
   * WABA, and store the result as a WHATSAPP credential (same JSON shape as the manual
   * connect form: { value: accessToken, phoneNumberId, wabaId }).
   */
  completeWhatsAppEmbeddedSignup: organizationProcedure
    .input(
      z.object({
        id: z.string().optional(),
        code: z.string().min(1),
        wabaId: z.string().min(1),
        phoneNumberId: z.string().min(1).optional(),
        /** True for Coexistence (existing WhatsApp Business app account) — the number is
         * already registered for Cloud API, so the register call must be skipped. */
        skipPhoneRegistration: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET ?? process.env.WHATSAPP_APP_SECRET;
      if (!appId || !appSecret) {
        throw new Error("Facebook app is not configured (missing NEXT_PUBLIC_FACEBOOK_APP_ID or FACEBOOK_APP_SECRET)");
      }

      const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("code", input.code);
      const tokenRes = await fetch(tokenUrl.toString());
      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Meta API: failed to exchange code (${tokenRes.status}) ${err.slice(0, 200)}`);
      }
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      const accessToken = tokenJson.access_token;
      if (!accessToken) throw new Error("Meta API did not return an access token");

      // Subscribe the app to webhooks on the customer's WABA (idempotent).
      await fetch(
        `https://graph.facebook.com/v22.0/${encodeURIComponent(input.wabaId)}/subscribed_apps`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
      ).catch(() => undefined);

      // Coexistence's postMessage payload can omit phone_number_id — recover it from the WABA.
      // A WABA can have multiple numbers, so prefer whichever one isn't already tied to an
      // existing credential in this org (the "new" one just connected), instead of blindly
      // taking the first result — otherwise re-running Coexistence against a WABA that
      // already has a connected number silently overwrites the wrong one.
      let phoneNumberId = input.phoneNumberId;
      if (!phoneNumberId) {
        const phonesRes = await fetch(
          `https://graph.facebook.com/v22.0/${encodeURIComponent(input.wabaId)}/phone_numbers`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (phonesRes.ok) {
          const phonesJson = (await phonesRes.json()) as { data?: Array<{ id: string }> };
          const candidates = phonesJson.data ?? [];
          if (candidates.length > 1) {
            const existingCreds = await prisma.credential.findMany({
              where: { organizationId: ctx.organizationId, type: CredentialType.WHATSAPP },
            });
            const known = new Set<string>();
            for (const cred of existingCreds) {
              try {
                const raw = decrypt(cred.value).trim();
                if (raw.startsWith("{")) {
                  const id = (JSON.parse(raw) as { phoneNumberId?: string }).phoneNumberId?.trim();
                  if (id) known.add(id);
                }
              } catch {
                // Ignore undecryptable rows.
              }
            }
            phoneNumberId = candidates.find((c) => !known.has(c.id))?.id ?? candidates[0]?.id;
          } else {
            phoneNumberId = candidates[0]?.id;
          }
        }
      }
      if (!phoneNumberId) {
        throw new Error("No se pudo determinar el número de teléfono de WhatsApp para esta cuenta.");
      }

      // Register the phone number for Cloud API use — required before it can send/receive
      // messages. Skipped for Coexistence, where the number is already registered.
      if (!input.skipPhoneRegistration) {
        const registerPin = String(Math.floor(100000 + Math.random() * 900000));
        const registerRes = await fetch(
          `https://graph.facebook.com/v22.0/${encodeURIComponent(phoneNumberId)}/register`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", pin: registerPin }),
          },
        ).catch(() => undefined);
        if (registerRes && !registerRes.ok) {
          const err = await registerRes.text();
          console.error("[WhatsApp Embedded Signup] Phone number registration failed:", err);
        }
      } else {
        // Coexistence: kick off contacts + message history sync. Must happen within 24h
        // of onboarding or the customer has to be offboarded and redo the flow. Results
        // land asynchronously via the smb_app_state_sync/history webhooks.
        for (const syncType of ["smb_app_state_sync", "history"]) {
          await fetch(
            `https://graph.facebook.com/v22.0/${encodeURIComponent(phoneNumberId)}/smb_app_data`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
            },
          )
            .then(async (res) => {
              if (!res.ok) {
                console.error(`[WhatsApp Embedded Signup] ${syncType} sync request failed:`, await res.text());
              }
            })
            .catch((err) => {
              console.error(`[WhatsApp Embedded Signup] ${syncType} sync request errored:`, err);
            });
        }
      }

      let credentialName = "WhatsApp Business Account";
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v22.0/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (phoneRes.ok) {
          const phoneJson = (await phoneRes.json()) as {
            display_phone_number?: string;
            verified_name?: string;
          };
          credentialName =
            phoneJson.verified_name ?? phoneJson.display_phone_number ?? credentialName;
        }
      } catch {
        // Non-fatal: fall back to default name.
      }

      const value = JSON.stringify({
        value: accessToken,
        phoneNumberId,
        wabaId: input.wabaId,
      });

      if (input.id) {
        return prisma.credential.update({
          where: { id: input.id, organizationId: ctx.organizationId, type: CredentialType.WHATSAPP },
          data: { name: credentialName, value: encrypt(value) },
        });
      }

      // Avoid creating a second credential for a phone number that's already connected —
      // update the existing row instead so webhook matching never sees duplicates.
      const existingForOrg = await prisma.credential.findMany({
        where: { organizationId: ctx.organizationId, type: CredentialType.WHATSAPP },
      });
      for (const existing of existingForOrg) {
        try {
          const raw = decrypt(existing.value).trim();
          if (!raw.startsWith("{")) continue;
          const parsed = JSON.parse(raw) as { phoneNumberId?: string };
          if (parsed.phoneNumberId?.trim() === phoneNumberId.trim()) {
            return prisma.credential.update({
              where: { id: existing.id },
              data: { name: credentialName, value: encrypt(value) },
            });
          }
        } catch {
          // Ignore undecryptable rows; fall through to create.
        }
      }

      return prisma.credential.create({
        data: {
          name: credentialName,
          organizationId: ctx.organizationId,
          type: CredentialType.WHATSAPP,
          value: encrypt(value),
        },
      });
    }),
  /** Fetch approved WhatsApp message templates for a credential (requires WABA ID). */
  getWhatsAppTemplates: organizationProcedure
    .input(z.object({ credentialId: z.string() }))
    .query(async ({ ctx, input }) => {
      const credential = await prisma.credential.findUnique({
        where: {
          id: input.credentialId,
          organizationId: ctx.organizationId,
        },
      });
      if (!credential || credential.type !== CredentialType.WHATSAPP) {
        throw new Error("WhatsApp credential not found");
      }
      let accessToken: string;
      let wabaId: string;
      try {
        const raw = decrypt(credential.value).trim();
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as { value?: string; phoneNumberId?: string; wabaId?: string };
          accessToken = typeof parsed.value === "string" ? parsed.value.trim() : "";
          wabaId = typeof parsed.wabaId === "string" ? parsed.wabaId.trim() : "";
        } else {
          accessToken = raw;
          wabaId = "";
        }
      } catch {
        throw new Error("Invalid credential value");
      }
      if (!accessToken) throw new Error("Access token is missing in credential");
      if (!wabaId) {
        throw new Error(
          "WhatsApp Business Account ID is required to list templates. Add it in Credentials when editing this credential.",
        );
      }
      const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(wabaId)}/message_templates?status=APPROVED&fields=name,language,id,status,category,components{type,text,format,example,cards{components{type,text,format,example,buttons{type,text,url}}}}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Meta API: ${res.status} ${err.slice(0, 200)}`);
      }
      type ApiTemplateComponent = {
        type: string;
        text?: string;
        format?: string;
        example?: { body_text?: string[][]; header_text?: string[][]; header_handle?: string[] };
        buttons?: Array<{ type: string; text: string; url?: string }>;
        cards?: Array<{ components: ApiTemplateComponent[] }>;
      };
      type ApiTemplate = {
        name: string;
        language: string;
        id: string;
        status: string;
        category: string;
        components?: ApiTemplateComponent[];
      };
      const json = (await res.json()) as { data?: ApiTemplate[] };
      const raw = json.data ?? [];
      const templates = raw.map((t) => {
        let headerParameterCount = 0;
        let headerFormat: "TEXT" | "DOCUMENT" | "IMAGE" | "VIDEO" | "NONE" = "NONE";
        let bodyParameterCount = 0;
        let bodyParameterExamples: string[] = [];
        let bodyParameterNames: string[] = [];
        const headerComp = t.components?.find(
          (c) => String(c.type).toUpperCase() === "HEADER",
        );
        if (headerComp) {
          const fmt = String(headerComp.format ?? "").toUpperCase();
          if (fmt === "DOCUMENT" || fmt === "IMAGE" || fmt === "VIDEO") {
            headerFormat = fmt as "DOCUMENT" | "IMAGE" | "VIDEO";
            headerParameterCount = 1;
          } else {
            const hasHeaderVar =
              (headerComp.text && /\{\{[^}]+\}\}/.test(headerComp.text)) ||
              (fmt === "TEXT" && headerComp.example?.header_text);
            if (hasHeaderVar) {
              headerFormat = "TEXT";
              headerParameterCount = 1;
            }
          }
        }
        const bodyComp = t.components?.find(
          (c) => String(c.type).toUpperCase() === "BODY",
        );
        if (bodyComp?.text) {
          const anyPlaceholders = [...bodyComp.text.matchAll(/\{\{([^}]+)\}\}/g)];
          const namesInOrder = anyPlaceholders.map((m) => m[1]);
          const numericIndices = anyPlaceholders
            .map((m) => Number.parseInt(m[1], 10))
            .filter((n) => !Number.isNaN(n));
          if (numericIndices.length > 0) {
            bodyParameterCount = Math.max(...numericIndices);
            bodyParameterNames = Array.from(
              { length: bodyParameterCount },
              (_, i) => namesInOrder[i] ?? String(i + 1),
            );
          } else {
            bodyParameterCount = namesInOrder.length;
            bodyParameterNames = namesInOrder;
          }
          const ex = bodyComp.example?.body_text?.[0];
          if (Array.isArray(ex)) {
            bodyParameterExamples = ex.slice(0, bodyParameterCount).map(String);
          }
        }

        // Carousel detection
        type CardMeta = {
          headerFormat: "IMAGE" | "VIDEO";
          bodyParamCount: number;
          bodyParamNames: string[];
          bodyParamExamples: string[];
          buttons: Array<{ type: string; text: string; index: number; hasDynamicUrl: boolean }>;
        };
        let isCarousel = false;
        let carouselCards: CardMeta[] = [];
        const carouselComp = t.components?.find(
          (c) => String(c.type).toUpperCase() === "CAROUSEL",
        );
        if (carouselComp?.cards) {
          isCarousel = true;
          const parseBodyParams = (text: string) => {
            const placeholders = [...text.matchAll(/\{\{([^}]+)\}\}/g)];
            const names = placeholders.map((m) => m[1]);
            const numericIdx = placeholders.map((m) => Number.parseInt(m[1], 10)).filter((n) => !Number.isNaN(n));
            if (numericIdx.length > 0) {
              const count = Math.max(...numericIdx);
              return { count, names: Array.from({ length: count }, (_, i) => names[i] ?? String(i + 1)) };
            }
            return { count: names.length, names };
          };
          carouselCards = carouselComp.cards.map((card) => {
            const cardHeader = card.components.find((c) => String(c.type).toUpperCase() === "HEADER");
            const cardBody = card.components.find((c) => String(c.type).toUpperCase() === "BODY");
            const cardButtonsComp = card.components.find((c) => String(c.type).toUpperCase() === "BUTTONS");
            const cardFmt = String(cardHeader?.format ?? "").toUpperCase();
            const cardHeaderFormat: "IMAGE" | "VIDEO" = cardFmt === "VIDEO" ? "VIDEO" : "IMAGE";
            let cardBodyParamCount = 0;
            let cardBodyParamNames: string[] = [];
            let cardBodyParamExamples: string[] = [];
            if (cardBody?.text) {
              const parsed = parseBodyParams(cardBody.text);
              cardBodyParamCount = parsed.count;
              cardBodyParamNames = parsed.names;
              const cardEx = cardBody.example?.body_text?.[0];
              if (Array.isArray(cardEx)) cardBodyParamExamples = cardEx.slice(0, cardBodyParamCount).map(String);
            }
            const buttons = (cardButtonsComp?.buttons ?? []).map((btn, idx) => ({
              type: String(btn.type).toUpperCase(),
              text: btn.text,
              index: idx,
              hasDynamicUrl: String(btn.type).toUpperCase() === "URL" && /\{\{1\}\}/.test(btn.url ?? ""),
            }));
            return { headerFormat: cardHeaderFormat, bodyParamCount: cardBodyParamCount, bodyParamNames: cardBodyParamNames, bodyParamExamples: cardBodyParamExamples, buttons };
          });
        }

        return {
          name: t.name,
          language: t.language,
          id: t.id,
          status: t.status,
          category: t.category,
          headerFormat,
          headerParameterCount,
          bodyParameterCount,
          bodyParameterExamples,
          bodyParameterNames,
          bodyText: bodyComp?.text ?? "",
          isCarousel,
          carouselCards,
        };
      });
      return { templates, wabaId };
    }),
  /** Fetch product catalogs and their products linked to the WhatsApp Business Account. */
  getWhatsAppCatalog: organizationProcedure
    .input(z.object({ credentialId: z.string() }))
    .query(async ({ ctx, input }) => {
      const credential = await prisma.credential.findUnique({
        where: { id: input.credentialId, organizationId: ctx.organizationId },
      });
      if (!credential || credential.type !== CredentialType.WHATSAPP) {
        throw new Error("WhatsApp credential not found");
      }
      let accessToken: string;
      let wabaId: string;
      try {
        const raw = decrypt(credential.value).trim();
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as { value?: string; phoneNumberId?: string; wabaId?: string };
          accessToken = typeof parsed.value === "string" ? parsed.value.trim() : "";
          wabaId = typeof parsed.wabaId === "string" ? parsed.wabaId.trim() : "";
        } else {
          accessToken = raw;
          wabaId = "";
        }
      } catch {
        throw new Error("Invalid credential value");
      }
      if (!accessToken) throw new Error("Access token is missing in credential");
      if (!wabaId) throw new Error("WhatsApp Business Account ID is required. Add it in Credentials.");

      const catalogsRes = await fetch(
        `https://graph.facebook.com/v22.0/${encodeURIComponent(wabaId)}/product_catalogs?fields=id,name`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!catalogsRes.ok) {
        const err = await catalogsRes.text();
        throw new Error(`Meta API: ${catalogsRes.status} ${err.slice(0, 200)}`);
      }
      type ApiCatalog = { id: string; name: string };
      const catalogsJson = (await catalogsRes.json()) as { data?: ApiCatalog[] };
      const catalogs = catalogsJson.data ?? [];

      const catalogsWithProducts = await Promise.all(
        catalogs.map(async (catalog) => {
          const productsRes = await fetch(
            `https://graph.facebook.com/v22.0/${encodeURIComponent(catalog.id)}/products?fields=id,name,retailer_id,price,currency,description,image_url,availability&limit=50`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          type ApiProduct = {
            id: string;
            name: string;
            retailer_id: string;
            price?: string;
            currency?: string;
            description?: string;
            image_url?: string;
            availability?: string;
          };
          if (!productsRes.ok) return { ...catalog, products: [] as ApiProduct[] };
          const productsJson = (await productsRes.json()) as { data?: ApiProduct[] };
          return { ...catalog, products: productsJson.data ?? [] };
        }),
      );

      return { catalogs: catalogsWithProducts };
    }),

  /** Create a WhatsApp message template via the Business Management API. */
  createWhatsAppTemplate: organizationProcedure
    .input(
      z.object({
        credentialId: z.string(),
        name: z.string().min(1),
        language: z.string().min(1),
        category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
        components: z.array(z.unknown()),
        allow_category_change: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const credential = await prisma.credential.findUnique({
        where: { id: input.credentialId, organizationId: ctx.organizationId },
      });
      if (!credential || credential.type !== CredentialType.WHATSAPP) {
        throw new Error("WhatsApp credential not found");
      }
      let accessToken: string;
      let wabaId: string;
      try {
        const raw = decrypt(credential.value).trim();
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw) as { value?: string; wabaId?: string };
          accessToken = typeof parsed.value === "string" ? parsed.value.trim() : "";
          wabaId = typeof parsed.wabaId === "string" ? parsed.wabaId.trim() : "";
        } else {
          accessToken = raw;
          wabaId = "";
        }
      } catch {
        throw new Error("Invalid credential value");
      }
      if (!accessToken) throw new Error("Access token is missing in credential");
      if (!wabaId) throw new Error("WhatsApp Business Account ID is required. Add it to the credential.");

      const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(wabaId)}/message_templates`;
      const body = {
        name: input.name,
        language: input.language,
        category: input.category,
        components: input.components,
      };
      console.log("[WhatsApp Template] Sending payload:", JSON.stringify(body, null, 2));
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("[WhatsApp Template] Meta API error:", err);
        let msg = err;
        try {
          const j = JSON.parse(err) as {
            error?: {
              message?: string;
              error_data?: { details?: string };
              code?: number;
              error_subcode?: number;
              type?: string;
              fbtrace_id?: string;
            };
          };
          const detail = j?.error?.error_data?.details ?? "";
          const code = j?.error?.code ? ` [code ${j.error.code}]` : "";
          const sub = j?.error?.error_subcode ? `/${j.error.error_subcode}` : "";
          msg = detail
            ? `${j?.error?.message}${code}${sub} — ${detail}`
            : `${j?.error?.message ?? err}${code}${sub}`;
        } catch { /* ignore */ }
        throw new Error(`Meta API error: ${msg.slice(0, 500)}`);
      }
      return (await res.json()) as { id: string; status: string };
    }),
});

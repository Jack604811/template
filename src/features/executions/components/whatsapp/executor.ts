import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context: unknown) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type WhatsAppCredentialValue = {
  value: string;
  phoneNumberId: string;
  wabaId?: string;
};

type CarouselCardData = {
  headerUrl: string;
  headerFormat: "IMAGE" | "VIDEO";
  bodyParams: string[];
  buttonParams: string[]; // indexed by button position; non-empty = dynamic URL suffix
};

type MessageBlock = {
  type: "text" | "image" | "audio" | "document" | "video";
  text?: string;
  url?: string;
  mediaId?: string;
  mediaFilename?: string;
  caption?: string;
  filename?: string;
};

type WhatsAppData = {
  variableName?: string;
  credentialId?: string;
  to?: string;
  body?: string;
  messages?: MessageBlock[];
  action?: "send_text" | "send_template" | "send_messages";
  templateName?: string;
  templateLanguage?: string;
  templateHeaderCount?: number;
  templateHeaderFormat?: "TEXT" | "DOCUMENT" | "IMAGE" | "VIDEO" | "NONE";
  templateParams?: string[];
  templateParamNames?: string[];
  isCarousel?: boolean;
  outerBodyParams?: string[];
  carouselCards?: CarouselCardData[];
};

export const whatsappExecutor: NodeExecutor<WhatsAppData> = async ({
  data,
  nodeId,
  organizationId,
  context,
  step,
  publish,
}) => {
  await publish(
    whatsappChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Variable name is missing");
  }

  if (!data.credentialId) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Credential is required");
  }

  if (!data.to) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Recipient phone number is required");
  }

  const isTemplate = data.action === "send_template";
  const isMultiMessage = data.action === "send_messages";
  const isLegacyText = data.action === "send_text" || (!data.action);

  if (isTemplate) {
    if (!data.templateName || !data.templateLanguage) {
      await publish(whatsappChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "WhatsApp node: Template name and language are required for Send template.",
      );
    }
  } else if (isMultiMessage) {
    if (!data.messages || data.messages.length === 0) {
      await publish(whatsappChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("WhatsApp node: Add at least one content block.");
    }
  } else if (isLegacyText) {
    if (!data.body) {
      await publish(whatsappChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("WhatsApp node: Message body is required");
    }
  }

  const credential = await step.run("get-credential", () =>
    prisma.credential.findUnique({
      where: { id: data.credentialId, organizationId },
    }),
  );

  if (!credential) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("WhatsApp node: Credential not found");
  }

  const rawDecrypted = decrypt(credential.value);
  let accessToken: string;
  let phoneNumberId: string;

  try {
    const trimmed = rawDecrypted.trim();
    // Support both formats: JSON { value, phoneNumberId } or legacy plain token
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as WhatsAppCredentialValue;
      accessToken = typeof parsed.value === "string" ? parsed.value.trim() : "";
      phoneNumberId = typeof parsed.phoneNumberId === "string" ? parsed.phoneNumberId.trim() : "";
    } else {
      // Legacy: stored as plain token (no Phone Number ID in credential)
      accessToken = trimmed;
      phoneNumberId = "";
    }
  } catch {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "WhatsApp node: Invalid credential value. Re-save the credential in Credentials with Access Token and Phone Number ID.",
    );
  }

  if (!accessToken) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "WhatsApp node: Access token is missing. Edit the WhatsApp credential in Credentials, paste your Meta access token (from Developer Console → Your App → WhatsApp → API Setup, or create a System User token). See: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started",
    );
  }

  if (!phoneNumberId) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "WhatsApp node: Phone Number ID is missing. Edit the WhatsApp credential and add the Phone Number ID from Meta Business Suite.",
    );
  }

  // Guard: token must not include the word "Bearer" (common copy-paste mistake)
  if (accessToken.toLowerCase().startsWith("bearer ")) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      'WhatsApp node: Access token must NOT include the word "Bearer". Paste only the token value (e.g. EAA...).',
    );
  }

  const resolvedPhoneNumberId = Handlebars.compile(phoneNumberId)(context);
  const to = Handlebars.compile(data.to)(context);
  const sanitizedTo = String(to).replace(/\D/g, "");
  if (!sanitizedTo) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "WhatsApp node: Recipient phone number is empty or invalid after resolving variables",
    );
  }

  const stepName = isTemplate ? "whatsapp-send-template" : isMultiMessage ? "whatsapp-send-messages" : "whatsapp-send-text";
  const templateNameStr = String(data.templateName ?? "").trim();
  const templateLanguageStr = String(data.templateLanguage ?? "").trim();
  if (isTemplate && (!templateNameStr || !templateLanguageStr)) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "WhatsApp node: Template name and language are required. Re-select the template in the node.",
    );
  }
  const safe = (s: string) => { const t = String(s ?? "").trim(); return t === "" ? " " : t; };
  const resolve = (v: string) => safe(String(Handlebars.compile(String(v ?? ""))(context)).replace(/\s+/g, " ").trim());
  const isNamed = (name: string | undefined) => !!name && !/^\d+$/.test(name);
  const isCarousel = Boolean(data.isCarousel && Array.isArray(data.carouselCards) && data.carouselCards.length > 0);

  let payload: object | undefined;

  if (isTemplate && isCarousel) {
    // ── Carousel template ──────────────────────────────────────────────────
    const outerBodyParams = Array.isArray(data.outerBodyParams) ? data.outerBodyParams : [];
    const carouselCardData = data.carouselCards ?? [];

    const outerComponents: unknown[] = [];
    const resolvedOuter = outerBodyParams.map(resolve);
    if (resolvedOuter.length > 0) {
      outerComponents.push({ type: "body", parameters: resolvedOuter.map((text) => ({ type: "text", text })) });
    }

    const cards = carouselCardData.map((card, cardIdx) => {
      const headerUrl = resolve(card.headerUrl ?? "");
      const cardComponents: unknown[] = [];

      cardComponents.push({
        type: "header",
        parameters: [
          card.headerFormat === "VIDEO"
            ? { type: "video", video: { link: headerUrl } }
            : { type: "image", image: { link: headerUrl } },
        ],
      });

      const resolvedBody = (card.bodyParams ?? []).map(resolve);
      if (resolvedBody.length > 0) {
        cardComponents.push({ type: "body", parameters: resolvedBody.map((text) => ({ type: "text", text })) });
      }

      (card.buttonParams ?? []).forEach((param, btnIdx) => {
        if (param) {
          const v = resolve(param);
          if (v.trim()) {
            cardComponents.push({ type: "button", sub_type: "url", index: btnIdx, parameters: [{ type: "text", text: v }] });
          }
        }
      });

      return { card_index: cardIdx, components: cardComponents };
    });

    outerComponents.push({ type: "carousel", cards });

    payload = {
      messaging_product: "whatsapp",
      to: sanitizedTo,
      type: "template" as const,
      template: { name: templateNameStr, language: { code: templateLanguageStr }, components: outerComponents },
    };
  } else if (isTemplate) {
    // ── Regular template ───────────────────────────────────────────────────
    const templateParams = Array.isArray(data.templateParams) ? data.templateParams : [];
    const templateParamNames = Array.isArray(data.templateParamNames) ? data.templateParamNames : [];
    const headerCount = Math.max(0, Number(data.templateHeaderCount) || 0);
    const headerFormat = data.templateHeaderFormat ?? "TEXT";
    const hasTemplateParams = templateParams.length > 0;

    let resolvedParams: string[] = [];
    if (hasTemplateParams) {
      const isEmpty = (v: string) => {
        const s = String(v ?? "").replace(/\s+/g, " ").trim();
        return s === "" || s.toLowerCase() === "undefined" || s.toLowerCase() === "null";
      };
      resolvedParams = templateParams.map((t) => String(Handlebars.compile(String(t ?? ""))(context)).replace(/\s+/g, " ").trim());
      const emptyIndex = resolvedParams.findIndex((v) => isEmpty(v));
      if (emptyIndex !== -1) {
        await publish(whatsappChannel().status({ nodeId, status: "error" }));
        const partName = headerCount > 0 && emptyIndex === 0 ? "Header" : `Parameter ${emptyIndex + 1}`;
        throw new NonRetriableError(
          `WhatsApp node: Template ${partName} is required but empty or unresolved. Fill it in the node with static text or a variable that exists at runtime (e.g. {{trigger.field}}).`,
        );
      }
    }

    const headerParams = resolvedParams.slice(0, headerCount);
    const bodyParams = resolvedParams.slice(headerCount);

    type HeaderParameter =
      | { type: "text"; text: string }
      | { type: "document"; document: { link: string; filename: string } }
      | { type: "image"; image: { link: string } }
      | { type: "video"; video: { link: string } };
    const components: Array<
      | { type: "header"; parameters: HeaderParameter[] }
      | { type: "body"; parameters: Array<{ type: "text"; text: string; parameter_name?: string }> }
    > = [];
    if (headerCount > 0 && headerParams.length > 0) {
      const headerUrl = safe(headerParams[0]);
      let headerParam: HeaderParameter;
      if (headerFormat === "DOCUMENT") {
        const filename = headerUrl.split("/").pop()?.split("?")[0] ?? "document";
        headerParam = { type: "document", document: { link: headerUrl, filename } };
      } else if (headerFormat === "IMAGE") {
        headerParam = { type: "image", image: { link: headerUrl } };
      } else if (headerFormat === "VIDEO") {
        headerParam = { type: "video", video: { link: headerUrl } };
      } else {
        headerParam = { type: "text", text: headerUrl };
      }
      components.push({ type: "header", parameters: [headerParam] });
    }
    if (bodyParams.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParams.map((text, i) => {
          const name = templateParamNames[i];
          return { type: "text" as const, text: safe(text), ...(isNamed(name) ? { parameter_name: name } : {}) };
        }),
      });
    }

    payload = {
      messaging_product: "whatsapp",
      to: sanitizedTo,
      type: "template" as const,
      template: { name: templateNameStr, language: { code: templateLanguageStr }, ...(components.length > 0 ? { components } : {}) },
    };
  } else if (isMultiMessage) {
    // ── Multi-message ──────────────────────────────────────────────────────
    const sendOne = async (msgPayload: object, idx: number) => {
      return step.run(`whatsapp-send-msg-${idx}`, async () => {
        // Send typing indicator right before this message (best-effort)
        if (incomingWamid && !incomingWamid.startsWith("wamid.placeholder")) {
          try {
            await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(resolvedPhoneNumberId)}/messages`, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                status: "read",
                message_id: incomingWamid,
                typing_indicator: { type: "text" },
              }),
            });
          } catch { /* ignore */ }
        }

        const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(resolvedPhoneNumberId)}/messages`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(msgPayload),
        });
        if (!res.ok) {
          const errText = await res.text();
          let apiMessage = errText;
          try {
            const errJson = JSON.parse(errText) as { error?: { code?: number; message?: string; error_data?: { details?: string } } };
            const msg = errJson?.error?.message ?? "";
            const details = errJson?.error?.error_data?.details ?? "";
            apiMessage = details ? `${msg} (${details})` : msg || errText;
            if (res.status === 400 && errJson?.error?.code === 10) throw new NonRetriableError(`WhatsApp API error: ${apiMessage}`);
            if (res.status === 401) throw new NonRetriableError(`WhatsApp API error: ${apiMessage}. Check your access token and Phone Number ID.`);
          } catch (e) { if (e instanceof NonRetriableError) throw e; }
          throw new NonRetriableError(`WhatsApp API error: ${res.status} ${apiMessage.slice(0, 500)}`);
        }
        const json = (await res.json()) as { messages?: Array<{ id: string }>; contacts?: Array<{ wa_id: string }> };
        return { messageId: json.messages?.[0]?.id, to: json.contacts?.[0]?.wa_id ?? sanitizedTo };
      });
    };

    // Find incoming WhatsApp message ID (WAMID) anywhere in context for typing indicator
    const findWamid = (obj: unknown): string | undefined => {
      if (typeof obj === "string" && obj.startsWith("wamid.")) return obj;
      if (obj && typeof obj === "object") {
        for (const v of Object.values(obj)) {
          const found = findWamid(v);
          if (found) return found;
        }
      }
      return undefined;
    };
    const incomingWamid = findWamid(context);

    try {
      // Use triple-brace replacement to prevent Handlebars HTML-escaping values
      // e.g. {{Agent.text}} → {{{Agent.text}}} so quotes/ampersands are preserved
      const noEscape = (v: string) =>
        String(Handlebars.compile(v.replace(/\{\{(?!\{)/g, "{{{").replace(/(?<!\})\}\}/g, "}}}"))(context));

      const messages = data.messages ?? [];
      const results: object[] = [];
      for (const [i, msg] of messages.entries()) {
        const r = noEscape(String(msg.url ?? "")).trim();
        const t = noEscape(String(msg.text ?? ""));
        const cap = msg.caption ? noEscape(msg.caption).trim() : undefined;
        const fname = msg.filename ? noEscape(msg.filename).trim() : undefined;

        const mediaRef = msg.mediaId
          ? { id: msg.mediaId }
          : { link: r };

        let msgPayload: object;
        if (msg.type === "text") {
          msgPayload = { messaging_product: "whatsapp", to: sanitizedTo, type: "text", text: { body: t } };
        } else if (msg.type === "image") {
          msgPayload = { messaging_product: "whatsapp", to: sanitizedTo, type: "image", image: { ...mediaRef, ...(cap ? { caption: cap } : {}) } };
        } else if (msg.type === "video") {
          msgPayload = { messaging_product: "whatsapp", to: sanitizedTo, type: "video", video: { ...mediaRef, ...(cap ? { caption: cap } : {}) } };
        } else if (msg.type === "audio") {
          msgPayload = { messaging_product: "whatsapp", to: sanitizedTo, type: "audio", audio: { ...mediaRef } };
        } else {
          // document
          const filename = fname || msg.mediaFilename || r.split("/").pop()?.split("?")[0] || "document";
          msgPayload = { messaging_product: "whatsapp", to: sanitizedTo, type: "document", document: { ...mediaRef, filename, ...(cap ? { caption: cap } : {}) } };
        }
        results.push(await sendOne(msgPayload, i));
      }

      await publish(whatsappChannel().status({ nodeId, status: "success" }));
      return { ...context, [data.variableName]: results[0] ?? {} };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await publish(whatsappChannel().status({ nodeId, status: "error", errorMessage }));
      throw error;
    }
  } else {
    // ── Plain text (legacy) ────────────────────────────────────────────────
    payload = {
      messaging_product: "whatsapp" as const,
      to: sanitizedTo,
      type: "text" as const,
      text: { body: String(Handlebars.compile((data.body ?? "").replace(/\{\{(?!\{)/g, "{{{").replace(/(?<!\})\}\}/g, "}}}"))(context)) },
    };
  }

  try {
    const result = await step.run(stepName, async () => {
      const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(resolvedPhoneNumberId)}/messages`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload!),
      });

      if (!res.ok) {
        const errText = await res.text();
        let apiMessage = errText;
        try {
          const errJson = JSON.parse(errText) as {
            error?: {
              code?: number;
              message?: string;
              error_data?: { details?: string };
            };
          };
          const msg = errJson?.error?.message ?? "";
          const details = errJson?.error?.error_data?.details ?? "";
          apiMessage = details ? `${msg} (${details})` : msg || errText;
          if (res.status === 400 && errJson?.error?.code === 10) {
            throw new NonRetriableError(
              `WhatsApp API error: ${apiMessage}. Use a System User token with whatsapp_business_management and whatsapp_business_messaging. See: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#access-tokens`,
            );
          }
          if (res.status === 401) {
            throw new NonRetriableError(
              `WhatsApp API error: ${apiMessage}. Check that the credential has a valid Meta access token and Phone Number ID.`,
            );
          }
        } catch (e) {
          if (e instanceof NonRetriableError) throw e;
        }
        throw new NonRetriableError(
          `WhatsApp API error: ${res.status} ${apiMessage.slice(0, 500)}`,
        );
      }

      const json = (await res.json()) as {
        messages?: Array<{ id: string }>;
        contacts?: Array<{ wa_id: string; input: string }>;
      };

      return {
        messageId: json.messages?.[0]?.id,
        to: json.contacts?.[0]?.wa_id ?? sanitizedTo,
      };
    });

    await publish(whatsappChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

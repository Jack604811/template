# WhatsApp Node Implementation Plan

> **For Claude:** Use this plan to implement the WhatsApp execution node task-by-task.

**Goal:** Add a `WHATSAPP` execution node that sends messages via the Meta WhatsApp Cloud API, using the existing `CredentialType.WHATSAPP` (api_key) credential.

**Architecture:** Same 4-file structure as Gmail: `node.tsx`, `node-content.tsx`, `actions.ts`, `executor.ts` plus one Inngest channel. Credential stores the encrypted access token; no OAuth refresh (api_key auth). Optional node field: Phone Number ID (required by API; user can store token+phoneNumberId in credential as JSON or enter phone number ID in node).

**Tech Stack:** Meta WhatsApp Cloud API (`https://graph.facebook.com/v21.0/{phone_number_id}/messages`), Inngest Realtime, React Hook Form + Zod, Handlebars for variable resolution. Credential: decrypt once to get token (or JSON with token + phoneNumberId).

---

## Actions (scope)

1. **Send text message** — Required. Body: `to` (recipient phone with country code, no +), `body` (text). Handlebars on `body`.
2. **Send template message** — Optional. For post-24h messaging. Body: `to`, `template_name`, `template_language_code`, optional `components` (buttons, etc.). Keeps node simple; can add later.

Recommendation: implement **Send text message** first; add **Send template** in a follow-up if needed.

---

## Credential shape

- Existing UI: "Enter your WhatsApp Business API token" → credential.value is encrypted string.
- Meta API needs: `Authorization: Bearer {access_token}` and URL `/{phone_number_id}/messages`. So we need both.
- Option A: Credential value = encrypted JSON `{ "accessToken": "...", "phoneNumberId": "..." }`. One credential = one number.
- Option B: Credential value = encrypted access token only; node form has "Phone Number ID" (VariableInput). More flexible.
- **Choice:** Option B — credential = token only; add required field **Phone Number ID** in node (so one token can be used with multiple number IDs if they have several).

---

## Task 1: Add `WHATSAPP` to Prisma schema and migrate

**Files:** [`prisma/schema.prisma`](prisma/schema.prisma)

Add to `NodeType` enum (e.g. after `GMAIL_TRIGGER`):

```prisma
WHATSAPP
```

Then:

```bash
npx prisma migrate dev --name add-whatsapp-node
npx prisma generate
```

---

## Task 2: Create Inngest channel

**Files:** Create `src/inngest/channels/whatsapp.ts`

```typescript
import { channel, topic } from "@inngest/realtime";

export const WHATSAPP_CHANNEL_NAME = "whatsapp-execution";

export const whatsappChannel = channel(WHATSAPP_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
```

---

## Task 3: Create `actions.ts`

**Files:** Create `src/features/executions/components/whatsapp/actions.ts`

- `"use server";`
- Import `getSubscriptionToken`, `Realtime`, `whatsappChannel`, `inngest`.
- Export type `WhatsAppToken = Realtime.Token<typeof whatsappChannel, ["status"]>`.
- Export async function `fetchWhatsAppRealtimeToken(): Promise<WhatsAppToken>` that calls `getSubscriptionToken(inngest, { channel: whatsappChannel(), topics: ["status"] })`.

---

## Task 4: Create `node-content.tsx`

**Files:** Create `src/features/executions/components/whatsapp/node-content.tsx`

- **Actions:** One action for now: `send_text` ("Send text message").
- **Form fields:** `credentialId` (CredentialSelector, `CredentialType.WHATSAPP`, logo `/logos/whatsapp.svg`, label "WhatsApp"), `phoneNumberId` (VariableInput, placeholder "Phone Number ID from Meta"), `to` (VariableInput, placeholder "Recipient phone e.g. 573001234567"), `body` (VariableTextarea).
- Use Popover action selector (same pattern as Gmail). Zod schema + useForm + form.watch subscription calling `onDataChange` with `{ credentialId, phoneNumberId, to, body, action: "send_text" }`.
- Export `WhatsAppFormValues` and form schema type.

---

## Task 5: Create `node.tsx`

**Files:** Create `src/features/executions/components/whatsapp/node.tsx`

- Mirror Gmail node: `useNodeStatus` with `WHATSAPP_CHANNEL_NAME`, `fetchWhatsAppRealtimeToken`; `handleDataChange` / `handleVariableNameChange` via `setNodes`; `BaseExecutionNode` with `icon="/logos/whatsapp.svg"`, default variable name `"WhatsApp"`; children `WhatsAppNodeContent` with nodeId, defaultValues, onDataChange.
- Node data type: `variableName?, credentialId?, phoneNumberId?, to?, body?, action?`.

---

## Task 6: Create `executor.ts`

**Files:** Create `src/features/executions/components/whatsapp/executor.ts`

- Validate: `variableName`, `credentialId`, `phoneNumberId`, `to`, `body` required for `send_text`.
- Fetch credential by id + organizationId; decrypt credential.value (plain token string).
- Resolve Handlebars on `phoneNumberId`, `to`, `body`.
- Meta API: `POST https://graph.facebook.com/v21.0/{{phoneNumberId}}/messages` with headers `Authorization: Bearer {{token}}`, `Content-Type: application/json`, body:
  `{ "messaging_product": "whatsapp", "to": "<to without +>", "type": "text", "text": { "body": "<body>" } }`.
- On success: publish success status; return `{ ...context, [data.variableName]: { messageId: response.messages[0].id } }`.
- On error: publish error status; throw NonRetriableError with message.
- Use `step.run("whatsapp-send-text", async () => { ... })` for the send.

---

## Task 7: Register in all 5 locations

1. **Prisma** — Task 1.
2. **Node components:** [`src/config/node-components.ts`](src/config/node-components.ts) — import `WhatsAppNode`, add `[NodeType.WHATSAPP]: WhatsAppNode`.
3. **Executor registry:** [`src/features/executions/lib/executor-registry.ts`](src/features/executions/lib/executor-registry.ts) — import `whatsappExecutor`, add `[NodeType.WHATSAPP]: whatsappExecutor`.
4. **Inngest:** [`src/inngest/functions.ts`](src/inngest/functions.ts) — import `whatsappChannel`, add `whatsappChannel()` to channels array.
5. **Node selector:** [`src/components/node-selector.tsx`](src/components/node-selector.tsx) — add `DEFAULT_VARIABLE_NAME[NodeType.WHATSAPP]: "WhatsApp"` and execution node entry: type `WHATSAPP`, label "WhatsApp", description "Send messages via WhatsApp Business API", icon `/logos/whatsapp.svg`.

---

## Optional later

- **Send template message** action (template name, language, components).
- **Send media** (image, document, etc.).
- Credential shape Option A (store phoneNumberId in credential JSON) if we want to hide it from the node form.

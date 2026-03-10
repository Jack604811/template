import { NodeType } from "@/generated/prisma";

/**
 * Static schema registry for trigger nodes.
 *
 * Each entry declares the context key the trigger injects and a representative
 * payload shape used to populate the variable picker before any execution has
 * run. The actual live values from a real execution always take precedence.
 *
 * To add a new trigger:
 *   1. Add its NodeType here with a contextKey and a samplePayload.
 *   2. Done — the variable picker will show its variables automatically.
 */
export interface TriggerSchema {
  /** The key used in the workflow context, e.g. "bold", "stripe" */
  contextKey: string;
  /** Human-readable label shown in the variable picker node column */
  label: string;
  /** Representative payload shape used before any execution has run */
  samplePayload: Record<string, unknown>;
  /**
   * Optional display labels for individual fields shown in the variable picker.
   * Keys match the samplePayload keys. Falls back to auto-formatted camelCase.
   */
  fieldLabels?: Record<string, string>;
}

export const triggerSchemaRegistry: Partial<Record<NodeType, TriggerSchema>> = {
  [NodeType.BOLD_TRIGGER]: {
    contextKey: "bold",
    label: "Bold",
    samplePayload: {
      eventType: null,
      amount: null,
      currency: null,
      paymentMethod: null,
      payerEmail: null,
      reference: null,
      paymentId: null,
      merchantId: null,
      createdAt: null,
      boldCode: null,
      integration: null,
      tip: null,
      taxes: [],
      raw: {},
    },
    fieldLabels: {
      eventType: "Tipo de evento",
      amount: "Monto total",
      currency: "Moneda",
      paymentMethod: "Método de pago",
      payerEmail: "Correo del pagador",
      reference: "Referencia de pago",
      paymentId: "ID del pago",
      merchantId: "ID del comercio",
      createdAt: "Fecha de creación",
      boldCode: "Código Bold",
      integration: "Tipo de integración",
      tip: "Propina",
      taxes: "Impuestos",
      raw: "Datos completos",
    },
  },

  [NodeType.GMAIL]: {
    contextKey: "gmail",
    label: "Gmail",
    samplePayload: {
      messageId: null,
      threadId: null,
      from: null,
      to: null,
      subject: null,
      snippet: null,
      body: null,
      hasAttachments: false,
      attachments: [],
      labelIds: [],
    },
  },

  [NodeType.GMAIL_TRIGGER]: {
    contextKey: "gmail",
    label: "Gmail",
    samplePayload: {
      messageId: null,
      threadId: null,
      from: null,
      to: null,
      subject: null,
      snippet: null,
      body: null,
      hasAttachments: false,
      attachments: [],
      labelIds: [],
    },
  },

  [NodeType.STRIPE_TRIGGER]: {
    contextKey: "stripe",
    label: "Stripe",
    samplePayload: {
      eventId: "",
      eventType: "payment_intent.succeeded",
      timestamp: 0,
      livemode: false,
      raw: {},
    },
  },
};

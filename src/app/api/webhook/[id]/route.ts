import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { storeWebhookEvent } from "./events/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function handleWebhook(request: NextRequest, context: RouteContext) {
  try {
    const { id: webhookId } = await context.params;

    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: "Missing webhook ID" },
        { status: 400 },
      );
    }

    // Find the node with this webhookId in its data
    const nodes = await prisma.node.findMany({
      where: {
        type: "WEBHOOK_TRIGGER",
      },
      select: {
        id: true,
        workflowId: true,
        data: true,
      },
    });

    // Find the node that matches this webhookId
    const node = nodes.find((n) => {
      const data = n.data as { webhookId?: string };
      return data.webhookId === webhookId;
    });

    if (!node) {
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404 },
      );
    }

    const url = new URL(request.url);

    // Parse request body (handle both JSON and text)
    let body: unknown = null;
    let rawBody = "";
    
    try {
      rawBody = await request.text();
      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          // If JSON parsing fails, use raw text
          body = rawBody;
        }
      }
    } catch {
      // If body reading fails, continue with null
      body = null;
    }

    // Prepare webhook data
    const headers = Object.fromEntries(request.headers);
    const query = Object.fromEntries(url.searchParams);
    
    const webhookData = {
      body,
      headers,
      query,
      method: request.method,
      path: webhookId,
      raw: rawBody,
    };

    // Store event for testing/debugging
    storeWebhookEvent(webhookId, {
      method: request.method,
      body,
      headers,
      query,
    });

    // Trigger workflow execution
    await sendWorkflowExecution({
      workflowId: node.workflowId,
      initialData: {
        webhook: webhookData,
      },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return handleWebhook(request, context);
}


import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: boldId } = await params;

    // First try matching by the stored boldId field, then fall back to the
    // node's own id for nodes created before boldId was auto-initialized.
    const matchesByBoldId = await prisma.node.findMany({
      where: {
        type: NodeType.BOLD_TRIGGER,
        data: { path: ["boldId"], equals: boldId },
      },
      select: { workflowId: true },
    });

    if (matchesByBoldId.length > 1) {
      return NextResponse.json(
        { success: false, error: "URL de webhook ambigua: múltiples nodos comparten este ID" },
        { status: 409 },
      );
    }

    const node =
      matchesByBoldId[0] ??
      (await prisma.node.findFirst({
        where: { id: boldId, type: NodeType.BOLD_TRIGGER },
        select: { workflowId: true },
      }));

    const workflowId = node?.workflowId;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "No se encontró un flujo asociado a este ID" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const data = body.data ?? {};

    const boldData = {
      paymentId: data.payment_id ?? null,
      merchantId: data.merchant_id ?? null,
      eventType: body.type ?? null,
      amount: data.amount?.total ?? null,
      currency: data.amount?.currency ?? null,
      taxes: data.amount?.taxes ?? [],
      tip: data.amount?.tip ?? null,
      paymentMethod: data.payment_method ?? null,
      payerEmail: data.payer_email ?? null,
      reference: data.metadata?.reference ?? null,
      createdAt: data.created_at ?? null,
      boldCode: data.bold_code ?? null,
      integration: data.integration ?? null,
      raw: data,
    };

    await sendWorkflowExecution({
      workflowId,
      initialData: {
        bold: boldData,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Bold webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar el evento de Bold" },
      { status: 500 },
    );
  }
}

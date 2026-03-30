import { Receiver } from "@upstash/qstash";
import { type NextRequest, NextResponse } from "next/server";
import { sendWorkflowExecution } from "@/inngest/utils";
import { loadSession } from "@/lib/chat-session";

type ChatRunPayload = {
  workflowId: string;
  triggerNodeId: string;
  whatsapp: {
    from: string;
    [key: string]: unknown;
  };
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (currentSigningKey && nextSigningKey) {
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    const signature = request.headers.get("upstash-signature") ?? "";
    try {
      await receiver.verify({ signature, body: rawBody });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: ChatRunPayload;
  try {
    payload = JSON.parse(rawBody) as ChatRunPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workflowId, triggerNodeId, whatsapp } = payload;

  if (!workflowId || !whatsapp?.from) {
    return NextResponse.json({ error: "Missing workflowId or whatsapp.from" }, { status: 400 });
  }

  const chatHistory = await loadSession(whatsapp.from);

  await sendWorkflowExecution({
    workflowId,
    triggerNodeId,
    initialData: {
      whatsapp,
      __chatFrom: whatsapp.from,
      __chatHistory: chatHistory,
    },
  });

  return NextResponse.json({ ok: true });
}

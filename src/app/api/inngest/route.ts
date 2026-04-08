import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import { gmailProcessPush } from "@/inngest/gmail-poll";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeWorkflow, gmailProcessPush],
});

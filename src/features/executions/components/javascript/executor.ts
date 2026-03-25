import vm from "node:vm";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { javascriptChannel } from "@/inngest/channels/javascript";

export type JavascriptNodeData = {
  variableName?: string;
  code?: string;
};

export const javascriptExecutor: NodeExecutor<JavascriptNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(javascriptChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("javascript-execute", async () => {
      const variableName = data.variableName ?? "result";
      const code = data.code ?? "";

      if (!code.trim()) {
        throw new NonRetriableError("JavaScript node: No code provided");
      }

      const wrappedCode = `(async function(context) { ${code} })`;

      let output: unknown;
      try {
        const sandbox = {
          fetch,
          console,
          setTimeout,
          clearTimeout,
          JSON,
          Math,
          Date,
          URL,
          URLSearchParams,
          Buffer,
          btoa,
          atob,
        };
        const fn = vm.runInNewContext(wrappedCode, sandbox, { timeout: 5000 }) as (
          ctx: unknown,
        ) => unknown;
        const maybePromise = fn(context);
        if (
          maybePromise !== null &&
          typeof maybePromise === "object" &&
          "then" in maybePromise &&
          typeof (maybePromise as { then: unknown }).then === "function"
        ) {
          output = await (maybePromise as Promise<unknown>);
        } else {
          output = maybePromise;
        }
      } catch (err) {
        throw new NonRetriableError(
          `JavaScript node: Runtime error — ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return { ...context, [variableName]: output };
    });

    await publish(javascriptChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(javascriptChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

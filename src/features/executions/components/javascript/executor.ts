import vm from "node:vm";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { javascriptChannel } from "@/inngest/channels/javascript";

export type JavascriptNodeData = {
  variableName?: string;
  code?: string;
};

const TEMPLATE_RE = /\{\{\s*(?:(json)\s+)?(.+?)\s*\}\}/g;

function resolvePath(
  ctx: Record<string, unknown>,
  rawPath: string,
): unknown {
  const path = rawPath.replace(/\[([^\]]+)\]/g, "$1");

  if (path in ctx) return ctx[path];

  let bestKey = "";
  for (const key of Object.keys(ctx)) {
    if ((path === key || path.startsWith(`${key}.`)) && key.length > bestKey.length) {
      bestKey = key;
    }
  }

  if (bestKey) {
    let current: unknown = ctx[bestKey];
    const rest = path.slice(bestKey.length + 1);
    if (!rest) return current;
    for (const part of rest.split(".")) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  let current: unknown = ctx;
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function resolveTemplates(
  code: string,
  ctx: Record<string, unknown>,
): string {
  return code.replace(TEMPLATE_RE, (_, isJson: string | undefined, rawPath: string) => {
    const value = resolvePath(ctx, rawPath);
    if (isJson) return JSON.stringify(value, null, 2) ?? "null";
    if (value !== null && typeof value === "object") return JSON.stringify(value);
    return String(value ?? "");
  });
}

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

      const resolvedCode = resolveTemplates(code, context as Record<string, unknown>);
      const wrappedCode = `(async function(context) { ${resolvedCode} })`;

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
          Array,
          Object,
          String,
          Number,
          Boolean,
          Symbol,
          RegExp,
          Map,
          Set,
          WeakMap,
          WeakSet,
          Promise,
          Error,
          TypeError,
          RangeError,
          SyntaxError,
          ArrayBuffer,
          Uint8Array,
          Int8Array,
          Uint16Array,
          Int16Array,
          Uint32Array,
          Int32Array,
          Float32Array,
          Float64Array,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          encodeURIComponent,
          decodeURIComponent,
          encodeURI,
          decodeURI,
          TextEncoder,
          TextDecoder,
          structuredClone,
          AbortController,
          Headers,
          Request,
          Response,
          crypto: { randomUUID: () => globalThis.crypto.randomUUID() },
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
        const msg = err instanceof Error ? err.message : String(err);

        if (msg.includes("Script execution timed out")) {
          throw new NonRetriableError(
            "JavaScript node: Execution timed out after 5s. Check for infinite loops.",
          );
        }

        let detail = "";
        if (err instanceof Error && err.stack) {
          const frame = /evalmachine\.<anonymous>:(\d+):(\d+)/.exec(err.stack);
          if (frame) {
            const line = Number(frame[1]);
            const col = Number(frame[2]);
            const offending = resolvedCode.split("\n")[line - 1]?.trim();
            detail = offending
              ? ` (line ${line}, col ${col}: ${offending})`
              : ` (line ${line}, col ${col})`;
          }
        }

        let hint = "";
        const notDefined = /(\w+) is not defined/.exec(msg);
        if (notDefined) {
          hint = ` — Try context.${notDefined[1]} to access workflow variables`;
        }

        throw new NonRetriableError(
          `JavaScript node: Runtime error — ${msg}${hint}${detail}`,
        );
      }

      return { ...context, [variableName]: output };
    });

    await publish(javascriptChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await publish(javascriptChannel().status({ nodeId, status: "error", errorMessage }));
    throw error;
  }
};

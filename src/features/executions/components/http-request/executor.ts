import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { httpRequestChannel } from "@/inngest/channels/http-request";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

Handlebars.registerHelper("helperMissing", () => "");

type KvPair = { key: string; value: string };

type HttpRequestData = {
  variableName?: string;
  // General
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  // Auth
  authType?: "none" | "bearer" | "basic" | "apiKey";
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyPlacement?: "header" | "query";
  // Headers & Params
  headers?: KvPair[];
  queryParams?: KvPair[];
  // Body
  bodyType?: "json" | "form" | "raw";
  body?: string;
  // Options
  timeout?: number;
  followRedirects?: boolean;
  responseType?: "auto" | "json" | "text";
};

function resolve(template: string, context: Record<string, unknown>): string {
  return Handlebars.compile(template)(context);
}

function buildAuthHeaders(
  data: HttpRequestData,
  context: Record<string, unknown>,
): Record<string, string> {
  if (!data.authType || data.authType === "none") return {};

  if (data.authType === "bearer" && data.bearerToken) {
    const token = resolve(data.bearerToken, context);
    return { Authorization: `Bearer ${token}` };
  }

  if (data.authType === "basic" && data.basicUsername) {
    const user = resolve(data.basicUsername, context);
    const pass = data.basicPassword ? resolve(data.basicPassword, context) : "";
    const encoded = Buffer.from(`${user}:${pass}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }

  if (data.authType === "apiKey" && data.apiKeyName && data.apiKeyValue) {
    if (data.apiKeyPlacement === "header") {
      return { [data.apiKeyName]: resolve(data.apiKeyValue, context) };
    }
  }

  return {};
}

function buildQueryParams(
  data: HttpRequestData,
  context: Record<string, unknown>,
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const { key, value } of data.queryParams ?? []) {
    if (key) params[key] = resolve(value, context);
  }

  if (
    data.authType === "apiKey" &&
    data.apiKeyPlacement === "query" &&
    data.apiKeyName &&
    data.apiKeyValue
  ) {
    params[data.apiKeyName] = resolve(data.apiKeyValue, context);
  }

  return params;
}

function buildHeaders(
  data: HttpRequestData,
  context: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const { key, value } of data.headers ?? []) {
    if (key) headers[key] = resolve(value, context);
  }

  return { ...headers, ...buildAuthHeaders(data, context) };
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(httpRequestChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("http-request", async () => {
      if (!data.url) {
        throw new NonRetriableError("HTTP Request node: No URL configured");
      }
      if (!data.variableName) {
        throw new NonRetriableError(
          "HTTP Request node: Variable name not configured",
        );
      }
      if (!data.method) {
        throw new NonRetriableError("HTTP Request node: Method not configured");
      }

      const ctx = context as Record<string, unknown>;
      const url = resolve(data.url, ctx);
      const method = data.method;
      const queryParams = buildQueryParams(data, ctx);
      const headers = buildHeaders(data, ctx);

      const options: KyOptions = {
        method,
        headers,
        searchParams:
          Object.keys(queryParams).length > 0 ? queryParams : undefined,
        timeout: data.timeout ?? 10_000,
        redirect: data.followRedirects === false ? "manual" : "follow",
      };

      const hasBody = ["POST", "PUT", "PATCH"].includes(method);
      if (hasBody) {
        const rawBody = resolve(data.body ?? "", ctx);
        if (data.bodyType === "json") {
          JSON.parse(rawBody);
          options.body = rawBody;
          if (!headers["Content-Type"] && !headers["content-type"]) {
            options.headers = {
              ...headers,
              "Content-Type": "application/json",
            };
          }
        } else if (data.bodyType === "form") {
          options.body = rawBody;
          if (!headers["Content-Type"] && !headers["content-type"]) {
            options.headers = {
              ...headers,
              "Content-Type": "application/x-www-form-urlencoded",
            };
          }
        } else {
          options.body = rawBody;
        }
      }

      const response = await ky(url, options);
      const contentType = response.headers.get("content-type") ?? "";

      let responseData: unknown;
      if (data.responseType === "json") {
        responseData = await response.json();
      } else if (data.responseType === "text") {
        responseData = await response.text();
      } else {
        responseData = contentType.includes("application/json")
          ? await response.json()
          : await response.text();
      }

      return {
        ...ctx,
        [data.variableName]: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        },
      };
    });

    await publish(httpRequestChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(httpRequestChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

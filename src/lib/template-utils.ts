import { format as dateFnsFormat } from "date-fns";
import {
  de,
  enUS,
  es,
  fr,
  it,
  ja,
  ko,
  type Locale,
  pt,
  zhCN,
} from "date-fns/locale";

const DATE_LOCALES: Record<string, Locale> = {
  es,
  en: enUS,
  "en-us": enUS,
  fr,
  de,
  pt,
  it,
  ja,
  ko,
  zh: zhCN,
};

function resolvePath(path: string, ctx: Record<string, unknown>): unknown {
  const parts = path.trim().split(".");
  let value: unknown = ctx;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function parseTemplateArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (!inQuote && (ch === '"' || ch === "'")) {
      inQuote = true;
      quoteChar = ch;
    } else if (inQuote && ch === quoteChar) {
      inQuote = false;
    } else if (!inQuote && ch === ",") {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// Convert dayjs/moment format tokens to date-fns tokens
function toDfFormat(fmt: string): string {
  return fmt
    .replace(/dddd/g, "EEEE")
    .replace(/ddd/g, "EEE")
    .replace(/\bDo\b/g, "do")
    .replace(/\bDD\b/g, "dd")
    .replace(/\bD\b/g, "d")
    .replace(/\bYYYY\b/g, "yyyy")
    .replace(/\bYY\b/g, "yy");
}

function resolveExpr(expr: string, ctx: Record<string, unknown>): string {
  const trimmed = expr.trim();

  // {{json path}} — JSON serialization
  if (/^json\s+/i.test(trimmed)) {
    const path = trimmed.replace(/^json\s+/i, "").trim();
    const value = resolvePath(path, ctx);
    if (value === undefined || value === null) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }

  // {{UPPER(path)}}
  const upperMatch = /^UPPER\((.+)\)$/i.exec(trimmed);
  if (upperMatch) {
    const value = resolvePath(upperMatch[1].trim(), ctx);
    return value != null ? String(value).toUpperCase() : "";
  }

  // {{LOWER(path)}}
  const lowerMatch = /^LOWER\((.+)\)$/i.exec(trimmed);
  if (lowerMatch) {
    const value = resolvePath(lowerMatch[1].trim(), ctx);
    return value != null ? String(value).toLowerCase() : "";
  }

  // {{FORMAT_DATE(path, "format", "locale")}}
  const fmtDateMatch = /^FORMAT_DATE\((.+)\)$/i.exec(trimmed);
  if (fmtDateMatch) {
    const [pathArg, fmtArg, localeArg] = parseTemplateArgs(fmtDateMatch[1]);
    const raw = resolvePath((pathArg ?? "").trim(), ctx);
    if (raw == null) return "";
    try {
      const date = new Date(String(raw));
      const dfFmt = toDfFormat(fmtArg ?? "yyyy-MM-dd");
      const locale = localeArg
        ? DATE_LOCALES[localeArg.trim().toLowerCase()]
        : undefined;
      return dateFnsFormat(date, dfFmt, locale ? { locale } : {});
    } catch {
      return String(raw);
    }
  }

  // {{path.to.value}} — simple path (supports spaces in first segment)
  const value = resolvePath(trimmed, ctx);
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

export function compileTemplate(
  template: string | undefined,
  ctx: Record<string, unknown>,
): string {
  const value = typeof template === "string" ? template.trim() : "";
  if (!value) return "";
  return value.replace(/\{\{([^}]+)\}\}/g, (_match, expr: string) =>
    resolveExpr(expr, ctx),
  );
}

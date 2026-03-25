import { Redis } from "@upstash/redis";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_SESSION_KEY_PREFIX = "whatsapp:chat:";
/** 30 days — matches typical support-style conversation retention */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Persist WhatsApp chat history keyed by sender id (`context.__chatFrom`).
 * No-ops when Redis env vars are not configured.
 */
export async function saveSession(
  chatFrom: string,
  messages: ChatMessage[],
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`${CHAT_SESSION_KEY_PREFIX}${chatFrom}`, JSON.stringify(messages), {
    ex: SESSION_TTL_SECONDS,
  });
}

export async function loadSession(chatFrom: string): Promise<ChatMessage[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.get<string>(`${CHAT_SESSION_KEY_PREFIX}${chatFrom}`);
  if (raw == null || raw === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m != null &&
        typeof m === "object" &&
        (m as ChatMessage).role !== undefined &&
        typeof (m as ChatMessage).content === "string",
    );
  } catch {
    return [];
  }
}

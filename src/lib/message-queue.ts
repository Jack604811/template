import { Redis } from "@upstash/redis";

const QUEUE_PREFIX = "whatsapp:msgqueue:";
/** Short TTL — messages are consumed within the same workflow run */
const QUEUE_TTL_SECONDS = 300;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function enqueueMessages(from: string, messages: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`${QUEUE_PREFIX}${from}`, JSON.stringify(messages), {
    ex: QUEUE_TTL_SECONDS,
  });
}

/**
 * Atomically reads and deletes the queued messages for a sender.
 * Safe for Inngest retries — returns null on second call for the same sender.
 */
export async function dequeueMessages(from: string): Promise<string[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.getdel<string>(`${QUEUE_PREFIX}${from}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

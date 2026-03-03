const DEDUPE_MS = 2000;
let lastKey: string | null = null;
let lastTime = 0;

/**
 * Run a toast callback only if the same key wasn't shown within DEDUPE_MS.
 * Prevents duplicate toasts when a single user action triggers multiple updates (e.g. customer update publishing to multiple bookings).
 */
export function dedupeSuccessToast(key: string, show: () => void): void {
  const now = Date.now();
  if (lastKey === key && now - lastTime < DEDUPE_MS) {
    return;
  }
  lastKey = key;
  lastTime = now;
  show();
}

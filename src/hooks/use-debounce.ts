import { useCallback, useEffect, useRef } from "react";

/**
 * Hook to debounce a callback function.
 * Useful for delaying expensive operations like API calls until user stops typing.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500)
 * @returns Debounced callback function
 *
 * @example
 * const debouncedSearch = useDebounce((value: string) => {
 *   api.search(value);
 * }, 300);
 */
export function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay: number = 500,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);

  // Keep refs up to date
  useEffect(() => {
    callbackRef.current = callback;
    delayRef.current = delay;
  }, [callback, delay]);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delayRef.current);
    }) as T,
    [],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useNavigationHistory } from "./use-navigation-history";

/**
 * Reusable hook for detail pages that automatically handles navigation state reset
 * Use this hook in any detail page component to get handlers for breadcrumb and cancel buttons
 * 
 * @param baseRoute - The base route to navigate back to (e.g., "/calendar", "/catalog", "/workflows")
 * @returns Navigation handlers for breadcrumb and cancel buttons
 * 
 * @example
 * ```tsx
 * const { handleBreadcrumbClick, handleCancel } = useDetailPageNavigation("/calendar");
 * 
 * <Header
 *   onBreadcrumbClick={handleBreadcrumbClick}
 *   onCancel={handleCancel}
 * />
 * ```
 */
const returnUrlKey = (base: string) => `return-url:${base}`;

export function saveReturnUrl(baseRoute: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(returnUrlKey(baseRoute), window.location.pathname + window.location.search);
}

export function useDetailPageNavigation(baseRoute: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { resetRouteHistory } = useNavigationHistory();

  const handleBreadcrumbClick = useCallback(() => {
    resetRouteHistory(baseRoute);
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(returnUrlKey(baseRoute)) : null;
    sessionStorage.removeItem(returnUrlKey(baseRoute));
    router.push(saved ?? baseRoute);
  }, [baseRoute, resetRouteHistory, router]);

  const handleCancel = useCallback(() => {
    resetRouteHistory(baseRoute);
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(returnUrlKey(baseRoute)) : null;
    sessionStorage.removeItem(returnUrlKey(baseRoute));
    router.push(saved ?? baseRoute);
  }, [baseRoute, resetRouteHistory, router]);

  return {
    handleBreadcrumbClick,
    handleCancel,
  };
}

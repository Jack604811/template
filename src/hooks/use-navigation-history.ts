"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "nav-history";

interface NavigationHistory {
  [baseRoute: string]: string;
}

/**
 * Simple hook to manage navigation history per section
 * Stores last visited route for each base route (e.g., /workflows -> /workflows/[id])
 */
export function useNavigationHistory() {
  const pathname = usePathname();

  // Get base route from full path (e.g., /workflows/[id] -> /workflows)
  const getBaseRoute = useCallback((path: string) => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 1) {
      return `/${parts[0]}`;
    }
    return path;
  }, []);

  // Save current route as last visited for its base route.
  // Pass the serialized search string (searchParams.toString()) to capture query params.
  const saveCurrentRoute = useCallback((search?: string) => {
    if (!pathname || typeof window === "undefined") return;

    const baseRoute = getBaseRoute(pathname);
    const fullUrl = pathname + (search ? `?${search}` : "");

    // Save if it's a sub-route (path segment) OR has meaningful query params
    if (fullUrl !== baseRoute) {
      const history = getHistory();
      history[baseRoute] = fullUrl;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [pathname, getBaseRoute]);

  // Get last visited route for a base route
  const getLastVisited = useCallback((baseRoute: string): string | null => {
    if (typeof window === "undefined") return null;
    
    const history = getHistory();
    return history[baseRoute] || null;
  }, []);

  // Reset navigation state for a specific base route
  const resetRouteHistory = useCallback((baseRoute: string) => {
    if (typeof window === "undefined") return;
    
    const history = getHistory();
    delete history[baseRoute];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, []);

  // Reset all navigation history (useful when switching organizations)
  const resetAllHistory = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    saveCurrentRoute,
    getLastVisited,
    getBaseRoute,
    resetRouteHistory,
    resetAllHistory,
  };
}

function getHistory(): NavigationHistory {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

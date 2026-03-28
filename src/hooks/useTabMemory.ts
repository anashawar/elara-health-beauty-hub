import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

/**
 * Tracks the last visited route per bottom-nav tab group.
 * When switching tabs, returns the last route visited in that tab
 * instead of always going to the tab root.
 */

type TabKey = "home" | "categories" | "ai" | "cart" | "profile";

const TAB_ROOTS: Record<TabKey, string> = {
  home: "/home",
  categories: "/categories",
  ai: "/elara-ai",
  cart: "/cart",
  profile: "/profile",
};

/** Maps a pathname to its owning tab. Returns null for admin / other routes. */
function getTabForPath(pathname: string): TabKey | null {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname.startsWith("/product/")) return "home";
  if (pathname.startsWith("/brand/")) return "home";
  if (pathname.startsWith("/brands")) return "home";
  if (pathname.startsWith("/collection/")) return "home";
  if (pathname.startsWith("/shop")) return "home";
  if (pathname.startsWith("/concern/")) return "home";

  if (pathname === "/categories") return "categories";
  if (pathname.startsWith("/category/")) return "categories";

  if (pathname === "/elara-ai") return "ai";

  if (pathname === "/cart") return "cart";
  if (pathname === "/checkout") return "cart";

  if (pathname === "/profile") return "profile";
  if (pathname.startsWith("/orders")) return "profile";
  if (pathname === "/addresses") return "profile";
  if (pathname === "/settings") return "profile";
  if (pathname === "/wishlist") return "profile";
  if (pathname === "/rewards") return "profile";
  if (pathname === "/support") return "profile";
  if (pathname === "/skin-scan") return "profile";
  if (pathname.startsWith("/skin-scan/")) return "profile";

  return null;
}

// Module-level store so it persists across renders without context
const tabHistory: Record<TabKey, string> = {
  home: "/home",
  categories: "/categories",
  ai: "/elara-ai",
  cart: "/cart",
  profile: "/profile",
};

// Scroll position memory per route (path+search → scrollY)
const scrollMemory: Record<string, number> = {};

let currentTab: TabKey | null = "home";
let previousRoute: string | null = null;

/** Call this hook once in a layout component to track route changes. */
export function useTabMemoryTracker() {
  const location = useLocation();

  useEffect(() => {
    const currentRoute = location.pathname + location.search;

    // Save scroll position of the route we're leaving
    if (previousRoute && previousRoute !== currentRoute) {
      scrollMemory[previousRoute] = window.scrollY;
    }

    const tab = getTabForPath(location.pathname);
    if (tab) {
      tabHistory[tab] = currentRoute;
      currentTab = tab;
    }

    // Restore scroll position for the route we're entering
    const savedScroll = scrollMemory[currentRoute];
    if (savedScroll != null) {
      // Use rAF to let the DOM render first, then scroll
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScroll);
      });
    }

    previousRoute = currentRoute;
  }, [location.pathname, location.search]);
}

/** Returns the last route for a given tab key. */
export function getTabRoute(tab: TabKey): string {
  return tabHistory[tab] || TAB_ROOTS[tab];
}

/** Returns the root route for a tab. */
export function getTabRoot(tab: TabKey): string {
  return TAB_ROOTS[tab];
}

/** Returns which tab is currently active based on path. */
export function getActiveTab(pathname: string): TabKey | null {
  return getTabForPath(pathname);
}

export type { TabKey };

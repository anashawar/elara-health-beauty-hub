import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Returns true once the target ref enters the viewport.
 * Use to defer rendering / data-fetching for below-fold sections.
 * Once visible, stays visible (no re-hiding).
 */
export function useLazySection(rootMargin = "200px") {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return { ref, visible };
}

/**
 * Prefetch a lazy-loaded route's chunk on link hover/focus.
 * Call this from onMouseEnter/onFocus on navigation links.
 */
const prefetchCache = new Set<string>();
export function prefetchRoute(importFn: () => Promise<any>) {
  const key = importFn.toString();
  if (prefetchCache.has(key)) return;
  prefetchCache.add(key);
  importFn().catch(() => {
    prefetchCache.delete(key);
  });
}

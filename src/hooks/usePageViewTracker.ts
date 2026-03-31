import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks page views by inserting into page_views table.
 * Debounces to avoid duplicate entries on rapid navigation.
 */
export function usePageViewTracker() {
  const location = useLocation();
  const lastPath = useRef("");

  useEffect(() => {
    const path = location.pathname;
    // Skip duplicate consecutive views
    if (path === lastPath.current) return;
    lastPath.current = path;

    // Fire and forget — don't block UI
    supabase
      .from("page_views" as any)
      .insert({
        page_path: path,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      } as any)
      .then(() => {});
  }, [location.pathname]);
}

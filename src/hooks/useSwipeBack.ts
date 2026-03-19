import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger from the left edge (first 24px)
      if (touch.clientX <= 24) {
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.touches[0];
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      const dx = touch.clientX - touchStart.current.x;
      if (dy > dx * 0.6) {
        touchStart.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      touchStart.current = null;

      if (dx > 80 && dy < dx * 0.5) {
        // If on a product page that came from search, go back to search
        const state = (location.state as any);
        if (state?.fromSearch && location.pathname.startsWith("/product/")) {
          navigate("/home", { state: { openSearch: true, searchQuery: state.searchQuery } });
        } else {
          navigate(-1);
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate, location]);
}

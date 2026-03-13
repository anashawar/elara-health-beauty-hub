import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export function useSwipeBack() {
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger from the left edge (first 24px) — tighter to avoid conflicts with horizontal scrollers
      if (touch.clientX <= 24) {
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel if the gesture becomes too vertical
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

      // Swipe right at least 80px, and mostly horizontal
      if (dx > 80 && dy < dx * 0.5) {
        navigate(-1);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);
}

import { useState, useRef, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageZoomViewerProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
}

const ImageZoomViewer = ({ images, initialIndex, isOpen, onClose, productTitle }: ImageZoomViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      resetZoom();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, currentIndex]);

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    resetZoom();
  };

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  }, [scale]);

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateStart.current = { ...translate };
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDistance.current) {
        const newScale = Math.min(5, Math.max(1, scale * (dist / lastTouchDistance.current)));
        setScale(newScale);
        if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      }
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      });
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    isDragging.current = false;
    if (scale <= 1) resetZoom();
  }, [scale]);

  // Swipe to change image when not zoomed
  const swipeStart = useRef<number | null>(null);
  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    if (scale <= 1 && e.touches.length === 1) {
      swipeStart.current = e.touches[0].clientX;
    }
  }, [scale]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (scale <= 1 && swipeStart.current !== null && e.changedTouches.length === 1) {
      const diff = e.changedTouches[0].clientX - swipeStart.current;
      if (Math.abs(diff) > 60) {
        if (diff < 0 && currentIndex < images.length - 1) goTo(currentIndex + 1);
        if (diff > 0 && currentIndex > 0) goTo(currentIndex - 1);
      }
    }
    swipeStart.current = null;
  }, [scale, currentIndex, images.length]);

  // Double-tap detection
  const lastTap = useRef(0);
  const handleTap = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  }, [handleDoubleTap]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 z-10">
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 backdrop-blur-sm active:scale-90 transition-transform">
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/70 text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
          <div className="w-9" />
        </div>

        {/* Image */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden touch-none"
          onTouchStart={(e) => { handleTouchStart(e); handleSwipeStart(e); handleTap(e); }}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => { handleTouchEnd(); handleSwipeEnd(e); }}
        >
          <img
            src={images[currentIndex]}
            alt={`${productTitle} ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transition: isDragging.current ? "none" : "transform 0.2s ease-out",
            }}
            draggable={false}
          />
        </div>

        {/* Dots */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 py-4">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`rounded-full transition-all duration-300 ${idx === currentIndex ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
              />
            ))}
          </div>
        )}

        {/* Desktop arrows */}
        {images.length > 1 && currentIndex > 0 && (
          <button onClick={() => goTo(currentIndex - 1)} className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full backdrop-blur-sm hover:bg-white/20">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {images.length > 1 && currentIndex < images.length - 1 && (
          <button onClick={() => goTo(currentIndex + 1)} className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full backdrop-blur-sm hover:bg-white/20">
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageZoomViewer;

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const HeroBanner = memo(() => {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      setCurrent(idx);
    }
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      if (scrollRef.current) {
        const next = (Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth) + 1) % banners.length;
        scrollRef.current.scrollTo({ left: next * scrollRef.current.offsetWidth, behavior: "smooth" });
      }
    }, 5000);
    return () => clearInterval(autoPlayRef.current);
  }, [banners.length]);

  const handleTouchStart = () => clearInterval(autoPlayRef.current);
  const handleTouchEnd = () => {
    clearInterval(autoPlayRef.current);
    if (banners.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      if (scrollRef.current) {
        const next = (Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth) + 1) % banners.length;
        scrollRef.current.scrollTo({ left: next * scrollRef.current.offsetWidth, behavior: "smooth" });
      }
    }, 5000);
  };

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: "smooth" });
  };

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden aspect-[2/1] md:aspect-[3/1] lg:aspect-[3.5/1] rounded-2xl mx-auto max-w-[calc(100%-16px)] md:max-w-full mt-2 md:mt-0 md:rounded-none touch-auto">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden no-scrollbar h-full touch-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "auto", touchAction: "pan-y pan-x" }}
      >
        {banners.map((banner: any, idx: number) => {
          const imgSrc = (language === "ar" && banner.image_url_ar) ? banner.image_url_ar
            : (language === "ku" && banner.image_url_ku) ? banner.image_url_ku
            : banner.image_url;
          const imgProps = {
            src: imgSrc,
            alt: banner.title || "",
            className: "absolute inset-0 w-full h-full object-cover",
            draggable: false,
            loading: (idx === 0 ? "eager" : "lazy") as "eager" | "lazy",
          };

          return banner.link_url ? (
            <Link key={banner.id} to={banner.link_url} className="w-full flex-shrink-0 snap-center relative h-full block" style={{ minWidth: "100%" }}>
              <img {...imgProps} />
            </Link>
          ) : (
            <div key={banner.id} className="w-full flex-shrink-0 snap-center relative h-full" style={{ minWidth: "100%" }}>
              <img {...imgProps} />
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

HeroBanner.displayName = "HeroBanner";

export default HeroBanner;

import { useState, useEffect, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import useEmblaCarousel from "embla-carousel-react";

// Prefetch banners as early as possible
export function prefetchBanners(queryClient: any) {
  queryClient.prefetchQuery({
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
}

const HeroBanner = memo(() => {
  const { language } = useLanguage();
  const isRtl = language === "ar" || language === "ku";
  const [current, setCurrent] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    direction: isRtl ? "rtl" : "ltr",
  });

  const { data: banners = [], isLoading } = useQuery({
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

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrent(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Autoplay
  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  const goTo = useCallback((idx: number) => {
    emblaApi?.scrollTo(idx);
  }, [emblaApi]);

  // Always render the container with fixed aspect ratio to prevent CLS
  if (isLoading || banners.length === 0) {
    return (
      <div className="relative w-full overflow-hidden aspect-[2/1] md:aspect-[3/1] lg:aspect-[3.5/1] rounded-2xl mx-auto max-w-[calc(100%-16px)] md:max-w-full mt-2 md:mt-0 md:rounded-none">
        {isLoading && <div className="w-full h-full bg-secondary animate-pulse rounded-2xl md:rounded-none" />}
      </div>
    );
  }

  return (
    <div key={language} className="relative w-full overflow-hidden aspect-[2/1] md:aspect-[3/1] lg:aspect-[3.5/1] rounded-2xl mx-auto max-w-[calc(100%-16px)] md:max-w-full mt-2 md:mt-0 md:rounded-none">
      <div ref={emblaRef} className="overflow-hidden h-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex h-full">
          {banners.map((banner: any, idx: number) => {
            const imgSrc = (language === "ar" && banner.image_url_ar) ? banner.image_url_ar
              : (language === "ku" && banner.image_url_ku) ? banner.image_url_ku
              : banner.image_url;

            const slide = (
              <img
                src={imgSrc}
                alt={banner.title || "ELARA Banner"}
                className="absolute inset-0 w-full h-full object-cover md:object-contain"
                draggable={false}
                width={800}
                height={400}
                loading={idx === 0 ? "eager" : "lazy"}
                decoding={idx === 0 ? "sync" : "async"}
                {...(idx === 0 ? { fetchPriority: "high" as const } : {})}
              />
            );

            return (
              <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative h-full">
                {banner.link_url ? (
                  <Link to={banner.link_url} className="block w-full h-full">{slide}</Link>
                ) : slide}
              </div>
            );
          })}
        </div>
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

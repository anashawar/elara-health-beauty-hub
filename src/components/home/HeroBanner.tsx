import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gift, Truck, ShieldCheck, ArrowRight, Copy, Sparkles, Zap } from "lucide-react";
import bannerDiscount from "@/assets/banner-discount.jpg";
import bannerDelivery from "@/assets/banner-delivery.jpg";
import bannerOriginal from "@/assets/banner-original.jpg";
import bannerFastDelivery from "@/assets/banner-fast-delivery.jpg";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useApp } from "@/context/AppContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HeroBannerItem {
  id: string;
  tag: string;
  tagIcon?: any;
  title: string;
  subtitle: string;
  coupon?: string;
  cta: string;
  ctaLink: string;
  image: string;
  overlay: string;
  isOffer?: boolean;
  discountLabel?: string;
}

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();
  const { t } = useLanguage();
  const { setPendingCoupon } = useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: heroOffers = [] } = useQuery({
    queryKey: ["active-offers-hero"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("offers")
        .select("*") as any)
        .eq("is_active", true)
        .eq("banner_style", "hero")
        .order("sort_order");
      if (error) throw error;
      const now = new Date();
      return (data || []).filter((o: any) => {
        if (o.ends_at && new Date(o.ends_at) < now) return false;
        if (o.starts_at && new Date(o.starts_at) > now) return false;
        return true;
      });
    },
  });

  // Removed realtime subscription — offers don't change frequently enough to justify
  // a persistent WebSocket connection. The 5-min staleTime handles freshness.

  const staticBanners: HeroBannerItem[] = [
    {
      id: "1",
      tag: t("banner.newUserOffer"),
      tagIcon: Gift,
      title: t("banner.title1"),
      subtitle: t("banner.subtitle1"),
      coupon: "ELARA15",
      cta: t("banner.shopNow"),
      ctaLink: "/categories",
      image: bannerDiscount,
      overlay: "from-black/80 via-black/50 to-black/20",
    },
    {
      id: "2",
      tag: t("banner.freeDelivery"),
      tagIcon: Truck,
      title: t("banner.title2"),
      subtitle: t("banner.subtitle2"),
      cta: t("banner.startShopping"),
      ctaLink: "/categories",
      image: bannerDelivery,
      overlay: "from-black/80 via-black/50 to-black/20",
    },
    {
      id: "4",
      tag: t("banner.quickDelivery"),
      tagIcon: Zap,
      title: t("banner.title4"),
      subtitle: t("banner.subtitle4"),
      cta: t("banner.orderNow"),
      ctaLink: "/categories",
      image: bannerFastDelivery,
      overlay: "from-black/80 via-black/50 to-black/20",
    },
    {
      id: "3",
      tag: t("banner.authentic"),
      tagIcon: ShieldCheck,
      title: t("banner.title3"),
      subtitle: t("banner.subtitle3"),
      cta: t("banner.exploreBrands"),
      ctaLink: "/categories",
      image: bannerOriginal,
      overlay: "from-black/80 via-black/50 to-black/20",
    },
  ];

  const offerBanners: HeroBannerItem[] = heroOffers.map((o: any) => {
    const discountLabel = o.discount_type === "percentage"
      ? `${o.discount_value}% ${t("common.off")}`
      : o.discount_type === "fixed"
        ? `${o.discount_value.toLocaleString()} ${t("common.iqd")} ${t("common.off")}`
        : o.discount_type === "bogo" ? t("common.buyOneGetOne") : t("common.bundleDeal");
    return {
      id: `offer-${o.id}`,
      tag: discountLabel,
      title: o.title,
      subtitle: o.subtitle || "",
      cta: t("common.shopNow"),
      ctaLink: o.link_url || "/collection/offers",
      image: o.image_url || "",
      overlay: "from-black/80 via-black/50 to-black/20",
      isOffer: true,
      discountLabel,
    };
  });

  const banners = [...offerBanners, ...staticBanners];

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      setCurrent(idx);
    }
  }, []);

  useEffect(() => {
    const startAutoPlay = () => {
      autoPlayRef.current = setInterval(() => {
        if (scrollRef.current) {
          const next = (Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth) + 1) % banners.length;
          scrollRef.current.scrollTo({ left: next * scrollRef.current.offsetWidth, behavior: "smooth" });
        }
      }, 5000);
    };
    startAutoPlay();
    return () => clearInterval(autoPlayRef.current);
  }, [banners.length]);

  const handleTouchStart = () => {
    clearInterval(autoPlayRef.current);
  };
  const handleTouchEnd = () => {
    clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      if (scrollRef.current) {
        const next = (Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth) + 1) % banners.length;
        scrollRef.current.scrollTo({ left: next * scrollRef.current.offsetWidth, behavior: "smooth" });
      }
    }, 5000);
  };

  const goTo = (idx: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: "smooth" });
    }
  };

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("banner.couponCopied", { code }));
  };

  return (
    <div className="relative w-full overflow-hidden h-[220px] md:h-[320px] lg:h-[380px] rounded-2xl mx-auto max-w-[calc(100%-16px)] md:max-w-full mt-2 md:mt-0 md:rounded-none touch-pan-x">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden no-scrollbar h-full touch-pan-x"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "none" }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="w-full flex-shrink-0 snap-center relative h-full"
            style={{ minWidth: "100%" }}
          >
            {banner.image ? (
              <img
                src={banner.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
            )}
            <div className={`absolute inset-0 bg-gradient-to-t rtl:bg-gradient-to-t ${banner.overlay}`} />

            <div className="relative h-full flex flex-col justify-end px-5 pb-8 pt-16 z-10 max-w-[85%] md:max-w-[60%] md:px-10 md:pb-12">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold uppercase tracking-widest text-white w-fit mb-3 border border-white/10">
                {banner.isOffer ? <Sparkles className="w-3.5 h-3.5" /> : banner.tagIcon && <banner.tagIcon className="w-3.5 h-3.5" />}
                {banner.tag}
              </span>

              <h2 className="text-[22px] md:text-[34px] font-display font-bold text-white leading-[1.15] tracking-tight">
                {banner.title}
              </h2>
              <p className="text-[11px] md:text-[14px] text-white/75 mt-1.5 leading-relaxed max-w-[280px] md:max-w-[320px] line-clamp-2">
                {banner.subtitle}
              </p>

              {banner.coupon && (
                <button
                  onClick={() => copyCoupon(banner.coupon!)}
                  className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold w-fit hover:bg-white/20 active:scale-95 transition-all"
                >
                  <Copy className="w-3 h-3 opacity-70" />
                  {banner.coupon}
                </button>
              )}

              <div className="mt-4">
                {banner.coupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingCoupon(banner.coupon!);
                      navigate(banner.ctaLink);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-foreground text-[13px] font-semibold rounded-full w-fit hover:bg-white/90 active:scale-95 transition-all shadow-lg"
                  >
                    {banner.cta}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                ) : (
                  <Link
                    to={banner.ctaLink}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-foreground text-[13px] font-semibold rounded-full w-fit hover:bg-white/90 active:scale-95 transition-all shadow-lg"
                  >
                    {banner.cta}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`rounded-full transition-all duration-300 ${
              idx === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;

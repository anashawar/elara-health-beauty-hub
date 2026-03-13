import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gift, Truck, ShieldCheck, ArrowRight, Copy } from "lucide-react";
import bannerDiscount from "@/assets/banner-discount.jpg";
import bannerDelivery from "@/assets/banner-delivery.jpg";
import bannerOriginal from "@/assets/banner-original.jpg";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useApp } from "@/context/AppContext";

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval>>();
  const { t } = useLanguage();
  const { setPendingCoupon } = useApp();
  const navigate = useNavigate();

  const banners = [
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
      overlay: "from-violet-950/80 via-violet-900/60 to-transparent",
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
      overlay: "from-amber-950/80 via-amber-900/50 to-transparent",
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
      overlay: "from-purple-950/80 via-purple-900/50 to-transparent",
    },
  ];

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      setCurrent(idx);
    }
  }, []);

  // Auto-play
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

  // Reset auto-play on manual swipe
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
    <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden shadow-premium h-[220px] md:h-[320px] lg:h-[380px]">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar h-full"
        style={{ scrollbarWidth: "none" }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="w-full flex-shrink-0 snap-center relative h-full"
          >
            <img
              src={banner.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l ${banner.overlay}`} />

            <div className="relative h-full flex flex-col justify-center px-6 py-5 z-10 max-w-[70%]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white w-fit mb-2.5">
                <banner.tagIcon className="w-3.5 h-3.5" />
                {banner.tag}
              </span>

              <h2 className="text-[26px] font-display font-bold text-white leading-tight">
                {banner.title}
              </h2>
              <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                {banner.subtitle}
              </p>

              {banner.coupon && (
                <button
                  onClick={() => copyCoupon(banner.coupon!)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-mono font-bold w-fit hover:bg-white/30 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {banner.coupon}
                </button>
              )}

              {banner.coupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setPendingCoupon(banner.coupon!);
                    navigate(banner.ctaLink);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 bg-white text-foreground text-xs font-semibold rounded-xl w-fit hover:bg-white/90 transition-all shadow-lg"
                >
                  {banner.cta}
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              ) : (
                <Link
                  to={banner.ctaLink}
                  className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 bg-white text-foreground text-xs font-semibold rounded-xl w-fit hover:bg-white/90 transition-all shadow-lg"
                >
                  {banner.cta}
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 right-4 rtl:right-auto rtl:left-4 flex gap-1.5 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === current ? "w-6 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;

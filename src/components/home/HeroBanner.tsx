import { useState, useEffect } from "react";
import { useBanners } from "@/hooks/useProducts";

const fallbackBanners = [
  { id: "1", title: "Glow This Season", subtitle: "Up to 40% off premium skincare", gradient: "from-rose-light to-champagne", accent: "text-primary" },
  { id: "2", title: "Wellness Essentials", subtitle: "Vitamins & supplements for your best self", gradient: "from-sage-light to-champagne", accent: "text-sage" },
  { id: "3", title: "Beauty Favorites", subtitle: "Discover trending makeup & cosmetics", gradient: "from-accent to-blush", accent: "text-primary" },
];

const gradients = [
  { gradient: "from-rose-light to-champagne", accent: "text-primary" },
  { gradient: "from-sage-light to-champagne", accent: "text-sage" },
  { gradient: "from-accent to-blush", accent: "text-primary" },
];

const HeroBanner = () => {
  const { data: dbBanners = [] } = useBanners();
  const [current, setCurrent] = useState(0);

  const banners = dbBanners.length > 0
    ? dbBanners.map((b, i) => ({
        id: b.id,
        title: b.title || "Shop Now",
        subtitle: b.subtitle || "",
        ...gradients[i % gradients.length],
      }))
    : fallbackBanners;

  useEffect(() => {
    const timer = setInterval(() => setCurrent(p => (p + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden shadow-premium">
      <div className="relative">
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            className={`${idx === current ? "block" : "hidden"} bg-gradient-to-br ${banner.gradient} p-8 min-h-[180px] flex flex-col justify-center transition-all duration-500`}
          >
            <p className={`text-xs font-semibold uppercase tracking-widest ${banner.accent} mb-2`}>ELARA</p>
            <h2 className="text-2xl font-display font-bold text-foreground mb-1">{banner.title}</h2>
            <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
            <button className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl w-fit hover:opacity-90 transition-opacity">
              Shop Now
            </button>
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${idx === current ? "w-6 bg-primary" : "w-1.5 bg-foreground/20"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;

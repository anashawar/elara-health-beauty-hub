import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, Gift, Tag, Percent, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

interface Offer {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  discount_type: string;
  discount_value: number;
  link_url: string | null;
  banner_style: string;
}

const GRADIENTS = [
  "from-[hsl(268,84%,58%)] to-[hsl(300,60%,50%)]",
  "from-[hsl(340,70%,55%)] to-[hsl(38,70%,55%)]",
  "from-[hsl(200,80%,50%)] to-[hsl(268,84%,58%)]",
  "from-[hsl(150,50%,45%)] to-[hsl(200,70%,50%)]",
];

const ICONS = [Flame, Gift, Tag, Percent];

export default function TodayOffersSlider() {
  const { t } = useLanguage();
  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["today-offers-slider"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("id, title, subtitle, description, image_url, discount_type, discount_value, link_url, banner_style, starts_at, ends_at, is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      const now = new Date();
      return (data || []).filter((o: any) => {
        if (o.ends_at && new Date(o.ends_at) < now) return false;
        if (o.starts_at && new Date(o.starts_at) > now) return false;
        return true;
      }) as Offer[];
    },
  });

  // Group offers into pairs
  const pairs: Offer[][] = [];
  for (let i = 0; i < offers.length; i += 3) {
    pairs.push(offers.slice(i, i + 3));
  }

  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (pairs.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % pairs.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [pairs.length]);

  const goTo = (idx: number) => {
    setCurrent(idx);
    clearInterval(intervalRef.current);
  };

  const next = () => goTo((current + 1) % pairs.length);
  const prev = () => goTo((current - 1 + pairs.length) % pairs.length);

  if (offers.length === 0) return null;

  const currentPair = pairs[current] || [];

  return (
    <section className="px-4 mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-rose shadow-lg shadow-primary/20">
          <Gift className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-foreground tracking-tight leading-tight">
            {t("home.todayOffers")}
          </h2>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
            {t("home.curatedDeals")}
          </p>
        </div>
      </div>

      {/* Slider */}
      {/* Navigation Arrows - above slider */}
      {pairs.length > 1 && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center text-foreground hover:bg-muted transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
          <button
            onClick={next}
            className="w-7 h-7 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center text-foreground hover:bg-muted transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Slider */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-3 gap-2.5"
          >
            {currentPair.map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} index={current * 3 + i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      {pairs.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {pairs.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`rounded-full transition-all duration-500 ${
                idx === current
                  ? "w-7 h-2 bg-primary shadow-md shadow-primary/30"
                  : "w-2 h-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function OfferCard({ offer, index }: { offer: Offer; index: number }) {
  const { t } = useLanguage();
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const Icon = ICONS[index % ICONS.length];
  const linkTo = offer.link_url || "/collection/offers";

  const discountLabel =
    offer.discount_type === "percentage"
      ? `${offer.discount_value}%`
      : offer.discount_type === "fixed"
        ? `${offer.discount_value.toLocaleString()}`
        : offer.discount_type === "bogo"
          ? "B1G1"
          : "DEAL";

  return (
    <Link to={linkTo} className="block group">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} aspect-[3/4] shadow-lg`}>
        {/* Decorative circle */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/[0.08] rounded-full blur-sm" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/[0.06] rounded-full blur-sm" />

        {/* Image */}
        {offer.image_url && (
          <div className="absolute inset-0">
            <img
              src={offer.image_url}
              alt=""
              className="w-full h-full object-cover opacity-20 mix-blend-overlay"
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
          {/* Top: Discount badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/20 backdrop-blur-lg text-[10px] font-extrabold uppercase tracking-wider text-white border border-white/15">
              <Icon className="w-3 h-3" />
              {discountLabel}
            </span>
          </div>

          {/* Bottom: Title + CTA */}
          <div>
            <h3 className="text-[15px] font-display font-black text-white leading-tight tracking-tight line-clamp-2">
              {offer.title}
            </h3>
            {offer.subtitle && (
              <p className="text-[10px] text-white/65 mt-1 font-medium line-clamp-1">
                {offer.subtitle}
              </p>
            )}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-foreground text-[11px] font-bold rounded-xl group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300 shadow-md">
              Shop
              <ArrowRight className="w-3 h-3 rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, ChevronLeft, ChevronRight } from "lucide-react";
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
  const linkTo = offer.link_url || "/collection/offers";

  return (
    <Link to={linkTo} className="block group">
      <div className="relative overflow-hidden rounded-2xl aspect-[3/4] shadow-lg bg-muted">
        {offer.image_url ? (
          <img
            src={offer.image_url}
            alt={offer.title || ""}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            {offer.title}
          </div>
        )}
      </div>
    </Link>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, Gift, Tag, Percent, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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
  "from-[hsl(268,84%,58%)] via-[hsl(300,60%,50%)] to-[hsl(340,70%,55%)]",
  "from-[hsl(340,70%,55%)] via-[hsl(352,42%,55%)] to-[hsl(38,70%,55%)]",
  "from-[hsl(200,80%,50%)] via-[hsl(220,70%,55%)] to-[hsl(268,84%,58%)]",
  "from-[hsl(150,50%,45%)] via-[hsl(170,60%,40%)] to-[hsl(200,70%,50%)]",
];

const ICONS = [Flame, Gift, Tag, Percent];

export default function TodayOffersSlider() {
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

  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (offers.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % offers.length);
    }, 4500);
    return () => clearInterval(intervalRef.current);
  }, [offers.length]);

  const goTo = (idx: number) => {
    setCurrent(idx);
    clearInterval(intervalRef.current);
  };

  const next = () => goTo((current + 1) % offers.length);
  const prev = () => goTo((current - 1 + offers.length) % offers.length);

  if (offers.length === 0) return null;

  return (
    <section className="px-4 mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-rose shadow-lg shadow-primary/20">
          <Gift className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-foreground tracking-tight leading-tight">
            Today's Offers
          </h2>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
            Curated deals just for you
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="relative" ref={containerRef}>
        <AnimatePresence mode="wait">
          <motion.div
            key={offers[current].id}
            initial={{ opacity: 0, scale: 0.96, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: -30 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <OfferCard offer={offers[current]} index={current} />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {offers.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg z-20"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg z-20"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {offers.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {offers.map((_: Offer, idx: number) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`rounded-full transition-all duration-500 ${
                idx === current
                  ? "w-8 h-2 bg-primary shadow-md shadow-primary/30"
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
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const Icon = ICONS[index % ICONS.length];
  const linkTo = offer.link_url || "/collection/offers";

  const discountLabel =
    offer.discount_type === "percentage"
      ? `${offer.discount_value}% OFF`
      : offer.discount_type === "fixed"
        ? `${offer.discount_value.toLocaleString()} IQD OFF`
        : offer.discount_type === "bogo"
          ? "BUY 1 GET 1"
          : "BUNDLE DEAL";

  return (
    <Link to={linkTo} className="block group">
      <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${gradient} min-h-[180px] md:min-h-[220px] shadow-xl`}>
        {/* Abstract decorative shapes */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.07] rounded-full -translate-y-1/2 translate-x-1/4 blur-sm" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.05] rounded-full translate-y-1/2 -translate-x-1/4 blur-sm" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/[0.04] rounded-full blur-md" />
        
        {/* Diagonal stripe pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, white 20px, white 21px)"
        }} />

        {/* Image overlay if exists */}
        {offer.image_url && (
          <div className="absolute inset-0">
            <img
              src={offer.image_url}
              alt=""
              className="w-full h-full object-cover opacity-25 mix-blend-overlay"
            />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-7 min-h-[180px] md:min-h-[220px]">
          <div className="flex items-start justify-between">
            {/* Badge */}
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/20 backdrop-blur-xl text-[11px] font-extrabold uppercase tracking-widest text-white border border-white/15 shadow-lg"
            >
              <Icon className="w-3.5 h-3.5" />
              {discountLabel}
            </motion.span>

            {/* Icon circle */}
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white/80" />
            </div>
          </div>

          <div className="mt-auto">
            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="text-[22px] md:text-[28px] font-display font-black text-white leading-[1.15] tracking-tight max-w-[85%]"
            >
              {offer.title}
            </motion.h3>
            {offer.subtitle && (
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-[13px] text-white/70 mt-1.5 font-medium line-clamp-2 max-w-[75%]"
              >
                {offer.subtitle}
              </motion.p>
            )}

            <motion.div
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-foreground text-[13px] font-bold rounded-2xl group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-300 shadow-lg"
            >
              Shop Now
              <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 transition-transform duration-300" />
            </motion.div>
          </div>
        </div>
      </div>
    </Link>
  );
}

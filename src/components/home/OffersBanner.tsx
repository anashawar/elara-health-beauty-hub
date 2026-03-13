import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Offer {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  discount_type: string;
  discount_value: number;
  link_url: string | null;
  show_as_banner: boolean;
}

export default function OffersBanner() {
  const qc = useQueryClient();

  const { data: offers = [] } = useQuery({
    queryKey: ["active-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .eq("show_as_banner", true)
        .order("sort_order");
      if (error) throw error;
      // Filter out expired
      const now = new Date();
      return (data || []).filter((o: any) => {
        if (o.ends_at && new Date(o.ends_at) < now) return false;
        if (o.starts_at && new Date(o.starts_at) > now) return false;
        return true;
      });
    },
  });

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel('offers-banner-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        qc.invalidateQueries({ queryKey: ["active-offers"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Auto-cycle if multiple offers
  useEffect(() => {
    if (offers.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % offers.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [offers.length]);

  if (offers.length === 0) return null;

  const offer = offers[current];
  const discountLabel = offer.discount_type === "percentage"
    ? `${offer.discount_value}% OFF`
    : offer.discount_type === "fixed"
      ? `${offer.discount_value.toLocaleString()} IQD OFF`
      : offer.discount_type === "bogo"
        ? "BUY 1 GET 1"
        : "BUNDLE DEAL";

  const linkTo = offer.link_url || "/collection/offers";

  return (
    <section className="px-4 mt-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          <Link to={linkTo} className="block relative overflow-hidden rounded-2xl shadow-premium group">
            {/* Background */}
            {offer.image_url ? (
              <div className="relative h-[160px] md:h-[200px]">
                <img src={offer.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent rtl:bg-gradient-to-l" />
                
                {/* Content over image */}
                <div className="relative z-10 h-full flex flex-col justify-center px-5 py-4 max-w-[75%]">
                  {/* Discount badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-white w-fit mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {discountLabel}
                  </span>

                  <h3 className="text-xl md:text-2xl font-display font-bold text-white leading-tight">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="text-sm text-white/80 mt-1 leading-relaxed line-clamp-2">{offer.subtitle}</p>
                  )}

                  <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-foreground text-xs font-bold rounded-xl w-fit group-hover:bg-white/90 transition-all shadow-lg">
                    Shop Now
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ) : (
              /* Gradient fallback when no image */
              <div className="relative h-[140px] md:h-[180px] bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                {/* Decorative elements */}
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 animate-pulse" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 right-1/4 w-10 h-10 rounded-full bg-white/5" />

                <div className="relative z-10 h-full flex flex-col justify-center px-5 py-4 max-w-[80%]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white w-fit mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {discountLabel}
                  </span>

                  <h3 className="text-xl md:text-2xl font-display font-bold text-white leading-tight">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="text-sm text-white/80 mt-1">{offer.subtitle}</p>
                  )}

                  <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-foreground text-xs font-bold rounded-xl w-fit group-hover:bg-white/90 transition-all shadow-lg">
                    Shop Now
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </div>
                </div>
              </div>
            )}
          </Link>

          {/* Dots indicator */}
          {offers.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2.5">
              {offers.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => { setCurrent(idx); clearInterval(intervalRef.current); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === current ? "w-5 bg-primary" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

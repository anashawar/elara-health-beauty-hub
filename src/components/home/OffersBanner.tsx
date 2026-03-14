import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

interface Offer {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  discount_type: string;
  discount_value: number;
  link_url: string | null;
}

export default function OffersBanner() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: offers = [] } = useQuery({
    queryKey: ["active-offers-gallery"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("offers")
        .select("*") as any)
        .eq("is_active", true)
        .eq("banner_style", "gallery")
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

  useEffect(() => {
    const channel = supabase
      .channel('offers-banner-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        qc.invalidateQueries({ queryKey: ["active-offers-gallery"] });
        qc.invalidateQueries({ queryKey: ["active-offers-hero"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <Link to={linkTo} className="block relative overflow-hidden rounded-3xl shadow-float group">
            {offer.image_url ? (
              <div className="relative h-[160px] md:h-[200px]">
                <img src={offer.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent rtl:bg-gradient-to-l" />
                
                <div className="relative z-10 h-full flex flex-col justify-center px-5 py-4 max-w-[75%]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-white w-fit mb-2 border border-white/10">
                    <Sparkles className="w-3.5 h-3.5" />
                    {discountLabel}
                  </span>

                  <h3 className="text-xl md:text-2xl font-display font-bold text-white leading-tight tracking-tight">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="text-[13px] text-white/75 mt-1 leading-relaxed line-clamp-2">{offer.subtitle}</p>
                  )}

                  <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white/90 backdrop-blur-sm text-foreground text-xs font-bold rounded-xl w-fit group-hover:bg-white transition-all shadow-lg">
                    Shop Now
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-[140px] md:h-[180px] bg-gradient-to-br from-primary via-primary/80 to-primary/60">
                <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/8 blur-xl" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/8 blur-xl" />

                <div className="relative z-10 h-full flex flex-col justify-center px-5 py-4 max-w-[80%]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-white w-fit mb-2 border border-white/10">
                    <Sparkles className="w-3.5 h-3.5" />
                    {discountLabel}
                  </span>

                  <h3 className="text-xl md:text-2xl font-display font-bold text-white leading-tight tracking-tight">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="text-[13px] text-white/75 mt-1">{offer.subtitle}</p>
                  )}

                  <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white/90 backdrop-blur-sm text-foreground text-xs font-bold rounded-xl w-fit group-hover:bg-white transition-all shadow-lg">
                    Shop Now
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </div>
                </div>
              </div>
            )}
          </Link>

          {offers.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {offers.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => { setCurrent(idx); clearInterval(intervalRef.current); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === current ? "w-6 bg-primary" : "w-1.5 bg-border"
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

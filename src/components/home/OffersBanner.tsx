import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

export default function OffersBanner() {
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
      }).filter((o: any) => o.image_url);
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
            <div className="relative h-[160px] md:h-[200px]">
              <img
                src={offer.image_url}
                alt={offer.title || ""}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
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

import { Link } from "react-router-dom";
import { ArrowRight, Percent } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DealsBanner = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: hasOrdered } = useQuery({
    queryKey: ["has-first-order", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .limit(1);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Hide if user is logged in and has already ordered
  if (user && hasOrdered) return null;

  return (
    <section className="px-4 mt-8">
      <Link
        to="/categories"
        className="block relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/85 to-primary/65 p-5 shadow-float group active:scale-[0.98] transition-transform duration-200"
      >
        {/* Glass decoration */}
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/8 blur-xl" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/8 blur-xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/10">
            <Percent className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">{t("home.dealsForYou")}</p>
            <p className="text-sm font-bold text-white leading-snug">
              {t("home.dealsText")}
            </p>
          </div>

          <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <ArrowRight className="w-4 h-4 text-primary rtl:rotate-180" />
          </div>
        </div>
      </Link>
    </section>
  );
};

export default DealsBanner;

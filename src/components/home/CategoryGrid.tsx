import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

const categoryStyles: Record<string, { bg: string }> = {
  skincare: { bg: "from-pink-400/90 to-rose-500/90" },
  haircare: { bg: "from-amber-400/90 to-orange-500/90" },
  bodycare: { bg: "from-sky-400/90 to-blue-500/90" },
  makeup: { bg: "from-red-400/90 to-pink-500/90" },
  vitamins: { bg: "from-emerald-400/90 to-teal-500/90" },
  personalcare: { bg: "from-violet-400/90 to-purple-500/90" },
  otc: { bg: "from-teal-400/90 to-cyan-500/90" },
  wellness: { bg: "from-indigo-400/90 to-blue-500/90" },
  motherbaby: { bg: "from-yellow-400/90 to-amber-500/90" },
  devices: { bg: "from-slate-400/90 to-zinc-500/90" },
};

const CategoryGrid = () => {
  const { data: categories = [] } = useCategories();
  const { language } = useLanguage();

  if (categories.length === 0) return null;

  const displayCategories = categories.slice(0, 8);

  const getCatName = (cat: any) => {
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language === "ku" && cat.name_ku) return cat.name_ku;
    return cat.name;
  };

  return (
    <section className="px-4 mt-5">
      <div className="glass rounded-3xl border border-border/30 shadow-glass p-4">
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
          {displayCategories.map((cat, i) => {
            const style = categoryStyles[cat.slug] || { bg: "from-primary/90 to-primary/60" };
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <Link
                  to={`/category/${cat.slug}`}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-14 h-14 rounded-[18px] bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-premium group-hover:scale-110 group-hover:shadow-float transition-all duration-300 active:scale-95`}>
                    <span className="text-[22px] drop-shadow-sm">{cat.icon}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-foreground/80 text-center leading-tight line-clamp-2">
                    {getCatName(cat)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;

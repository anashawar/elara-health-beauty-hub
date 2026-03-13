import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const categoryStyles: Record<string, { bg: string; text: string }> = {
  skincare: { bg: "from-pink-400 to-rose-500", text: "text-white" },
  haircare: { bg: "from-amber-400 to-orange-500", text: "text-white" },
  bodycare: { bg: "from-sky-400 to-blue-500", text: "text-white" },
  makeup: { bg: "from-red-400 to-pink-500", text: "text-white" },
  vitamins: { bg: "from-emerald-400 to-teal-500", text: "text-white" },
  personalcare: { bg: "from-violet-400 to-purple-500", text: "text-white" },
  otc: { bg: "from-teal-400 to-cyan-500", text: "text-white" },
  wellness: { bg: "from-indigo-400 to-blue-500", text: "text-white" },
  motherbaby: { bg: "from-yellow-400 to-amber-500", text: "text-white" },
  devices: { bg: "from-slate-400 to-zinc-500", text: "text-white" },
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
      <div className="bg-card rounded-2xl border border-border/50 shadow-premium p-3.5">
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 md:gap-3">
          {displayCategories.map(cat => {
            const style = categoryStyles[cat.slug] || { bg: "from-primary to-primary/70", text: "text-primary-foreground" };
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200`}>
                  <span className="text-2xl drop-shadow-sm">{cat.icon}</span>
                </div>
                <span className="text-[11px] font-bold text-foreground text-center leading-tight line-clamp-2">
                  {getCatName(cat)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;

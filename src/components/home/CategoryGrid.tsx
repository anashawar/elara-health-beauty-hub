import { memo } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const CategoryGrid = memo(() => {
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
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5 md:gap-3">
        {displayCategories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="flex flex-col items-center gap-1.5 md:gap-2 py-3 md:py-4 rounded-2xl bg-card border border-border/40 shadow-glass hover:shadow-premium hover:border-primary/30 active:scale-95 md:active:scale-100 md:hover:scale-105 transition-all duration-200"
          >
            <span className="text-[26px] md:text-[32px] leading-none">{cat.icon}</span>
            <span className="text-[10px] md:text-xs font-semibold text-foreground text-center leading-tight line-clamp-1 px-1">
              {getCatName(cat)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
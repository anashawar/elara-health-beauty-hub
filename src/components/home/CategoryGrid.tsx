import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

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
      <div className="grid grid-cols-4 gap-2.5">
        {displayCategories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link
              to={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border/40 shadow-glass hover:shadow-premium active:scale-95 transition-all duration-200"
            >
              <span className="text-[26px] leading-none">{cat.icon}</span>
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-1 px-1">
                {getCatName(cat)}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;

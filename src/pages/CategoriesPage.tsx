import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles, Search } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import FloatingSearch from "@/components/layout/FloatingSearch";
import SearchOverlay from "@/components/SearchOverlay";
import { useCategories, useSubcategories } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const CategoriesPage = () => {
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { t, language } = useLanguage();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleExpand = (slug: string) => {
    setExpandedSlug(prev => (prev === slug ? null : slug));
  };

  const getCatName = (cat: any) => {
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language === "ku" && cat.name_ku) return cat.name_ku;
    return cat.name;
  };

  const getSubName = (sub: any) => {
    if (language === "ar" && sub.name_ar) return sub.name_ar;
    if (language === "ku" && sub.name_ku) return sub.name_ku;
    return sub.name;
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">{t("categories.title")}</h1>
        </div>
      </header>

      <div className="app-container">
        {/* Desktop title */}
        <div className="hidden md:block px-6 pt-6 pb-2">
          <h1 className="text-2xl font-display font-bold text-foreground">{t("categories.title")}</h1>
        </div>

        {/* Category cards */}
        <div className="px-4 md:px-6 mt-4 space-y-2.5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
          {categories.map((cat, idx) => {
            const isExpanded = expandedSlug === cat.slug;
            const subs = subcategories.filter(s => s.category_id === cat.id);

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl overflow-hidden"
              >
                {/* Category header — clean card style */}
                <button
                  onClick={() => subs.length > 0 ? toggleExpand(cat.slug) : null}
                  className="w-full group"
                >
                  <div className={`bg-card border border-border/60 px-4 py-3.5 flex items-center gap-3 transition-all ${isExpanded ? "rounded-t-2xl border-b-0" : "rounded-2xl"} hover:border-primary/30 hover:shadow-sm`}>
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                      {cat.icon}
                    </div>
                    <div className="flex-1 text-left rtl:text-right min-w-0">
                      <span className="text-sm font-bold text-foreground block truncate">{getCatName(cat)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {subs.length} {language === "ar" ? "قسم فرعي" : language === "ku" ? "بەشی لاوەکی" : subs.length === 1 ? "subcategory" : "subcategories"}
                      </span>
                    </div>
                    {subs.length > 0 ? (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rtl:rotate-180" />
                      </motion.div>
                    ) : (
                      <Link
                        to={`/category/${cat.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-primary font-bold px-3 py-1.5 bg-primary/8 rounded-lg border border-primary/15 hover:bg-primary/15 transition-colors flex-shrink-0"
                      >
                        {t("categories.viewAll")}
                      </Link>
                    )}
                  </div>
                </button>

                {/* Expanded subcategories */}
                <AnimatePresence>
                  {isExpanded && subs.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-card border border-border/60 border-t-0 rounded-b-2xl px-3 pb-3 pt-2">
                        <Link
                          to={`/category/${cat.slug}`}
                          className="flex items-center gap-2 px-3 py-2.5 mb-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          <Search className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-primary">
                            {t("categories.viewAll")} {getCatName(cat)}
                          </span>
                        </Link>

                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {subs.map((sub) => (
                            <Link
                              key={sub.id}
                              to={`/category/${cat.slug}?sub=${sub.id}`}
                              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-secondary/40 hover:bg-secondary transition-colors group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="text-lg">{sub.icon}</span>
                              </div>
                              <span className="text-[10px] font-bold text-foreground text-center leading-tight">
                                {getSubName(sub)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      <FloatingSearch />
      <BottomNav />
    </div>
  );
};

export default CategoriesPage;

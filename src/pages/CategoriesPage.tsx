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

const categoryGradients: Record<string, string> = {
  skincare: "from-pink-500 to-rose-600",
  haircare: "from-amber-500 to-orange-600",
  bodycare: "from-sky-500 to-blue-600",
  makeup: "from-red-500 to-pink-600",
  vitamins: "from-emerald-500 to-teal-600",
  personalcare: "from-violet-500 to-purple-600",
  otc: "from-teal-500 to-cyan-600",
  wellness: "from-indigo-500 to-blue-600",
  motherbaby: "from-yellow-500 to-amber-600",
  devices: "from-slate-500 to-zinc-600",
};

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
        <div className="px-4 md:px-6 mt-4 space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
          {categories.map((cat, idx) => {
            const isExpanded = expandedSlug === cat.slug;
            const subs = subcategories.filter(s => s.category_id === cat.id);
            const gradient = categoryGradients[cat.slug] || "from-primary to-primary/70";

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl overflow-hidden"
              >
                {/* Category header with gradient */}
                <button
                  onClick={() => subs.length > 0 ? toggleExpand(cat.slug) : null}
                  className="w-full relative overflow-hidden group"
                >
                  <div className={`bg-gradient-to-r ${gradient} px-4 py-4 flex items-center gap-3`}>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <div className="flex-1 text-left rtl:text-right">
                      <span className="text-[15px] font-bold text-white block">{getCatName(cat)}</span>
                      <span className="text-[11px] text-white/70">{subs.length} {subs.length === 1 ? "subcategory" : "subcategories"}</span>
                    </div>
                    {subs.length > 0 ? (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"
                      >
                        <ChevronRight className="w-4 h-4 text-white rtl:rotate-180" />
                      </motion.div>
                    ) : (
                      <Link
                        to={`/category/${cat.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-white font-bold px-3.5 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20"
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
                      <div className="bg-card border border-t-0 border-border/50 rounded-b-2xl px-3 pb-3 pt-2">
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
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
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

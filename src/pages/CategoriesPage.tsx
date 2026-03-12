import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { useCategories } from "@/hooks/useProducts";

// Sub-categories mapping per category slug
const subCategories: Record<string, { name: string; icon: string }[]> = {
  skincare: [
    { name: "Cleansers", icon: "🧼" },
    { name: "Moisturizers", icon: "💧" },
    { name: "Serums", icon: "✨" },
    { name: "Sunscreen", icon: "☀️" },
    { name: "Masks", icon: "🎭" },
    { name: "Toners", icon: "🌸" },
  ],
  haircare: [
    { name: "Shampoo", icon: "🧴" },
    { name: "Conditioner", icon: "💆" },
    { name: "Hair Oil", icon: "🫧" },
    { name: "Treatments", icon: "💇" },
    { name: "Styling", icon: "💫" },
  ],
  bodycare: [
    { name: "Body Wash", icon: "🚿" },
    { name: "Body Lotion", icon: "🧴" },
    { name: "Deodorant", icon: "🌿" },
    { name: "Hand Cream", icon: "🤲" },
  ],
  makeup: [
    { name: "Lips", icon: "💋" },
    { name: "Eyes", icon: "👁️" },
    { name: "Face", icon: "✨" },
    { name: "Nails", icon: "💅" },
  ],
  vitamins: [
    { name: "Multivitamins", icon: "💊" },
    { name: "Vitamin D", icon: "☀️" },
    { name: "Omega-3", icon: "🐟" },
    { name: "Iron", icon: "💪" },
  ],
  personalcare: [
    { name: "Oral Care", icon: "🪥" },
    { name: "Feminine Care", icon: "🌷" },
    { name: "Shaving", icon: "🪒" },
  ],
  otc: [
    { name: "Pain Relief", icon: "💊" },
    { name: "Cold & Flu", icon: "🤧" },
    { name: "Digestive", icon: "🫄" },
    { name: "First Aid", icon: "🩹" },
  ],
  wellness: [
    { name: "Supplements", icon: "🌿" },
    { name: "Probiotics", icon: "🦠" },
    { name: "Protein", icon: "💪" },
  ],
  motherbaby: [
    { name: "Baby Care", icon: "👶" },
    { name: "Diapers", icon: "🧷" },
    { name: "Maternity", icon: "🤰" },
  ],
  devices: [
    { name: "Skin Devices", icon: "🔬" },
    { name: "Hair Tools", icon: "💇" },
    { name: "Oral Devices", icon: "🪥" },
  ],
};

const CategoriesPage = () => {
  const { data: categories = [] } = useCategories();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const toggleExpand = (slug: string) => {
    setExpandedSlug(prev => (prev === slug ? null : slug));
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">Categories</h1>
        </div>
      </header>

      {/* Category list */}
      <div className="px-4 mt-4 space-y-3">
        {categories.map((cat, idx) => {
          const isExpanded = expandedSlug === cat.slug;
          const subs = subCategories[cat.slug] || [];

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
            >
              {/* Category header row */}
              <button
                onClick={() => toggleExpand(cat.slug)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">
                  {cat.icon}
                </span>
                <span className="flex-1 text-left text-sm font-semibold text-foreground">
                  {cat.name}
                </span>
                {subs.length > 0 ? (
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ) : (
                  <Link
                    to={`/category/${cat.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-lg"
                  >
                    View All
                  </Link>
                )}
              </button>

              {/* Sub-categories */}
              <AnimatePresence>
                {isExpanded && subs.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-border/30">
                      {/* View All link */}
                      <Link
                        to={`/category/${cat.slug}`}
                        className="flex items-center gap-2 px-3 py-2.5 mb-1 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <span className="text-xs">🔍</span>
                        <span className="text-xs font-semibold text-primary">
                          View All {cat.name}
                        </span>
                      </Link>

                      {/* Sub-category grid */}
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {subs.map((sub) => (
                          <Link
                            key={sub.name}
                            to={`/category/${cat.slug}?sub=${encodeURIComponent(sub.name)}`}
                            className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-secondary/40 hover:bg-secondary transition-colors"
                          >
                            <span className="text-lg">{sub.icon}</span>
                            <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                              {sub.name}
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

      <BottomNav />
    </div>
  );
};

export default CategoriesPage;

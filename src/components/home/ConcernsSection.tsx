import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";

const allConcerns = [
  { id: "acne", key: "concerns.acne", icon: "🎯", gradient: "from-rose-500 to-pink-600", keywords: ["acne", "blemish", "pimple", "breakout", "zit"] },
  { id: "dryskin", key: "concerns.drySkin", icon: "💧", gradient: "from-sky-500 to-blue-600", keywords: ["dry skin", "dry", "hydrat", "moistur", "dehydrat"] },
  { id: "hyperpigmentation", key: "concerns.hyperpigmentation", icon: "🌟", gradient: "from-amber-500 to-orange-600", keywords: ["hyperpigmentation", "pigment", "dark spot", "brighten", "whiten", "melasma", "uneven tone"] },
  { id: "hairloss", key: "concerns.hairLoss", icon: "💇", gradient: "from-violet-500 to-purple-600", keywords: ["hair loss", "hairloss", "hair fall", "thinning hair", "hair growth", "alopecia"] },
  { id: "dandruff", key: "concerns.dandruff", icon: "❄️", gradient: "from-cyan-500 to-teal-600", keywords: ["dandruff", "flak", "scalp", "seborrh"] },
  { id: "sensitive", key: "concerns.sensitiveSkin", icon: "🌸", gradient: "from-pink-500 to-rose-600", keywords: ["sensitive", "redness", "irritat", "calm", "sooth", "rosacea", "gentle"] },
  { id: "immunity", key: "concerns.immunity", icon: "🛡️", gradient: "from-emerald-500 to-green-600", keywords: ["immun", "vitamin c", "vitamin d", "zinc", "defense", "multivitamin"] },
  { id: "weightloss", key: "concerns.weightLoss", icon: "⚡", gradient: "from-yellow-500 to-amber-600", keywords: ["weight loss", "weight", "slim", "fat burn", "metabolism", "diet"] },
];

function productMatchesConcern(
  product: { condition?: string | null; tags: string[]; description: string; title: string; benefits: string[] },
  concern: typeof allConcerns[0]
): boolean {
  // Direct match via condition field
  if (product.condition) {
    const conditions = product.condition.split(",").map(s => s.trim().toLowerCase());
    if (conditions.includes(concern.id)) return true;
  }
  // Direct match via tags
  if (product.tags.some(t => t.toLowerCase().includes(concern.id.replace("dryskin", "dry skin").replace("hairloss", "hair loss").replace("weightloss", "weight loss")))) {
    return true;
  }
  // Auto-detect via keywords in title, description, benefits, tags
  const searchText = [
    product.title,
    product.description,
    ...product.benefits,
    ...product.tags,
  ].join(" ").toLowerCase();

  return concern.keywords.some(kw => searchText.includes(kw));
}

const ConcernsSection = () => {
  const { t } = useLanguage();
  const { data: products = [] } = useProducts();

  const activeConcerns = useMemo(() => {
    if (products.length === 0) return allConcerns; // Show all while loading
    return allConcerns
      .map(concern => ({
        ...concern,
        count: products.filter(p => productMatchesConcern(p, concern)).length,
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [products]);

  if (activeConcerns.length === 0) return null;

  return (
    <section className="px-4 mt-8">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
          <Stethoscope className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{t("home.shopByConcern")}</h2>
          <p className="text-[11px] text-muted-foreground">{t("home.findWhatYouNeed")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {activeConcerns.map((c, idx) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Link
              to={`/concern/${c.id}`}
              className="flex items-center gap-3 p-3.5 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                <span className="text-xl drop-shadow-sm">{c.icon}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-foreground leading-tight">{t(c.key)}</span>
                {"count" in c && (
                  <span className="text-[10px] text-muted-foreground">{(c as any).count} {t("common.products")}</span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ConcernsSection;

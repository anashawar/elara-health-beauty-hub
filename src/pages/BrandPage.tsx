import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useBrands, useBrandProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import FloatingSearch from "@/components/layout/FloatingSearch";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";

const BrandPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: brands = [] } = useBrands();
  const { t, language } = useLanguage();

  // Support both slug and id lookup
  const brand = brands.find((b) => b.slug === id) || brands.find((b) => b.id === id);
  const { data: brandProducts = [], isLoading } = useBrandProducts(brand?.id);

  // Get country from brand itself, fallback to product countries
  const brandCountry = brand?.country_of_origin;
  const productCountries = [...new Set(brandProducts.map(p => p.country_of_origin).filter(Boolean))];
  const countries = brandCountry ? [brandCountry] : productCountries;

  const countryFlag = (country: string): string => {
    const map: Record<string, string> = {
      "France": "🇫🇷", "USA": "🇺🇸", "United States": "🇺🇸", "South Korea": "🇰🇷", "Korea": "🇰🇷",
      "Germany": "🇩🇪", "Japan": "🇯🇵", "UK": "🇬🇧", "United Kingdom": "🇬🇧", "Italy": "🇮🇹",
      "Spain": "🇪🇸", "Canada": "🇨🇦", "Australia": "🇦🇺", "Switzerland": "🇨🇭", "Sweden": "🇸🇪",
      "Turkey": "🇹🇷", "India": "🇮🇳", "Iraq": "🇮🇶", "Jordan": "🇯🇴", "UAE": "🇦🇪",
      "Lebanon": "🇱🇧", "Morocco": "🇲🇦", "Egypt": "🇪🇬", "China": "🇨🇳", "Brazil": "🇧🇷",
      "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "Poland": "🇵🇱", "Ireland": "🇮🇪",
    };
    return map[country] || "🌍";
  };

  const getBrandName = (b: any) => {
    if (language === "ar" && b.name_ar) return b.name_ar;
    if (language === "ku" && b.name_ku) return b.name_ku;
    return b.name;
  };

  const displayName = brand ? getBrandName(brand) : t("product.brand");

  return (
    <div className="min-h-screen bg-background pb-24 app-container">
      <SEOHead
        title={`${displayName} Products — Buy in Iraq`}
        description={`Shop original ${displayName} products in Iraq. ${brandProducts.length} products available. Fast delivery across Iraq.`}
        canonical={`https://elara-health-beauty-hub.lovable.app/brand/${brand?.slug || id}`}
        keywords={`${displayName}, ${displayName} iraq, buy ${displayName} iraq, ${displayName} products, beauty iraq`}
        jsonLd={breadcrumbJsonLd([
          { name: "ELARA", url: "https://elara-health-beauty-hub.lovable.app" },
          { name: "Brands", url: "https://elara-health-beauty-hub.lovable.app/shop" },
          { name: displayName, url: `https://elara-health-beauty-hub.lovable.app/brand/${brand?.slug || id}` },
        ])}
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to={-1 as any} onClick={(e) => { e.preventDefault(); window.history.back(); }} className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <h1 className="text-lg font-display font-bold text-foreground">{displayName}</h1>
        </div>
      </header>

      {/* Brand Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative p-6 flex items-center gap-5">
          {brand?.logo_url && (
            <div className="w-24 h-24 rounded-2xl bg-card overflow-hidden shadow-premium border border-border/50 flex-shrink-0 p-3">
              <img src={brand.logo_url} alt={displayName} className="w-full h-full object-contain drop-shadow-sm" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold text-foreground">{displayName}</h2>
            {countries.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-base leading-none flex-shrink-0">{countryFlag(countries[0])}</span>
                <span className="text-xs text-muted-foreground">{countries.join(", ")}</span>
              </div>
            )}
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              <span className="text-[11px] font-semibold">
                {brandProducts.length} {brandProducts.length !== 1 ? t("common.products").toLowerCase() : t("common.product").toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Products */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 mt-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border/50">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : brandProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 px-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{t("product.noProductsFound")}</p>
          <p className="text-xs text-muted-foreground">{t("product.checkBackLater") || "Check back later for new arrivals"}</p>
        </div>
      ) : (
        <>
          <div className="px-4 mt-5 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4">
            {brandProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </>
      )}

      <FloatingSearch />
      <BottomNav />
    </div>
  );
};

export default BrandPage;

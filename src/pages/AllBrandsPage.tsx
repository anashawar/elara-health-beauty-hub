import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Globe, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBrands } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import BottomNav from "@/components/layout/BottomNav";
import FloatingSearch from "@/components/layout/FloatingSearch";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCity, isBrandAvailableInCity } from "@/hooks/useUserCity";

const AllBrandsPage = () => {
  const { data: allBrands = [], isLoading } = useBrands();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const userCity = useUserCity();

  // Filter out city-restricted brands the user can't see
  const brands = useMemo(() => allBrands.filter((b: any) => isBrandAvailableInCity(b.restricted_cities, userCity)), [allBrands, userCity]);

  const getBrandName = (b: any) => {
    if (language === "ar" && b.name_ar) return b.name_ar;
    if (language === "ku" && b.name_ku) return b.name_ku;
    return b.name;
  };

  const countryFlag = (country: string): string => {
    const map: Record<string, string> = {
      France: "🇫🇷", USA: "🇺🇸", "United States": "🇺🇸", "South Korea": "🇰🇷",
      Korea: "🇰🇷", Germany: "🇩🇪", Japan: "🇯🇵", UK: "🇬🇧", "United Kingdom": "🇬🇧",
      Italy: "🇮🇹", Spain: "🇪🇸", Canada: "🇨🇦", Australia: "🇦🇺", Switzerland: "🇨🇭",
      Sweden: "🇸🇪", Turkey: "🇹🇷", India: "🇮🇳", Iraq: "🇮🇶", Jordan: "🇯🇴",
      UAE: "🇦🇪", Lebanon: "🇱🇧", Morocco: "🇲🇦", Egypt: "🇪🇬", China: "🇨🇳",
      Brazil: "🇧🇷", Netherlands: "🇳🇱", Belgium: "🇧🇪", Poland: "🇵🇱", Ireland: "🇮🇪",
    };
    return map[country] || "🌍";
  };

  // Filter & group brands alphabetically
  const { filteredBrands, grouped, letters } = useMemo(() => {
    let filtered = brands;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = brands.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.name_ar?.toLowerCase().includes(q) ||
          b.name_ku?.toLowerCase().includes(q) ||
          b.country_of_origin?.toLowerCase().includes(q)
      );
    }

    if (selectedLetter) {
      filtered = filtered.filter((b) => {
        const first = b.name.charAt(0).toUpperCase();
        return selectedLetter === "#" ? !/[A-Z]/.test(first) : first === selectedLetter;
      });
    }

    // Group by first letter
    const grouped: Record<string, typeof brands> = {};
    filtered.forEach((b) => {
      const first = b.name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(b);
    });

    const letters = Object.keys(grouped).sort((a, b) =>
      a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)
    );

    return { filteredBrands: filtered, grouped, letters };
  }, [brands, search, selectedLetter]);

  // All available letters for the alphabet bar
  const allLetters = useMemo(() => {
    const set = new Set<string>();
    brands.forEach((b) => {
      const first = b.name.charAt(0).toUpperCase();
      set.add(/[A-Z]/.test(first) ? first : "#");
    });
    return Array.from(set).sort((a, b) =>
      a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)
    );
  }, [brands]);

  return (
    <div className="min-h-screen bg-background pb-24 app-container">
      <SEOHead
        title="All Brands — ELARA Iraq"
        description="Discover all beauty and skincare brands available at ELARA Iraq. Shop original products from top international brands."
        canonical="https://elara-health-beauty-hub.lovable.app/brands"
        keywords="brands, beauty brands iraq, skincare brands, ELARA brands"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold text-foreground">
              {t("home.featuredBrands") || "Brands"}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {brands.length} {t("common.brands") || "brands"}
            </p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-card to-accent/8 border border-border/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative px-5 py-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Globe className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {t("brands.discoverTitle") || "Discover Brands"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {t("brands.discoverSubtitle") || "Explore our curated collection of world-class beauty brands"}
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("brands.searchPlaceholder") || "Search brands..."}
            className="pl-9 rtl:pl-4 rtl:pr-9 h-11 rounded-xl bg-secondary/50 border-border/50 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Alphabet Bar */}
      <div className="px-4 mt-3">
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedLetter(null)}
            className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
              selectedLetter === null
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t("common.all") || "All"}
          </button>
          {allLetters.map((letter) => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter === selectedLetter ? null : letter)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                selectedLetter === letter
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Brands Grid */}
      <div className="px-4 mt-5 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-20 h-20 rounded-2xl" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t("common.noResults")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("common.tryDifferent")}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {letters.map((letter) => (
              <motion.div
                key={letter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Letter Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 w-7 h-7 rounded-lg flex items-center justify-center">
                    {letter}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[10px] text-muted-foreground">
                    {grouped[letter].length}
                  </span>
                </div>

                {/* Brand Cards */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6">
                  {grouped[letter].map((brand, idx) => (
                    <motion.div
                      key={brand.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                    >
                      <Link
                        to={`/brand/${brand.slug}`}
                        className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-premium active:scale-95 transition-all duration-200"
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-secondary/30 flex items-center justify-center overflow-hidden p-2 group-hover:bg-primary/5 transition-colors">
                          <img
                            src={brand.logo_url || "/placeholder.svg"}
                            alt={getBrandName(brand)}
                            className="w-full h-full object-contain drop-shadow-sm"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="text-center w-full">
                          <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
                            {getBrandName(brand)}
                          </p>
                          {brand.country_of_origin && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                              <span className="leading-none">{countryFlag(brand.country_of_origin)}</span>
                              <span className="truncate">{brand.country_of_origin}</span>
                            </p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <FloatingSearch />
      <BottomNav />
    </div>
  );
};

export default AllBrandsPage;

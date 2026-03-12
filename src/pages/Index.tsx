import { useState } from "react";
import TopHeader from "@/components/layout/TopHeader";
import BottomNav from "@/components/layout/BottomNav";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import ProductSection from "@/components/home/ProductSection";
import ConcernsSection from "@/components/home/ConcernsSection";
import BrandsSection from "@/components/home/BrandsSection";
import AskElaraCard from "@/components/home/AskElaraCard";
import SearchOverlay from "@/components/SearchOverlay";
import { products } from "@/data/products";

const Index = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  const trending = products.filter(p => p.isTrending);
  const picks = products.filter(p => p.isPick);
  const offers = products.filter(p => p.originalPrice);
  const newArrivals = products.filter(p => p.isNew);

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <TopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <HeroBanner />
      <CategoryGrid />

      <ProductSection title="Trending Now" subtitle="Most popular this week" products={trending} viewAllLink="/categories" />

      <AskElaraCard />

      <ProductSection title="ELARA Picks" subtitle="Curated just for you" products={picks} viewAllLink="/categories" />

      <ProductSection title="Special Offers" subtitle="Limited time deals" products={offers} viewAllLink="/categories" />

      <BrandsSection />

      <ProductSection title="New Arrivals" subtitle="Fresh additions to our collection" products={newArrivals} viewAllLink="/categories" />

      <ConcernsSection />

      <div className="mt-8 mb-4 px-4 text-center">
        <p className="text-xs text-muted-foreground">ELARA — Iraq's Smart Health & Beauty Platform</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

const VALUE_PROPS = [
  "24 Hour Delivery 🚀",
  "AI is your best friend 🧠",
  "Rewards on Orders 🎁",
  "Smart Shopping 🛍️",
  "+3,000 Products 📦",
  "+250 Verified Brands ✓",
  "Reasonable Prices 🏷️",
  "100% Original Products ✨",
];

const WhyElaraBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % VALUE_PROPS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-4 my-4 rounded-2xl bg-foreground px-5 py-5 flex items-center gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary leading-none">Only on</p>
        <p className="text-xl font-display font-black text-background tracking-tight leading-none mt-0.5">ELARA</p>
      </div>

      <div className="w-px h-8 bg-background/15 flex-shrink-0" />

      <div className="relative h-6 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <p
            key={currentIndex}
            className="absolute inset-0 flex items-center text-sm font-semibold text-background/85 whitespace-nowrap animate-fade-in"
          >
            {VALUE_PROPS[currentIndex]}
          </p>
        </AnimatePresence>
      </div>

      {/* Minimal dot indicator */}
      <div className="flex gap-1 flex-shrink-0">
        {VALUE_PROPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIndex ? "w-3 bg-primary" : "w-1 bg-background/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default WhyElaraBanner;

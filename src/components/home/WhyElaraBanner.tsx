import { useState, useEffect } from "react";

const VALUE_PROPS = [
  "ELARA AI — First in Iraq 🇮🇶🧠",
  "Your AI Beauty Consultant ✨",
  "AI Skin Analysis & Routines 💡",
  "24 Hour Delivery 🚀",
  "+3,000 Products 📦",
  "+250 Verified Brands ✓",
  "Rewards on Every Order 🎁",
  "100% Original Products 💎",
  "Reasonable Prices 🏷️",
];

const WhyElaraBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % VALUE_PROPS.length);
    }, 3000); // Slowed from 2.4s to 3s
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
        <p
          key={currentIndex}
          className="absolute inset-0 flex items-center text-sm font-semibold text-background/85 whitespace-nowrap animate-fade-in"
        >
          {VALUE_PROPS[currentIndex]}
        </p>
      </div>

      {/* Simplified indicator — just 3 dots */}
      <div className="flex gap-1 flex-shrink-0">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === currentIndex % 3 ? "w-3 bg-primary" : "w-1 bg-background/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default WhyElaraBanner;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Sparkles, Package, Award, BadgeCheck, Zap, Brain, Tag } from "lucide-react";

const VALUE_PROPS = [
  { icon: Truck, text: "24 Hour Delivery!", accent: "from-rose-500 to-orange-400" },
  { icon: Brain, text: "AI is your best friend", accent: "from-violet-500 to-indigo-500" },
  { icon: Package, text: "+3,000 Products", accent: "from-emerald-500 to-teal-400" },
  { icon: Award, text: "+250 Brands", accent: "from-amber-500 to-yellow-400" },
  { icon: Tag, text: "Reasonable Prices", accent: "from-sky-500 to-blue-400" },
  { icon: BadgeCheck, text: "Only Verified Brands", accent: "from-green-500 to-emerald-400" },
  { icon: Sparkles, text: "100% Original Products", accent: "from-pink-500 to-rose-400" },
  { icon: Zap, text: "Very Smart App", accent: "from-purple-500 to-violet-400" },
];

const WhyElaraBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % VALUE_PROPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const current = VALUE_PROPS[currentIndex];
  const Icon = current.icon;

  return (
    <div className="relative overflow-hidden rounded-3xl mx-4 my-6">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90" />
      
      {/* Floating orbs for depth */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 px-5 py-8 flex flex-col items-center text-center">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-1"
        >
          Only on
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: -5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-display font-black text-background tracking-tight mb-6"
        >
          ELARA
        </motion.h3>

        {/* Animated value prop — center stage */}
        <div className="relative h-28 w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute flex flex-col items-center gap-3"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.accent} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <p className="text-lg font-bold text-background/90 leading-tight max-w-[260px]">
                {current.text}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {VALUE_PROPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === currentIndex ? 20 : 5,
                opacity: i === currentIndex ? 1 : 0.3,
              }}
              transition={{ duration: 0.3 }}
              className="h-[5px] rounded-full bg-primary"
            />
          ))}
        </div>

        {/* Static mini-grid of all values */}
        <div className="grid grid-cols-4 gap-2 mt-6 w-full max-w-xs">
          {VALUE_PROPS.map((prop, i) => {
            const PropIcon = prop.icon;
            return (
              <motion.div
                key={i}
                animate={{
                  scale: i === currentIndex ? 1.1 : 1,
                  opacity: i === currentIndex ? 1 : 0.4,
                }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-1 py-2"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  i === currentIndex 
                    ? `bg-gradient-to-br ${prop.accent} shadow-sm` 
                    : "bg-background/10"
                }`}>
                  <PropIcon className={`w-4 h-4 ${i === currentIndex ? "text-white" : "text-background/40"}`} strokeWidth={2} />
                </div>
                <span className={`text-[8px] font-semibold leading-tight text-center ${
                  i === currentIndex ? "text-background/80" : "text-background/25"
                }`}>
                  {prop.text.split(" ").slice(0, 2).join(" ")}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WhyElaraBanner;

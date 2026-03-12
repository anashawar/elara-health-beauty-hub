import { Sparkles, ArrowRight } from "lucide-react";

const AskElaraCard = () => {
  return (
    <section className="px-4 mt-8">
      <div className="bg-gradient-to-br from-primary/5 via-accent to-champagne rounded-2xl p-5 shadow-premium relative overflow-hidden">
        <div className="absolute top-3 right-3 opacity-10">
          <Sparkles className="w-20 h-20 text-primary" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Coming Soon</span>
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-1">Ask ELARA</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[240px]">
            Your AI beauty & health assistant. Get personalized product recommendations instantly.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Best serum for oily skin?", "Vitamins for hair loss?", "SPF for pigmentation?"].map(q => (
              <span key={q} className="text-[10px] bg-card/70 backdrop-blur-sm text-muted-foreground px-3 py-1.5 rounded-xl">
                {q}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AskElaraCard;

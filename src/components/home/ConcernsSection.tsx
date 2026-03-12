import { Link } from "react-router-dom";
import { concerns } from "@/hooks/useProducts";
import { Sparkles } from "lucide-react";

const ConcernsSection = () => {
  return (
    <section className="px-4 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground">Shop by Concern</h2>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {concerns.map(c => (
          <Link
            key={c.id}
            to={`/concern/${c.id}`}
            className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-2xl border border-border shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="text-[10px] font-bold text-center text-foreground leading-tight">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ConcernsSection;

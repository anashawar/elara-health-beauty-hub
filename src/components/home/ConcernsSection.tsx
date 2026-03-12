import { Link } from "react-router-dom";
import { concerns } from "@/data/products";

const ConcernsSection = () => {
  return (
    <section className="px-4 mt-8">
      <h2 className="text-lg font-display font-bold text-foreground mb-4">Shop by Concern</h2>
      <div className="grid grid-cols-4 gap-2">
        {concerns.map(c => (
          <Link
            key={c.id}
            to={`/concern/${c.id}`}
            className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-2xl shadow-sm hover:shadow-premium transition-shadow duration-200"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="text-[10px] font-medium text-center text-muted-foreground leading-tight">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ConcernsSection;

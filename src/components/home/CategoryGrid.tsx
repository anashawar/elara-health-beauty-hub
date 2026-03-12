import { Link } from "react-router-dom";
import { categories } from "@/data/products";

const CategoryGrid = () => {
  return (
    <section className="px-4 mt-8">
      <h2 className="text-lg font-display font-bold text-foreground mb-4">Shop by Category</h2>
      <div className="grid grid-cols-5 gap-3">
        {categories.map(cat => (
          <Link
            key={cat.id}
            to={`/category/${cat.id}`}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-sm group-hover:shadow-premium transition-shadow duration-200`}>
              {cat.icon}
            </div>
            <span className="text-[10px] font-medium text-center text-muted-foreground leading-tight">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;

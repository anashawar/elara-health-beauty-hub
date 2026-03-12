import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";

const CategoryGrid = () => {
  const { data: categories = [] } = useCategories();

  if (categories.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map(cat => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200"
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-xs font-bold text-foreground whitespace-nowrap">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;

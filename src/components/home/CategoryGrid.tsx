import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";

const CategoryGrid = () => {
  const { data: categories = [] } = useCategories();

  if (categories.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="grid grid-cols-4 gap-2">
        {categories.map(cat => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="flex flex-col items-center gap-1.5 p-2.5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200"
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-[10px] font-bold text-foreground text-center leading-tight">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;

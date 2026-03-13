import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useProducts";

const categoryColors: Record<string, string> = {
  "skincare": "bg-gradient-to-br from-pink-200 via-rose-100 to-pink-300",
  "haircare": "bg-gradient-to-br from-amber-200 via-orange-100 to-yellow-300",
  "bodycare": "bg-gradient-to-br from-sky-200 via-cyan-100 to-blue-300",
  "makeup": "bg-gradient-to-br from-red-200 via-pink-100 to-fuchsia-300",
  "vitamins": "bg-gradient-to-br from-emerald-200 via-green-100 to-teal-300",
  "personalcare": "bg-gradient-to-br from-violet-200 via-purple-100 to-indigo-300",
  "otc": "bg-gradient-to-br from-teal-200 via-cyan-100 to-emerald-300",
  "wellness": "bg-gradient-to-br from-indigo-200 via-blue-100 to-violet-300",
  "motherbaby": "bg-gradient-to-br from-yellow-200 via-amber-100 to-orange-300",
  "devices": "bg-gradient-to-br from-slate-200 via-gray-100 to-zinc-300",
};

const CategoryGrid = () => {
  const { data: categories = [] } = useCategories();

  if (categories.length === 0) return null;

  const displayCategories = categories.slice(0, 8);

  return (
    <section className="px-4 mt-6">
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
        {displayCategories.map(cat => {
          const colorClass = categoryColors[cat.slug] || "bg-gradient-to-br from-primary/20 to-primary/10";
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-border/50 shadow-sm hover:shadow-premium hover:scale-105 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} shadow-sm`}>
                <span className="text-xl">{cat.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-foreground text-center leading-tight">{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;

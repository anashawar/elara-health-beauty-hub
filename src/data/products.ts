export interface Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  tags: string[];
  description: string;
  benefits: string[];
  usage: string;
  isNew?: boolean;
  isTrending?: boolean;
  isPick?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
}

export const categories = [
  { id: "skincare", name: "Skincare", icon: "✨", color: "from-pink-100 to-rose-50" },
  { id: "haircare", name: "Hair Care", icon: "💇‍♀️", color: "from-amber-100 to-orange-50" },
  { id: "bodycare", name: "Body Care", icon: "🧴", color: "from-blue-100 to-cyan-50" },
  { id: "makeup", name: "Makeup", icon: "💄", color: "from-red-100 to-pink-50" },
  { id: "vitamins", name: "Vitamins", icon: "💊", color: "from-green-100 to-emerald-50" },
  { id: "personalcare", name: "Personal Care", icon: "🪥", color: "from-purple-100 to-violet-50" },
  { id: "otc", name: "OTC", icon: "🏥", color: "from-teal-100 to-cyan-50" },
  { id: "wellness", name: "Wellness", icon: "🧘‍♀️", color: "from-indigo-100 to-blue-50" },
  { id: "motherbaby", name: "Mother & Baby", icon: "👶", color: "from-yellow-100 to-amber-50" },
  { id: "devices", name: "Devices", icon: "🔬", color: "from-gray-100 to-slate-50" },
];

export const concerns = [
  { id: "acne", name: "Acne", icon: "🎯" },
  { id: "dryskin", name: "Dry Skin", icon: "💧" },
  { id: "hyperpigmentation", name: "Hyperpigmentation", icon: "🌟" },
  { id: "hairloss", name: "Hair Loss", icon: "💇" },
  { id: "dandruff", name: "Dandruff", icon: "❄️" },
  { id: "sensitive", name: "Sensitive Skin", icon: "🌸" },
  { id: "immunity", name: "Immunity", icon: "🛡️" },
  { id: "weightloss", name: "Weight Loss", icon: "⚡" },
];

export const products: Product[] = [
  {
    id: "1", title: "CeraVe Hydrating Cleanser", brand: "CeraVe", price: 18500, originalPrice: 22000,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
    category: "skincare", tags: ["Dry Skin", "Sensitive Skin"],
    description: "A gentle, non-foaming cleanser that hydrates while cleansing. Formulated with ceramides and hyaluronic acid.",
    benefits: ["Hydrates skin", "Restores barrier", "Non-irritating"], usage: "Apply to damp skin, massage gently, rinse.", isTrending: true
  },
  {
    id: "2", title: "The Ordinary Niacinamide 10%", brand: "The Ordinary", price: 12000, originalPrice: 15000,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop",
    category: "skincare", tags: ["Acne", "Hyperpigmentation"],
    description: "High-strength zinc and niacinamide serum for blemish-prone skin.", 
    benefits: ["Reduces blemishes", "Controls oil", "Brightens skin"], usage: "Apply a few drops morning and evening.", isTrending: true, isPick: true
  },
  {
    id: "3", title: "La Roche-Posay Anthelios SPF50+", brand: "La Roche-Posay", price: 28000,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    category: "skincare", tags: ["Hyperpigmentation", "Sensitive Skin"],
    description: "Ultra-light invisible fluid sunscreen with broad spectrum SPF 50+ protection.",
    benefits: ["UVA/UVB protection", "Lightweight", "Non-greasy"], usage: "Apply generously before sun exposure.", isPick: true
  },
  {
    id: "4", title: "Bioderma Sensibio Micellar Water", brand: "Bioderma", price: 16000, originalPrice: 19000,
    image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop",
    category: "skincare", tags: ["Sensitive Skin"],
    description: "The original micellar water for sensitive skin. Gently cleanses and removes makeup.",
    benefits: ["Gentle cleansing", "No rinse needed", "Soothes skin"], usage: "Saturate a cotton pad and wipe across face.", isTrending: true
  },
  {
    id: "5", title: "Olaplex No.3 Hair Perfector", brand: "Olaplex", price: 35000,
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop",
    category: "haircare", tags: ["Hair Loss", "Dandruff"],
    description: "At-home bond building treatment that restores broken bonds in hair.", 
    benefits: ["Repairs damage", "Strengthens hair", "Adds shine"], usage: "Apply to damp hair, leave 10 min, rinse.", isNew: true
  },
  {
    id: "6", title: "Centrum Women Multivitamin", brand: "Centrum", price: 22000,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop",
    category: "vitamins", tags: ["Immunity"],
    description: "Complete multivitamin specially formulated for women's nutritional needs.",
    benefits: ["Supports immunity", "Boosts energy", "Bone health"], usage: "Take one tablet daily with food.", isNew: true, isPick: true
  },
  {
    id: "7", title: "MAC Ruby Woo Lipstick", brand: "MAC", price: 32000, originalPrice: 38000,
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop",
    category: "makeup", tags: [],
    description: "The iconic vivid blue-red shade in a retro matte finish.",
    benefits: ["Long-lasting", "Vivid color", "Matte finish"], usage: "Apply directly to lips.", isTrending: true
  },
  {
    id: "8", title: "Mustela Baby Gentle Cleanser", brand: "Mustela", price: 14500,
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    category: "motherbaby", tags: ["Sensitive Skin"],
    description: "Ultra-gentle cleanser designed for newborn skin and hair.",
    benefits: ["Tear-free", "Hypoallergenic", "Moisturizing"], usage: "Apply to wet skin, lather gently, rinse.", isNew: true
  },
  {
    id: "9", title: "Vitamin D3 5000IU", brand: "Nature Made", price: 11000, originalPrice: 14000,
    image: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&h=400&fit=crop",
    category: "vitamins", tags: ["Immunity"],
    description: "High-potency vitamin D3 supplement for bone and immune health.",
    benefits: ["Bone strength", "Immune support", "Mood support"], usage: "Take one softgel daily.", isPick: true
  },
  {
    id: "10", title: "Neutrogena Hydro Boost Gel", brand: "Neutrogena", price: 19500, originalPrice: 24000,
    image: "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=400&h=400&fit=crop",
    category: "skincare", tags: ["Dry Skin"],
    description: "Oil-free gel cream with hyaluronic acid for instant hydration.",
    benefits: ["48hr hydration", "Oil-free", "Lightweight"], usage: "Apply to clean face morning and night.", isTrending: true
  },
  {
    id: "11", title: "Oral-B Smart Toothbrush", brand: "Oral-B", price: 45000,
    image: "https://images.unsplash.com/photo-1559590062-7242ab03f3f9?w=400&h=400&fit=crop",
    category: "devices", tags: [],
    description: "Smart electric toothbrush with pressure sensor and Bluetooth connectivity.",
    benefits: ["Deep clean", "Pressure alert", "App tracking"], usage: "Use twice daily for 2 minutes.", isNew: true
  },
  {
    id: "12", title: "Dove Body Wash Sensitive", brand: "Dove", price: 8500, originalPrice: 10000,
    image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop",
    category: "bodycare", tags: ["Sensitive Skin"],
    description: "Hypoallergenic body wash for sensitive skin with NutriumMoisture.",
    benefits: ["Gentle cleansing", "Moisturizing", "Fragrance-free"], usage: "Use in shower daily.",
  },
];

export const brands: Brand[] = [
  { id: "1", name: "CeraVe", logo: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=100&h=100&fit=crop" },
  { id: "2", name: "The Ordinary", logo: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=100&h=100&fit=crop" },
  { id: "3", name: "La Roche-Posay", logo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100&h=100&fit=crop" },
  { id: "4", name: "MAC", logo: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=100&h=100&fit=crop" },
  { id: "5", name: "Olaplex", logo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop" },
  { id: "6", name: "Centrum", logo: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&h=100&fit=crop" },
];

export const formatPrice = (price: number) => {
  return `${price.toLocaleString()} IQD`;
};

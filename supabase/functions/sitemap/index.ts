import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://elarastore.co";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const urls: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { loc: "/home", priority: "1.0", changefreq: "daily" },
    { loc: "/categories", priority: "0.9", changefreq: "daily" },
    { loc: "/shop", priority: "0.9", changefreq: "daily" },
    { loc: "/brands", priority: "0.8", changefreq: "weekly" },
    { loc: "/collection/trending", priority: "0.8", changefreq: "daily" },
    { loc: "/collection/new", priority: "0.8", changefreq: "daily" },
    { loc: "/collection/offers", priority: "0.8", changefreq: "daily" },
    { loc: "/collection/picks", priority: "0.8", changefreq: "weekly" },
    { loc: "/collection/gifts", priority: "0.7", changefreq: "weekly" },
    { loc: "/about", priority: "0.5", changefreq: "monthly" },
    { loc: "/faq", priority: "0.5", changefreq: "monthly" },
    { loc: "/terms", priority: "0.3", changefreq: "monthly" },
    { loc: "/privacy", priority: "0.3", changefreq: "monthly" },
    { loc: "/install", priority: "0.5", changefreq: "monthly" },
  ];

  for (const p of staticPages) {
    urls.push(`  <url>
    <loc>${SITE}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);
  }

  // Products — use slug for SEO-friendly URLs
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("in_stock", true)
    .limit(5000);

  if (products) {
    for (const p of products) {
      const lastmod = p.updated_at?.split("T")[0] || today;
      urls.push(`  <url>
    <loc>${SITE}/product/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }
  }

  // Categories
  const { data: categories } = await supabase.from("categories").select("slug").limit(100);
  if (categories) {
    for (const c of categories) {
      urls.push(`  <url>
    <loc>${SITE}/category/${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  // Brands
  const { data: brands } = await supabase.from("brands").select("slug").limit(500);
  if (brands) {
    for (const b of brands) {
      urls.push(`  <url>
    <loc>${SITE}/brand/${b.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

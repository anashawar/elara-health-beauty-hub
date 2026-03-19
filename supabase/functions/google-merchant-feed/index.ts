import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://elara-health-beauty-hub.lovable.app";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch products with brand info and images
  let allProducts: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, title, title_ar, title_ku, slug, price, original_price,
        description, description_ar, description_ku,
        in_stock, condition, brand_id, category_id,
        brands ( name ),
        categories ( name ),
        product_images ( image_url, sort_order )
      `)
      .eq("in_stock", true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) break;
    allProducts = allProducts.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  const escXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  const items = allProducts.map((p) => {
    const image = (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.image_url || "";
    const additionalImages = (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(1, 10)
      .map((img: any) => img.image_url);
    const brand = p.brands?.name || "ELARA";
    const category = p.categories?.name || "Health & Beauty";
    const price = Number(p.price);
    const salePrice = p.original_price && Number(p.original_price) > price ? price : null;
    const listPrice = salePrice ? Number(p.original_price) : price;
    const desc = (p.description || p.title || "").slice(0, 5000);
    const availability = p.in_stock ? "in_stock" : "out_of_stock";
    const link = `${SITE}/product/${p.slug}`;

    let entry = `  <item>
    <g:id>${escXml(p.id)}</g:id>
    <g:title>${escXml(p.title)}</g:title>
    <g:description>${escXml(desc)}</g:description>
    <g:link>${escXml(link)}</g:link>
    <g:image_link>${escXml(image)}</g:image_link>
${additionalImages.map((img: string) => `    <g:additional_image_link>${escXml(img)}</g:additional_image_link>`).join("\n")}
    <g:availability>${availability}</g:availability>
    <g:price>${listPrice.toFixed(2)} IQD</g:price>
${salePrice ? `    <g:sale_price>${salePrice.toFixed(2)} IQD</g:sale_price>` : ""}
    <g:brand>${escXml(brand)}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>Health &amp; Beauty</g:google_product_category>
    <g:product_type>${escXml(category)}</g:product_type>
    <g:shipping>
      <g:country>IQ</g:country>
      <g:service>Standard</g:service>
      <g:price>5000.00 IQD</g:price>
    </g:shipping>
  </item>`;
    return entry;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>ELARA — Health &amp; Beauty Store Iraq</title>
  <link>${SITE}</link>
  <description>Iraq's #1 online health &amp; beauty store. Original skincare, makeup, vitamins &amp; more.</description>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

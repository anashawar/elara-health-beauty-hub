import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { product_ids } = await req.json();
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      throw new Error("product_ids array is required");
    }

    // Fetch products
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, title, brands(name)")
      .in("id", product_ids);
    if (pErr) throw pErr;

    // Check which products already have images
    const { data: existingImages } = await supabase
      .from("product_images")
      .select("product_id")
      .in("product_id", product_ids);
    const hasImageSet = new Set((existingImages || []).map((i: any) => i.product_id));

    const results: any[] = [];

    for (const product of (products || [])) {
      if (hasImageSet.has(product.id)) {
        results.push({ id: product.id, status: "skipped", reason: "already has images" });
        continue;
      }

      const brandName = (product as any).brands?.name || "";
      const searchQuery = `${product.title} ${brandName} product image beauty cosmetic`;

      try {
        // Use Firecrawl search to find product images
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 3,
            scrapeOptions: {
              formats: ["links"],
            },
          }),
        });

        if (!searchResp.ok) {
          const errText = await searchResp.text();
          console.error(`Firecrawl search error for ${product.id}:`, searchResp.status, errText);
          if (searchResp.status === 402) {
            results.push({ id: product.id, status: "payment_required", error: "Insufficient Firecrawl credits" });
            continue;
          }
          results.push({ id: product.id, status: "error", error: errText });
          continue;
        }

        const searchData = await searchResp.json();
        const searchResults = searchData.data || [];

        if (searchResults.length === 0) {
          results.push({ id: product.id, status: "no_results" });
          continue;
        }

        // Try to scrape the first result page for product images
        const targetUrl = searchResults[0].url;
        
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: targetUrl,
            formats: ["links"],
            onlyMainContent: true,
          }),
        });

        if (!scrapeResp.ok) {
          const errText = await scrapeResp.text();
          console.error(`Firecrawl scrape error:`, scrapeResp.status, errText);
          results.push({ id: product.id, status: "error", error: "Scrape failed" });
          continue;
        }

        const scrapeData = await scrapeResp.json();
        const links = scrapeData.data?.links || scrapeData.links || [];
        
        // Filter for image URLs
        const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        const imageUrls = links
          .filter((link: string) => {
            const lower = link.toLowerCase();
            return imageExtensions.some(ext => lower.includes(ext)) && 
                   !lower.includes("logo") && 
                   !lower.includes("icon") && 
                   !lower.includes("banner") &&
                   !lower.includes("sprite") &&
                   (lower.includes("product") || lower.includes("image") || lower.includes("media") || lower.includes("cdn"));
          })
          .slice(0, 3);

        if (imageUrls.length === 0) {
          // Fallback: use any large image URLs found
          const fallbackImages = links
            .filter((link: string) => {
              const lower = link.toLowerCase();
              return imageExtensions.some(ext => lower.endsWith(ext)) && !lower.includes("logo") && !lower.includes("icon");
            })
            .slice(0, 2);

          if (fallbackImages.length === 0) {
            results.push({ id: product.id, status: "no_images_found" });
            continue;
          }

          // Save fallback images
          for (let i = 0; i < fallbackImages.length; i++) {
            await supabase.from("product_images").insert({
              product_id: product.id,
              image_url: fallbackImages[i],
              sort_order: i,
            });
          }
          results.push({ id: product.id, status: "success", images: fallbackImages.length });
        } else {
          // Save found images
          for (let i = 0; i < imageUrls.length; i++) {
            await supabase.from("product_images").insert({
              product_id: product.id,
              image_url: imageUrls[i],
              sort_order: i,
            });
          }
          results.push({ id: product.id, status: "success", images: imageUrls.length });
        }

        // Small delay between products to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error finding images for ${product.id}:`, err);
        results.push({ id: product.id, status: "error", error: String(err) });
      }
    }

    const succeeded = results.filter(r => r.status === "success").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const failed = results.filter(r => r.status !== "success" && r.status !== "skipped").length;

    return new Response(
      JSON.stringify({ success: true, processed: results.length, succeeded, skipped, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("search-product-images error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

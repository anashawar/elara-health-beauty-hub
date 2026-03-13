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

    // Fetch products with brand info
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
      // Build multiple search queries for better coverage
      const queries = [
        `${product.title} ${brandName} product photo`,
        `${product.title} skincare beauty product`,
      ];

      try {
        const allImageUrls: string[] = [];

        for (const query of queries) {
          if (allImageUrls.length >= 5) break;

          // Use Firecrawl search with scrapeOptions to get page content
          const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              scrapeOptions: {
                formats: ["markdown", "links"],
                onlyMainContent: true,
              },
            }),
          });

          if (!searchResp.ok) {
            const errText = await searchResp.text();
            console.error(`Firecrawl search error for "${query}":`, searchResp.status, errText);
            if (searchResp.status === 402) {
              results.push({ id: product.id, status: "payment_required", error: "Insufficient Firecrawl credits" });
              break;
            }
            continue;
          }

          const searchData = await searchResp.json();
          const searchResults = searchData.data || [];

          // Extract image URLs from search results markdown and links
          for (const result of searchResults) {
            if (allImageUrls.length >= 5) break;

            // Extract from markdown content (![alt](url) patterns)
            const markdown = result.markdown || "";
            const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/gi;
            let match;
            while ((match = mdImageRegex.exec(markdown)) !== null) {
              const url = match[1];
              if (isValidProductImage(url, product.title)) {
                allImageUrls.push(url);
              }
            }

            // Extract from HTML img src patterns in markdown
            const imgSrcRegex = /src=["'](https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)[^\s"']*)/gi;
            while ((match = imgSrcRegex.exec(markdown)) !== null) {
              const url = match[1];
              if (isValidProductImage(url, product.title)) {
                allImageUrls.push(url);
              }
            }

            // Extract from links array
            const links = result.links || [];
            for (const link of links) {
              if (allImageUrls.length >= 5) break;
              if (typeof link === "string" && isValidProductImage(link, product.title)) {
                allImageUrls.push(link);
              }
            }
          }

          // Small delay between queries
          await new Promise(r => setTimeout(r, 300));
        }

        // Deduplicate
        const uniqueImages = [...new Set(allImageUrls)].slice(0, 5);

        if (uniqueImages.length === 0) {
          console.log(`No images found for "${product.title}"`);
          results.push({ id: product.id, status: "no_images_found" });
          continue;
        }

        // Save images
        for (let i = 0; i < uniqueImages.length; i++) {
          await supabase.from("product_images").insert({
            product_id: product.id,
            image_url: uniqueImages[i],
            sort_order: i,
          });
        }
        console.log(`Found ${uniqueImages.length} images for "${product.title}"`);
        results.push({ id: product.id, status: "success", images: uniqueImages.length });

        // Delay between products
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

function isValidProductImage(url: string, productTitle: string): boolean {
  const lower = url.toLowerCase();
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const hasImageExt = imageExtensions.some(ext => lower.includes(ext));
  if (!hasImageExt) return false;
  
  // Exclude common non-product images
  const excludePatterns = [
    "logo", "icon", "favicon", "banner", "sprite", "avatar",
    "placeholder", "loading", "pixel", "tracking", "badge",
    "flag", "arrow", "button", "social", "facebook", "twitter",
    "instagram", "youtube", "pinterest", "tiktok", "linkedin",
    "1x1", "spacer", "blank", "transparent", "ad-", "ads/",
    "widget", "thumb-small", "16x16", "32x32", "48x48",
  ];
  if (excludePatterns.some(p => lower.includes(p))) return false;
  
  // Prefer URLs that suggest product images
  const preferPatterns = [
    "product", "image", "media", "cdn", "photo", "upload",
    "static", "assets", "img", "gallery", "picture",
  ];
  const hasPreferred = preferPatterns.some(p => lower.includes(p));
  
  // Must be from a reasonable domain (not tiny images)
  const hasSizeIndicator = /\d{3,4}x\d{3,4}/.test(lower) || /w[_=]\d{3,4}/.test(lower) || /width[=:]\d{3,4}/.test(lower);
  
  return hasPreferred || hasSizeIndicator || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
}

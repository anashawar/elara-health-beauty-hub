import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Check if a URL is likely a high-quality product image */
function scoreImageUrl(url: string, productTitle: string, brandName: string): number {
  const lower = url.toLowerCase();
  const titleWords = productTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Instant reject: non-product images
  const rejectPatterns = [
    "logo", "icon", "favicon", "banner", "sprite", "avatar",
    "placeholder", "loading", "pixel", "tracking", "badge",
    "flag", "arrow", "button", "social", "facebook", "twitter",
    "instagram", "youtube", "pinterest", "tiktok", "linkedin",
    "1x1", "spacer", "blank", "transparent", "ad-", "ads/",
    "widget", "16x16", "32x32", "48x48", "64x64",
    "payment", "shipping", "cart", "checkout", "star", "rating",
    "review", "user", "profile", "author", "comment",
    "newsletter", "subscribe", "popup", "modal", "close",
    "menu", "nav", "header", "footer", "sidebar",
  ];
  if (rejectPatterns.some(p => lower.includes(p))) return -1;

  // Must have image extension
  if (!/\.(jpg|jpeg|png|webp)/i.test(lower)) return -1;

  let score = 0;

  // Bonus: URL contains product-related words from the title
  const matchedWords = titleWords.filter(w => lower.includes(w));
  score += matchedWords.length * 3;

  // Bonus: brand name in URL
  if (brandName && lower.includes(brandName.toLowerCase().replace(/\s+/g, ""))) score += 5;
  if (brandName && lower.includes(brandName.toLowerCase().replace(/\s+/g, "-"))) score += 5;

  // Bonus: comes from known e-commerce / CDN / product image domains
  const trustedDomains = [
    "cloudinary.com", "shopify.com", "cdn.shopify", "bigcommerce.com",
    "woocommerce.com", "magento", "amazonaws.com", "cloudfront.net",
    "scene7.com", "akamaized.net", "imgix.net", "fastly.net",
    "incipedia.com", "paulaschoice.com", "beautylish.com",
    "sephora.com", "ulta.com", "lookfantastic.com", "cultbeauty.com",
    "iherb.com", "dermstore.com", "skinstore.com", "cosdna.com",
    "notino.com", "notinoimg", "farfetch", "skroutz",
    "static.chemistwarehouse", "chemistwarehouse",
    "boots.com", "superdrug.com", "feelunique",
    "cdn.", "media.", "images.", "img.",
  ];
  if (trustedDomains.some(d => lower.includes(d))) score += 4;

  // Bonus: URL suggests product image path
  const productPaths = [
    "/product", "/products/", "/media/catalog/", "/image/", "/images/",
    "/photos/", "/gallery/", "/uploads/", "/assets/", "/p/",
  ];
  if (productPaths.some(p => lower.includes(p))) score += 3;

  // Bonus: high-res size indicators
  const highRes = /(\d{3,4})x(\d{3,4})/.exec(lower);
  if (highRes) {
    const w = parseInt(highRes[1]), h = parseInt(highRes[2]);
    if (w >= 400 && h >= 400) score += 4;
    if (w >= 800 && h >= 800) score += 2;
  }
  // Width params suggesting large images
  if (/w[_=]([5-9]\d{2}|[1-9]\d{3})/.test(lower)) score += 3;
  if (/width[=:]([5-9]\d{2}|[1-9]\d{3})/.test(lower)) score += 3;

  // Penalty: very small size indicators
  if (/(\d{1,2})x(\d{1,2})/.test(lower)) score -= 5;
  if (/thumb|_s\.|_xs\.|_sm\.|mini|tiny|small/i.test(lower)) score -= 4;

  return score;
}

/** Try to upgrade a URL to a higher resolution version */
function upgradeToHighRes(url: string): string {
  let upgraded = url;
  // Common thumbnail → full size patterns
  upgraded = upgraded.replace(/_(?:100x100|150x150|200x200|300x300|thumb|small|xs|sm|s)\./gi, ".");
  upgraded = upgraded.replace(/\/(?:thumb|small|thumbnail|xs|sm)\//, "/large/");
  upgraded = upgraded.replace(/[?&]w(?:idth)?=\d+/gi, "");
  upgraded = upgraded.replace(/[?&]h(?:eight)?=\d+/gi, "");
  // Shopify: try to get original size
  upgraded = upgraded.replace(/_\d+x\d*(\.\w+)$/, "$1");
  upgraded = upgraded.replace(/_\d+x(\.\w+)$/, "$1");
  return upgraded;
}

/** Verify an image URL is accessible and returns a reasonable size */
async function verifyImage(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!resp.ok) return false;
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return false;
    const contentLength = parseInt(resp.headers.get("content-length") || "0");
    // Reject images smaller than 5KB (likely thumbnails/placeholders)
    if (contentLength > 0 && contentLength < 5000) return false;
    return true;
  } catch {
    return false;
  }
}

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

    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, title, brands(name)")
      .in("id", product_ids);
    if (pErr) throw pErr;

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
      const fullName = `${brandName} ${product.title}`.trim();

      // Multiple targeted search queries
      const queries = [
        `"${fullName}" product image high resolution`,
        `${fullName} site:iherb.com OR site:lookfantastic.com OR site:notino.com OR site:amazon.com`,
        `${fullName} skincare product official photo`,
      ];

      try {
        const candidateImages: { url: string; score: number }[] = [];

        for (const query of queries) {
          if (candidateImages.length >= 15) break;

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

          for (const result of searchResults) {
            // Extract all image URLs from markdown
            const markdown = result.markdown || "";
            
            // Match markdown image syntax: ![alt](url)
            const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
            let match;
            while ((match = mdImageRegex.exec(markdown)) !== null) {
              const url = match[1];
              if (/\.(jpg|jpeg|png|webp)/i.test(url)) {
                const score = scoreImageUrl(url, product.title, brandName);
                if (score >= 0) {
                  candidateImages.push({ url: upgradeToHighRes(url), score });
                }
              }
            }

            // Extract from img src patterns
            const imgSrcRegex = /src=["'](https?:\/\/[^\s"']+)/gi;
            while ((match = imgSrcRegex.exec(markdown)) !== null) {
              const url = match[1];
              if (/\.(jpg|jpeg|png|webp)/i.test(url)) {
                const score = scoreImageUrl(url, product.title, brandName);
                if (score >= 0) {
                  candidateImages.push({ url: upgradeToHighRes(url), score });
                }
              }
            }

            // Extract from OG image / meta image references
            const ogRegex = /(?:og:image|twitter:image)[^"']*["'](https?:\/\/[^\s"']+)/gi;
            while ((match = ogRegex.exec(markdown)) !== null) {
              const url = match[1];
              const score = scoreImageUrl(url, product.title, brandName);
              if (score >= 0) {
                candidateImages.push({ url: upgradeToHighRes(url), score: score + 5 }); // OG images are usually high quality
              }
            }
          }

          await new Promise(r => setTimeout(r, 400));
        }

        // Sort by score descending, deduplicate
        candidateImages.sort((a, b) => b.score - a.score);
        const seen = new Set<string>();
        const topCandidates: string[] = [];
        for (const c of candidateImages) {
          // Normalize URL for dedup
          const normalized = c.url.split("?")[0].toLowerCase();
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          topCandidates.push(c.url);
          if (topCandidates.length >= 8) break; // Check up to 8 candidates to get 2-5 verified
        }

        // Verify images are accessible and reasonable size
        const verifiedImages: string[] = [];
        for (const url of topCandidates) {
          if (verifiedImages.length >= 5) break;
          const valid = await verifyImage(url);
          if (valid) {
            verifiedImages.push(url);
          }
        }

        if (verifiedImages.length === 0) {
          console.log(`No verified images found for "${product.title}"`);
          results.push({ id: product.id, status: "no_images_found" });
          continue;
        }

        // Save images
        for (let i = 0; i < verifiedImages.length; i++) {
          await supabase.from("product_images").insert({
            product_id: product.id,
            image_url: verifiedImages[i],
            sort_order: i,
          });
        }
        console.log(`Found ${verifiedImages.length} verified images for "${product.title}"`);
        results.push({ id: product.id, status: "success", images: verifiedImages.length });

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

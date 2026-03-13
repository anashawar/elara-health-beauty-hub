import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isJunkImage(url: string): boolean {
  const lower = url.toLowerCase();
  const reject = [
    "logo", "icon", "favicon", "banner", "sprite", "avatar",
    "placeholder", "loading", "pixel", "tracking", "badge",
    "flag", "arrow", "button", "social", "facebook", "twitter",
    "instagram", "youtube", "pinterest", "tiktok", "linkedin",
    "1x1", "spacer", "blank", "transparent", "ad-", "ads/",
    "widget", "16x16", "32x32", "48x48", "64x64",
    "payment", "shipping", "cart", "checkout", "star-", "rating",
    "review", "/user", "profile", "author", "comment",
    "newsletter", "subscribe", "popup", "modal", "close",
    "menu", "nav-", "/header", "/footer", "sidebar",
    ".gif", ".svg", "data:image",
  ];
  return reject.some(p => lower.includes(p));
}

function scoreImage(url: string, titleWords: string[], brandSlug: string, productVolume?: string): number {
  const lower = url.toLowerCase();
  if (isJunkImage(lower)) return -1;
  if (!/\.(jpg|jpeg|png|webp)/i.test(lower.split("?")[0])) return -1;

  // Reject images of different sizes/variants of the same product
  // e.g. if product is 200ml, reject URLs containing "100ml", "400ml", "50ml"
  if (productVolume) {
    const vol = productVolume.replace(/\s+/g, "");
    // Find all volume mentions in URL (e.g. "100ml", "400-ml", "50ml")
    const urlVolumes = lower.match(/(\d+)\s*-?\s*(ml|g|oz|mg)/gi) || [];
    for (const uv of urlVolumes) {
      const uvNorm = uv.replace(/[\s-]/g, "").toLowerCase();
      const prodNorm = vol.toLowerCase();
      // If the URL mentions a volume and it doesn't match, reject
      if (uvNorm !== prodNorm && !lower.includes(prodNorm)) {
        return -1;
      }
    }
  }

  let score = 1; // base score for valid image

  // Brand in URL
  if (brandSlug && brandSlug.length > 2 && lower.includes(brandSlug)) score += 8;

  // Title words in URL
  const matched = titleWords.filter(w => w.length > 3 && lower.includes(w));
  score += matched.length * 4;

  // Trusted product image domains
  const trusted = [
    "cloudinary", "shopify", "cdn.shopify", "scene7", "akamaized",
    "imgix", "fastly", "amazonaws", "cloudfront",
    "iherb", "lookfantastic", "notino", "notinoimg", "sephora",
    "ulta", "cultbeauty", "dermstore", "skinstore",
    "chemistwarehouse", "boots.com", "superdrug",
    "feelunique", "beautybay", "caretobeauty",
    "amazon", "media-amazon", "images-na.ssl-images-amazon",
  ];
  if (trusted.some(d => lower.includes(d))) score += 6;

  // Product path patterns
  if (/\/product|\/media\/catalog|\/image\/product|\/p\//i.test(lower)) score += 5;

  // High-res indicators
  const sizeMatch = /(\d{3,4})x(\d{3,4})/.exec(lower);
  if (sizeMatch) {
    const w = parseInt(sizeMatch[1]), h = parseInt(sizeMatch[2]);
    if (w >= 400 && h >= 400) score += 4;
    if (w >= 800 && h >= 800) score += 3;
  }

  // Low-res penalty
  if (/_thumb|_xs\.|_sm\.|\/thumb\/|\/small\/|_50x|_75x|_100x|_150x/i.test(lower)) score -= 8;

  // Boost: white/clean background indicators (common in e-commerce product shots)
  if (/white|clean|studio|packshot|_1\./i.test(lower)) score += 3;

  // Boost: first/main product image (usually _1 or _01)
  if (/[_-](1|01)\.\w+$/.test(lower)) score += 4;

  return score;
}

function upgradeToHighRes(url: string): string {
  let u = url;
  u = u.replace(/_(?:100x100|150x150|200x200|300x300|thumb|small|xs|sm|s)\./gi, ".");
  u = u.replace(/\/(?:thumb|small|thumbnail|xs|sm)\//, "/large/");
  u = u.replace(/_\d+x\d*(\.\w+)$/, "$1");
  return u;
}

async function verifyImage(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!resp.ok) return false;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return false;
    const size = parseInt(resp.headers.get("content-length") || "0");
    if (size > 0 && size < 10000) return false; // Reject < 10KB
    return true;
  } catch {
    return false;
  }
}

/** Extract image URLs from markdown content */
function extractImagesFromMarkdown(markdown: string): string[] {
  const images: string[] = [];

  // ![alt](url)
  const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
  let m;
  while ((m = mdRegex.exec(markdown)) !== null) images.push(m[1]);

  // Bare image URLs
  const urlRegex = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?)/gi;
  while ((m = urlRegex.exec(markdown)) !== null) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  return images;
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
    if (!product_ids?.length) throw new Error("product_ids array is required");

    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, title, brands(name), volume_ml, volume_unit, form")
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
      const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const titleWords = product.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const fullName = `${brandName} ${product.title}`.trim();
      const volumeStr = (product as any).volume_ml ? `${(product as any).volume_ml}${(product as any).volume_unit || "ml"}` : undefined;

      // Multiple search strategies — first query targets white background product shots
      const searchQueries = [
        `"${fullName}" product white background`,
        `${fullName} site:lookfantastic.com OR site:notino.com OR site:caretobeauty.com OR site:iherb.com`,
        `${fullName} site:amazon.com OR site:sephora.com OR site:beautybay.com OR site:boots.com`,
      ];

      try {
        const candidates: { url: string; score: number }[] = [];
        let paymentRequired = false;

        for (const query of searchQueries) {
          if (candidates.length >= 20 || paymentRequired) break;

          console.log(`Searching: ${query}`);
          const resp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              scrapeOptions: {
                formats: ["markdown"],
                onlyMainContent: true,
                waitFor: 1500,
              },
            }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            console.error(`Search error: ${resp.status} ${errText}`);
            if (resp.status === 402) { paymentRequired = true; break; }
            continue;
          }

          const data = await resp.json();
          const searchResults = data.data || [];

          for (const result of searchResults) {
            const md = result.markdown || "";
            const pageImages = extractImagesFromMarkdown(md);

            // Also check metadata for images
            if (result.metadata?.ogImage) pageImages.unshift(result.metadata.ogImage);

            for (const imgUrl of pageImages) {
              if (!imgUrl.startsWith("http")) continue;
              const score = scoreImage(imgUrl, titleWords, brandSlug, volumeStr);
              if (score > 0) {
                candidates.push({ url: upgradeToHighRes(imgUrl), score });
              }
            }
          }

          await new Promise(r => setTimeout(r, 500));
        }

        if (paymentRequired) {
          results.push({ id: product.id, status: "payment_required" });
          continue;
        }

        // Sort, deduplicate aggressively — only keep genuinely different images
        candidates.sort((a, b) => b.score - a.score);
        const seen = new Set<string>();
        const uniqueCandidates: string[] = [];

        for (const c of candidates) {
          // Extract base filename for aggressive dedup
          const urlPath = c.url.split("?")[0].toLowerCase().replace(/\/+$/, "");
          // Get the core filename without size/CDN params
          const filename = urlPath.split("/").pop() || "";
          // Strip size suffixes: _2, _1, dimensions like 1600x1600
          const baseFile = filename
            .replace(/\.\w+$/, "")                    // remove extension
            .replace(/_\d+$/, "")                      // remove trailing _N
            .replace(/[-_]\d{3,4}x\d{3,4}/g, "")     // remove dimensions
            .replace(/[-_](large|medium|small|xl|xxl)/gi, ""); // remove size labels

          // Skip if we already have an image with the same base filename
          if (seen.has(baseFile)) {
            console.log(`⊘ Duplicate base "${baseFile}": ${c.url}`);
            continue;
          }
          // Also skip if URL path (without query) is identical
          if (seen.has(urlPath)) continue;

          seen.add(baseFile);
          seen.add(urlPath);
          uniqueCandidates.push(c.url);
          if (uniqueCandidates.length >= 12) break;
        }

        console.log(`${uniqueCandidates.length} unique candidates for "${fullName}"`);

        // Verify accessibility and quality
        const verified: string[] = [];
        for (const url of uniqueCandidates) {
          if (verified.length >= 4) break;
          const ok = await verifyImage(url);
          if (ok) {
            console.log(`✓ ${url}`);
            verified.push(url);
          } else {
            console.log(`✗ ${url}`);
          }
        }

        if (verified.length === 0) {
          console.log(`No images found for "${fullName}"`);
          results.push({ id: product.id, status: "no_images_found" });
          continue;
        }

        for (let i = 0; i < verified.length; i++) {
          await supabase.from("product_images").insert({
            product_id: product.id,
            image_url: verified[i],
            sort_order: i,
          });
        }
        console.log(`✓ Saved ${verified.length} images for "${fullName}"`);
        results.push({ id: product.id, status: "success", images: verified.length });

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error for ${product.id}:`, err);
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

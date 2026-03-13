import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Reject non-product images by URL pattern */
function isJunkImage(url: string): boolean {
  const lower = url.toLowerCase();
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
    "thumb", "_xs.", "_sm.", "mini", "tiny", "/small/",
    "gif", ".svg",
  ];
  return rejectPatterns.some(p => lower.includes(p));
}

/** Check if URL looks like a product image */
function scoreImageUrl(url: string, titleWords: string[], brandSlug: string): number {
  const lower = url.toLowerCase();
  if (isJunkImage(lower)) return -1;
  if (!/\.(jpg|jpeg|png|webp)/i.test(lower.split("?")[0])) return -1;

  let score = 0;

  // Brand in URL
  if (brandSlug && lower.includes(brandSlug)) score += 6;

  // Product title words in URL
  const matched = titleWords.filter(w => lower.includes(w));
  score += matched.length * 3;

  // Trusted e-commerce domains
  const trusted = [
    "cloudinary", "shopify", "cdn.shopify", "scene7", "akamaized",
    "imgix", "fastly", "amazonaws", "cloudfront",
    "iherb", "lookfantastic", "notino", "notinoimg", "sephora",
    "ulta", "cultbeauty", "dermstore", "skinstore",
    "chemistwarehouse", "boots.com", "superdrug",
    "feelunique", "beautybay", "caretobeauty", "cocooncenter",
    "farmacias", "pharmacyonline", "amazon", "ebay",
  ];
  if (trusted.some(d => lower.includes(d))) score += 5;

  // Product image path patterns
  const productPaths = ["/product", "/media/catalog/", "/image/product", "/p/", "/images/product"];
  if (productPaths.some(p => lower.includes(p))) score += 4;

  // High-res indicators
  if (/(\d{3,4})x(\d{3,4})/.exec(lower)) {
    const m = /(\d{3,4})x(\d{3,4})/.exec(lower)!;
    const w = parseInt(m[1]), h = parseInt(m[2]);
    if (w >= 500 && h >= 500) score += 5;
  }
  if (/w[_=]([5-9]\d{2}|[1-9]\d{3})/.test(lower)) score += 3;

  // Low-res penalty
  if (/(\d{1,2})x(\d{1,2})[^0-9]/.test(lower)) score -= 5;

  return score;
}

/** Upgrade thumbnail URLs to full-size */
function upgradeToHighRes(url: string): string {
  let u = url;
  u = u.replace(/_(?:100x100|150x150|200x200|300x300|thumb|small|xs|sm|s)\./gi, ".");
  u = u.replace(/\/(?:thumb|small|thumbnail|xs|sm)\//, "/large/");
  u = u.replace(/_\d+x\d*(\.\w+)$/, "$1");
  u = u.replace(/_\d+x(\.\w+)$/, "$1");
  return u;
}

/** Verify image URL is accessible and large enough for quality */
async function verifyImage(url: string): Promise<{ ok: boolean; size: number }> {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!resp.ok) return { ok: false, size: 0 };
    const ct = resp.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return { ok: false, size: 0 };
    const size = parseInt(resp.headers.get("content-length") || "0");
    // Reject images smaller than 15KB (likely thumbnails/placeholders/blurry)
    if (size > 0 && size < 15000) return { ok: false, size };
    return { ok: true, size };
  } catch {
    return { ok: false, size: 0 };
  }
}

/** Extract image URLs from HTML content */
function extractImagesFromHtml(html: string): string[] {
  const images: string[] = [];
  // OG image (highest priority - always the main product photo)
  const ogMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image/i);
  if (ogMatch) images.push(ogMatch[1]);

  // Twitter image
  const twMatch = html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)/i)
    || html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:image/i);
  if (twMatch) images.push(twMatch[1]);

  // Product structured data (JSON-LD)
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const extractImages = (obj: any) => {
        if (!obj) return;
        if (obj.image) {
          const imgs = Array.isArray(obj.image) ? obj.image : [obj.image];
          for (const img of imgs) {
            if (typeof img === "string") images.push(img);
            else if (img?.url) images.push(img.url);
          }
        }
        if (Array.isArray(obj)) obj.forEach(extractImages);
        if (obj["@graph"]) extractImages(obj["@graph"]);
      };
      extractImages(data);
    } catch { /* ignore */ }
  }

  // Large img tags (with product-like src)
  const imgRegex = /<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp)[^"']*)/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
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
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      throw new Error("product_ids array is required");
    }

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

      // Build a precise product identifier for search
      const productFullName = `${brandName} ${product.title}`.trim();

      // Strategy: Search for the product on known retailer sites, then SCRAPE the actual product page
      const searchQueries = [
        `${productFullName} site:iherb.com OR site:lookfantastic.com OR site:notino.com OR site:sephora.com`,
        `"${productFullName}" product`,
        `${productFullName} site:amazon.com OR site:boots.com OR site:cultbeauty.com OR site:beautybay.com`,
      ];

      try {
        const collectedImages: { url: string; score: number; source: string }[] = [];

        for (const query of searchQueries) {
          if (collectedImages.length >= 6) break;

          // Step 1: Search to find product page URLs
          const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 3,
            }),
          });

          if (!searchResp.ok) {
            const errText = await searchResp.text();
            console.error(`Search error:`, searchResp.status, errText);
            if (searchResp.status === 402) {
              results.push({ id: product.id, status: "payment_required" });
              break;
            }
            continue;
          }

          const searchData = await searchResp.json();
          const searchResults = searchData.data || [];

          // Step 2: Scrape the top result pages to get their actual product images
          for (const result of searchResults.slice(0, 2)) {
            const pageUrl = result.url;
            if (!pageUrl) continue;

            try {
              const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: pageUrl,
                  formats: ["html"],
                  onlyMainContent: false, // Need full page for OG tags and structured data
                  waitFor: 2000, // Wait for images to load
                }),
              });

              if (!scrapeResp.ok) {
                await scrapeResp.text(); // consume body
                continue;
              }

              const scrapeData = await scrapeResp.json();
              const html = scrapeData.data?.html || scrapeData.html || "";

              if (!html) continue;

              // Extract all image candidates from the scraped HTML
              const pageImages = extractImagesFromHtml(html);

              for (const imgUrl of pageImages) {
                if (!imgUrl.startsWith("http")) continue;
                const score = scoreImageUrl(imgUrl, titleWords, brandSlug);
                if (score >= 0) {
                  collectedImages.push({
                    url: upgradeToHighRes(imgUrl),
                    score: score + (pageImages.indexOf(imgUrl) < 3 ? 8 : 0), // Boost OG/structured data images (first extracted)
                    source: pageUrl,
                  });
                }
              }
            } catch (scrapeErr) {
              console.error(`Scrape error for ${pageUrl}:`, scrapeErr);
            }

            await new Promise(r => setTimeout(r, 300));
          }

          await new Promise(r => setTimeout(r, 400));
        }

        // Sort by score, deduplicate, verify
        collectedImages.sort((a, b) => b.score - a.score);
        const seen = new Set<string>();
        const candidates: string[] = [];
        for (const c of collectedImages) {
          const normalized = c.url.split("?")[0].toLowerCase().replace(/\/+$/, "");
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          candidates.push(c.url);
          if (candidates.length >= 10) break;
        }

        // Verify: accessible, good size, not blurry thumbnails
        const verifiedImages: string[] = [];
        for (const url of candidates) {
          if (verifiedImages.length >= 4) break;
          const result = await verifyImage(url);
          if (result.ok) {
            console.log(`✓ Verified: ${url} (${result.size} bytes)`);
            verifiedImages.push(url);
          } else {
            console.log(`✗ Rejected: ${url} (${result.size} bytes)`);
          }
        }

        if (verifiedImages.length === 0) {
          console.log(`No verified images found for "${product.title}"`);
          results.push({ id: product.id, status: "no_images_found" });
          continue;
        }

        // Save images to DB
        for (let i = 0; i < verifiedImages.length; i++) {
          await supabase.from("product_images").insert({
            product_id: product.id,
            image_url: verifiedImages[i],
            sort_order: i,
          });
        }
        console.log(`Saved ${verifiedImages.length} images for "${product.title}"`);
        results.push({ id: product.id, status: "success", images: verifiedImages.length });

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

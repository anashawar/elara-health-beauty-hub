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
    "blog", "article", "editorial", "lifestyle", "category-",
    "collection-", "best-", "top-", "how-to",
    "swatch", "color-", "shade-", "related", "recommend",
    "similar", "also-", "you-may", "recently",
  ];
  return reject.some(p => lower.includes(p));
}

function scoreImage(url: string, titleWords: string[], brandSlug: string, productVolume?: string): number {
  const lower = url.toLowerCase();
  if (isJunkImage(lower)) return -1;
  if (!/\.(jpg|jpeg|png|webp)/i.test(lower.split("?")[0])) return -1;

  // Reject images of different sizes/variants
  if (productVolume) {
    const vol = productVolume.replace(/\s+/g, "");
    const urlVolumes = lower.match(/(\d+)\s*-?\s*(ml|g|oz|mg)/gi) || [];
    for (const uv of urlVolumes) {
      const uvNorm = uv.replace(/[\s-]/g, "").toLowerCase();
      const prodNorm = vol.toLowerCase();
      if (uvNorm !== prodNorm && !lower.includes(prodNorm)) {
        return -1;
      }
    }
  }

  let score = 1;

  // Brand in URL — strong signal
  if (brandSlug && brandSlug.length > 2 && lower.includes(brandSlug)) score += 8;

  // Title words in URL — each matching word is a signal
  const matched = titleWords.filter(w => w.length > 3 && lower.includes(w));
  score += matched.length * 3;

  // Bonus: many title words matched = very likely correct product
  if (matched.length >= 3) score += 10;

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

  // Boost: white/clean background indicators
  if (/white|clean|studio|packshot|_1\./i.test(lower)) score += 3;

  // Boost: first/main product image
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
  const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
  let m;
  while ((m = mdRegex.exec(markdown)) !== null) images.push(m[1]);
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
      
      // Remove duplicate brand name from title if it starts with the brand
      let cleanTitle = product.title;
      if (brandName && cleanTitle.toLowerCase().startsWith(brandName.toLowerCase())) {
        cleanTitle = cleanTitle.slice(brandName.length).trim();
      }
      
      const titleWords = `${brandName} ${cleanTitle}`.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const fullName = `${brandName} ${cleanTitle}`.trim();
      const volumeStr = (product as any).volume_ml ? `${(product as any).volume_ml}${(product as any).volume_unit || "ml"}` : undefined;

      // Search queries — try product retailer sites first, then general
      const searchQueries = [
        `${fullName} site:lookfantastic.com OR site:notino.com OR site:caretobeauty.com OR site:iherb.com OR site:sephora.com OR site:amazon.com`,
        `${fullName} product${volumeStr ? ` ${volumeStr}` : ""}`,
      ];

      try {
        const candidates: { url: string; score: number }[] = [];
        let paymentRequired = false;

        for (const query of searchQueries) {
          // Stop as soon as we have good candidates
          if (candidates.filter(c => c.score >= 10).length >= 3 || paymentRequired) break;

          console.log(`Searching: ${query}`);
          const resp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 3,
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

        // Sort by score descending — pick only the BEST single image
        candidates.sort((a, b) => b.score - a.score);

        // Deduplicate
        const seen = new Set<string>();
        const uniqueCandidates: string[] = [];
        for (const c of candidates) {
          const urlPath = c.url.split("?")[0].toLowerCase().replace(/\/+$/, "");
          if (seen.has(urlPath)) continue;
          seen.add(urlPath);
          uniqueCandidates.push(c.url);
          if (uniqueCandidates.length >= 5) break; // Keep 5 candidates to verify, but only save 1
        }

        console.log(`${uniqueCandidates.length} unique candidates for "${fullName}" (top score: ${candidates[0]?.score || 0})`);

        // Minimum score threshold — only accept high-confidence matches
        const topScore = candidates[0]?.score || 0;
        if (topScore < 5) {
          console.log(`⚠ Top score ${topScore} too low for "${fullName}" — skipping to avoid wrong image`);
          results.push({ id: product.id, status: "no_confident_match", topScore });
          continue;
        }

        // Verify and save ONLY the single best image
        let savedUrl: string | null = null;
        for (const url of uniqueCandidates) {
          const ok = await verifyImage(url);
          if (ok) {
            console.log(`✓ Best image: ${url} (score: ${candidates.find(c => c.url === url)?.score})`);
            savedUrl = url;
            break;
          } else {
            console.log(`✗ Failed verification: ${url}`);
          }
        }

        if (!savedUrl) {
          console.log(`No verified images for "${fullName}"`);
          results.push({ id: product.id, status: "no_images_found" });
          continue;
        }

        await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: savedUrl,
          sort_order: 0,
        });

        console.log(`✓ Saved 1 image for "${fullName}"`);
        results.push({ id: product.id, status: "success", images: 1, url: savedUrl });

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

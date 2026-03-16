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
    "store-locator", "reward", "loyalty", "gift-card",
  ];
  return reject.some(p => lower.includes(p));
}

function scoreImage(url: string, titleWords: string[], brandSlug: string, productVolume?: string): number {
  const lower = url.toLowerCase();
  if (isJunkImage(lower)) return -1;
  
  // Accept common image formats
  const path = lower.split("?")[0];
  if (!/\.(jpg|jpeg|png|webp)/i.test(path)) return -1;

  let score = 1;

  // Brand in URL — strong signal
  if (brandSlug && brandSlug.length > 2 && lower.includes(brandSlug)) score += 6;

  // Title words in URL — each matching word is a signal
  const matched = titleWords.filter(w => w.length > 3 && lower.includes(w));
  score += matched.length * 2;

  // Bonus: many title words matched
  if (matched.length >= 3) score += 8;
  if (matched.length >= 2) score += 3;

  // Trusted product image CDNs/domains
  const trusted = [
    "cloudinary", "shopify", "cdn.shopify", "scene7", "akamaized",
    "imgix", "fastly", "amazonaws", "cloudfront",
    "iherb", "lookfantastic", "notino", "notinoimg", "sephora",
    "ulta", "cultbeauty", "dermstore", "skinstore",
    "chemistwarehouse", "boots.com", "superdrug",
    "feelunique", "beautybay", "caretobeauty",
    "amazon", "media-amazon", "images-na.ssl-images-amazon",
    "fragrancex", "fragrancenet", "perfumetrader",
    "douglas", "niche-beauty", "parfumdreams",
    "incidecoder", "beautylish", "sokoglam",
    "yesstyle", "stylevana", "jolse",
    "static.thcdn", "images.asos", "cdn-images",
  ];
  if (trusted.some(d => lower.includes(d))) score += 5;

  // Product path patterns
  if (/\/product|\/media\/catalog|\/image\/product|\/p\/|\/dp\//i.test(lower)) score += 4;

  // High-res indicators
  const sizeMatch = /(\d{3,4})x(\d{3,4})/.exec(lower);
  if (sizeMatch) {
    const w = parseInt(sizeMatch[1]), h = parseInt(sizeMatch[2]);
    if (w >= 400 && h >= 400) score += 3;
    if (w >= 800 && h >= 800) score += 2;
  }

  // Low-res penalty
  if (/_thumb|_xs\.|_sm\.|\/thumb\/|\/small\/|_50x|_75x|_100x|_150x/i.test(lower)) score -= 6;

  // Boost: white/clean background indicators
  if (/white|clean|studio|packshot|_1\./i.test(lower)) score += 2;

  // Boost: first/main product image
  if (/[_-](1|01)\.\w+$/.test(lower)) score += 3;

  return score;
}

function upgradeToHighRes(url: string): string {
  let u = url;
  u = u.replace(/_(?:100x100|150x150|200x200|300x300|thumb|small|xs|sm|s)\./gi, ".");
  u = u.replace(/\/(?:thumb|small|thumbnail|xs|sm)\//, "/large/");
  u = u.replace(/_\d+x\d*(\.\w+)$/, "$1");
  return u;
}

function isProbablyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|avif)(?:$|\?)/i.test(url);
}

async function isUsableImageResponse(resp: Response, url: string): Promise<boolean> {
  if (!resp.ok) return false;

  const contentType = (resp.headers.get("content-type") || "").toLowerCase();
  const contentLength = parseInt(resp.headers.get("content-length") || "0");
  const contentRange = resp.headers.get("content-range") || "";
  const totalFromRange = parseInt(contentRange.match(/\/(\d+)$/)?.[1] || "0");
  const totalSize = totalFromRange || contentLength;

  if (!contentType.startsWith("image/") && !isProbablyImageUrl(url)) return false;
  if (totalSize > 0 && totalSize < 5000) return false;

  return true;
}

async function verifyImage(url: string): Promise<boolean> {
  const attempts: RequestInit[] = [
    { method: "HEAD", redirect: "follow" },
    {
      method: "GET",
      redirect: "follow",
      headers: {
        Range: "bytes=0-8191",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    },
  ];

  for (const attempt of attempts) {
    try {
      const resp = await fetch(url, attempt);
      if (await isUsableImageResponse(resp, url)) return true;
    } catch {
      // Try the next verification strategy.
    }
  }

  return false;
}

/** Extract image URLs from markdown content */
function extractImagesFromMarkdown(markdown: string): string[] {
  const images: string[] = [];
  const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
  let m;
  while ((m = mdRegex.exec(markdown)) !== null) images.push(m[1]);

  const urlRegex = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|avif)(\?[^\s"'<>]*)?)/gi;
  while ((m = urlRegex.exec(markdown)) !== null) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  const srcRegex = /src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp|avif)[^"']*)/gi;
  while ((m = srcRegex.exec(markdown)) !== null) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  return images;
}

function flattenPossibleUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenPossibleUrls);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(flattenPossibleUrls);
  }
  return [];
}

function extractImagesFromSearchResult(result: any): string[] {
  const payload = result?.data ?? result ?? {};
  const markdown = typeof payload.markdown === "string" ? payload.markdown : "";

  const urls = [
    ...flattenPossibleUrls(payload.metadata?.ogImage),
    ...flattenPossibleUrls(payload.metadata?.image),
    ...flattenPossibleUrls(payload.metadata?.images),
    ...extractImagesFromMarkdown(markdown),
  ];

  return Array.from(new Set(urls.filter((url): url is string => typeof url === "string" && url.startsWith("http"))));
}

/** Generate multiple search query variations for better coverage */
function buildSearchQueries(brandName: string, title: string, volumeStr?: string): string[] {
  const fullName = `${brandName} ${title}`.trim();
  const queries: string[] = [];

  queries.push(`${fullName} product image`);
  queries.push(`${fullName} site:lookfantastic.com OR site:notino.com OR site:iherb.com OR site:sephora.com`);

  if (volumeStr) {
    queries.push(`${fullName} ${volumeStr}`);
  }

  const words = title.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
  if (words.length >= 2 && brandName) {
    queries.push(`${brandName} ${words.join(" ")}`);
  }

  queries.push(`${fullName} site:amazon.com OR site:ebay.com`);

  return queries;
}

Deno.serve(async (req) => {
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
      
      // Clean title: remove brand prefix if present
      let cleanTitle = product.title;
      if (brandName && cleanTitle.toLowerCase().startsWith(brandName.toLowerCase())) {
        cleanTitle = cleanTitle.slice(brandName.length).trim();
      }
      
      const titleWords = `${brandName} ${cleanTitle}`.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const fullName = `${brandName} ${cleanTitle}`.trim();
      const volumeStr = (product as any).volume_ml ? `${(product as any).volume_ml}${(product as any).volume_unit || "ml"}` : undefined;

      const searchQueries = buildSearchQueries(brandName, cleanTitle, volumeStr);

      try {
        const candidates: { url: string; score: number }[] = [];
        let paymentRequired = false;
        let queriesUsed = 0;
        const MAX_QUERIES = 4; // Try up to 4 query variations

        for (const query of searchQueries) {
          // Stop once we have a good candidate or hit query limit
          if (candidates.filter(c => c.score >= 8).length >= 2 || paymentRequired) break;
          if (queriesUsed >= MAX_QUERIES) break;
          queriesUsed++;

          console.log(`[${product.id.slice(0,8)}] Query: ${query.slice(0, 80)}...`);
          
          const resp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5, // More results per query
              scrapeOptions: {
                formats: ["markdown"],
                onlyMainContent: true,
                waitFor: 2000,
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
            const pageImages = extractImagesFromSearchResult(result);

            for (const rawImgUrl of pageImages) {
              const imgUrl = upgradeToHighRes(rawImgUrl);
              if (!imgUrl.startsWith("http")) continue;

              const score = scoreImage(imgUrl, titleWords, brandSlug, volumeStr);
              if (score > 0) {
                candidates.push({ url: imgUrl, score });
              }
            }
          }

          // Small delay between queries to be respectful
          await new Promise(r => setTimeout(r, 300));
        }

        if (paymentRequired) {
          results.push({ id: product.id, status: "payment_required" });
          continue;
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        // Deduplicate
        const seen = new Set<string>();
        const uniqueCandidates: { url: string; score: number }[] = [];
        for (const c of candidates) {
          const urlPath = c.url.split("?")[0].toLowerCase().replace(/\/+$/, "");
          if (seen.has(urlPath)) continue;
          seen.add(urlPath);
          uniqueCandidates.push(c);
          if (uniqueCandidates.length >= 8) break;
        }

        const topScore = uniqueCandidates[0]?.score || 0;
        console.log(`[${product.id.slice(0,8)}] "${fullName}" → ${uniqueCandidates.length} candidates, top score: ${topScore}`);

        // Accept images with score >= 3 (more permissive)
        if (topScore < 3) {
          console.log(`[${product.id.slice(0,8)}] ⚠ Score too low (${topScore}) — skipping`);
          results.push({ id: product.id, status: "no_confident_match", topScore, title: fullName });
          continue;
        }

        // Verify and save the best image
        let savedUrl: string | null = null;
        for (const c of uniqueCandidates) {
          if (c.score < 3) break; // Don't bother verifying low-score images
          const ok = await verifyImage(c.url);
          if (ok) {
            savedUrl = c.url;
            console.log(`[${product.id.slice(0,8)}] ✓ Saved: ${c.url} (score: ${c.score})`);
            break;
          } else {
            console.log(`[${product.id.slice(0,8)}] ✗ Verify failed: ${c.url}`);
          }
        }

        if (!savedUrl) {
          console.log(`[${product.id.slice(0,8)}] No verified images for "${fullName}"`);
          results.push({ id: product.id, status: "no_images_found", title: fullName });
          continue;
        }

        await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: savedUrl,
          sort_order: 0,
        });

        results.push({ id: product.id, status: "success", images: 1, url: savedUrl, title: fullName });

        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error(`Error for ${product.id}:`, err);
        results.push({ id: product.id, status: "error", error: String(err), title: fullName });
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

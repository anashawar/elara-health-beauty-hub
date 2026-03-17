import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERPER_API_URL = "https://google.serper.dev/images";
const MAX_QUERIES = 3;
const MAX_IMAGES_PER_QUERY = 10;
const MIN_SCORE = 8;
const DISCOVERY_PAGE_SIZE = 40;
const QUERY_RETRIES = 3;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

type CandidateImage = {
  url: string;
  thumbnailUrl: string;
  source: string;
  domain: string;
  title: string;
  width: number;
  height: number;
  score: number;
  link: string;
};

type ProductRecord = {
  id: string;
  title: string;
  volume_ml?: string | null;
  volume_unit?: string | null;
  brands?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(label: string, fn: () => Promise<T>, retries = QUERY_RETRIES): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`${label} failed (attempt ${attempt + 1}/${retries}):`, error);
      if (attempt < retries - 1) {
        await sleep(300 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

function normalizeText(input: string): string {
  return input.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompact(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stripQueryAndHash(url: string): string {
  return url.split("#")[0].split("?")[0];
}

function isProbablyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|avif)(?:$|\?)/i.test(url);
}

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
    "data:image", "hero-banner", "homepage-banner", "home-banner",
    "collection_pages", "lookbook", "lifestyle", "editorial",
    "whatsapp", "gift-card", "swatch", "shade",
  ];
  return reject.some((pattern) => lower.includes(pattern));
}

const TRUSTED_DOMAINS = [
  "sephora.com", "ulta.com", "lookfantastic.com", "notino.com",
  "iherb.com", "boots.com", "superdrug.com", "beautybay.com",
  "cultbeauty.com", "dermstore.com", "skinstore.com", "amazon.com",
  "caretobeauty.com", "fragrancex.com", "fragrancenet.com",
  "douglas.de", "beautylish.com", "yesstyle.com", "stylevana.com",
  "jolse.com", "nykaa.com", "target.com", "walmart.com",
  "macys.com", "nordstrom.com", "saksfifthavenue.com",
  "chemistwarehouse.com.au", "adorebeauty.com.au",
  "spacenk.com", "feelunique.com", "cocooncenter.com",
  "farfetch.com", "selfridges.com", "harrods.com",
];

const TRUSTED_CDNS = [
  "cloudinary", "shopify", "cdn.shopify", "scene7", "akamaized",
  "imgix", "fastly", "amazonaws", "cloudfront", "images.ctfassets.net",
  "static.thcdn", "media-amazon", "images-na.ssl-images-amazon",
  "notinoimg", "sdcdn.io",
];

function scoreCandidate(
  image: { imageUrl: string; source: string; domain: string; title: string; imageWidth: number; imageHeight: number; link: string },
  titleWords: string[],
  brandSlug: string,
  fullName: string,
  volumeStr?: string,
): number {
  const url = image.imageUrl.toLowerCase();
  const domain = (image.domain || "").toLowerCase();
  const imgTitle = (image.title || "").toLowerCase();
  const pageUrl = (image.link || "").toLowerCase();

  if (isJunkImage(url)) return -1;

  let score = 0;

  if (brandSlug && (normalizeCompact(imgTitle).includes(brandSlug) || normalizeCompact(url).includes(brandSlug))) {
    score += 8;
  }

  const normalizedTitle = normalizeText(imgTitle);
  const matchedInTitle = titleWords.filter((w) => normalizedTitle.includes(w));
  score += matchedInTitle.length * 3;
  if (matchedInTitle.length >= 4) score += 10;
  else if (matchedInTitle.length >= 3) score += 6;
  else if (matchedInTitle.length >= 2) score += 3;

  const normalizedFullName = normalizeText(fullName);
  if (normalizedTitle.includes(normalizedFullName)) score += 12;

  const urlPath = normalizeCompact(stripQueryAndHash(url));
  const matchedInUrl = titleWords.filter((w) => urlPath.includes(w));
  score += matchedInUrl.length * 2;

  if (volumeStr) {
    const compactVolume = normalizeCompact(volumeStr);
    if (normalizeCompact(imgTitle).includes(compactVolume) || urlPath.includes(compactVolume)) {
      score += 4;
    }
  }

  if (TRUSTED_DOMAINS.some((d) => domain.includes(d) || pageUrl.includes(d))) {
    score += 6;
  }

  if (TRUSTED_CDNS.some((cdn) => url.includes(cdn))) {
    score += 4;
  }

  if (/\/product|\/products|\/p\/|\/dp\/|sku|item/i.test(pageUrl)) score += 4;
  if (/\/product|\/products|\/catalog|\/media|\/image/i.test(url)) score += 3;

  if (/white|clean|studio|packshot|front|primary|main|hero|default/i.test(url)) score += 2;

  if (image.imageWidth > 0 && image.imageHeight > 0) {
    const ratio = image.imageWidth / image.imageHeight;
    if (ratio >= 0.7 && ratio <= 1.4) score += 3;
    if (image.imageWidth >= 400) score += 2;
    if (image.imageWidth >= 800) score += 2;
  }

  if (/(_thumb|_xs\.|_sm\.|\/thumb\/|\/small\/|_50x|_75x|_100x|_150x)/i.test(url)) score -= 6;
  if (/blog|article|review|compare|best|top|collection|category|search|wishlist|news/i.test(pageUrl)) score -= 5;

  return score;
}

function buildSearchQueries(brandName: string, title: string, volumeStr?: string): string[] {
  const fullName = `${brandName} ${title}`.trim();
  const queries = [
    `${fullName} product`,
    fullName,
    volumeStr ? `${fullName} ${volumeStr}` : `${brandName} ${title.split(/\s+/).slice(0, 4).join(" ")}`,
  ].filter(Boolean);
  return Array.from(new Set(queries)).slice(0, MAX_QUERIES);
}

async function searchImages(apiKey: string, query: string): Promise<any[]> {
  const resp = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: MAX_IMAGES_PER_QUERY }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    const error = new Error(`Serper search failed (${resp.status}): ${errorText}`);
    (error as any).status = resp.status;
    throw error;
  }

  const data = await resp.json();
  return Array.isArray(data?.images) ? data.images : [];
}

function inferExtension(contentType: string, url: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const byUrl = stripQueryAndHash(url).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return byUrl || "jpg";
}

async function fetchImageBytes(url: string, refererUrl?: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const headers = new Headers(BROWSER_HEADERS);
    if (refererUrl) {
      try {
        headers.set("Referer", `${new URL(refererUrl).origin}/`);
      } catch {
        // Ignore invalid referers
      }
    }
    const response = await fetch(url, { method: "GET", redirect: "follow", headers });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const bytes = new Uint8Array(await response.arrayBuffer());
    if ((!contentType.startsWith("image/") && !isProbablyImageUrl(url)) || bytes.byteLength < 5000) {
      return null;
    }
    return { bytes, contentType: contentType.split(";")[0] || "image/jpeg" };
  } catch {
    return null;
  }
}

async function persistImage(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  candidate: CandidateImage,
  rank: number,
): Promise<{ finalUrl: string; persisted: "storage" | "remote" } | null> {
  const download = await fetchImageBytes(candidate.url, candidate.link);

  if (download) {
    const ext = inferExtension(download.contentType, candidate.url);
    const path = `${productId}/${rank}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, download.bytes, { contentType: download.contentType, upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return { finalUrl: data.publicUrl, persisted: "storage" };
    }
    console.error(`[${productId.slice(0, 8)}] Storage upload failed:`, uploadError.message);
  }

  if (candidate.score >= 20 && TRUSTED_CDNS.some((cdn) => candidate.url.toLowerCase().includes(cdn))) {
    return { finalUrl: candidate.url, persisted: "remote" };
  }

  return null;
}

async function discoverMissingProducts(
  supabase: ReturnType<typeof createClient>,
  batchSize: number,
  startOffset: number,
): Promise<{ products: ProductRecord[]; nextOffset: number; totalProducts: number; done: boolean }> {
  let currentOffset = startOffset;
  let totalProducts = 0;
  let done = false;
  const selected: ProductRecord[] = [];

  while (selected.length < batchSize) {
    const { data: pageProducts, error: pageError, count } = await withRetry(`fetch products page ${currentOffset}`, () =>
      supabase
        .from("products")
        .select("id, title, brands(name), volume_ml, volume_unit", { count: "exact" })
        .order("id", { ascending: true })
        .range(currentOffset, currentOffset + DISCOVERY_PAGE_SIZE - 1),
    );

    if (pageError) throw pageError;
    totalProducts = count ?? totalProducts;

    if (!pageProducts || pageProducts.length === 0) {
      done = true;
      break;
    }

    const pageIds = pageProducts.map((product: any) => product.id);
    const { data: pageImages, error: pageImagesError } = await withRetry(`fetch page images ${currentOffset}`, () =>
      supabase.from("product_images").select("product_id").in("product_id", pageIds),
    );

    if (pageImagesError) throw pageImagesError;

    const hasImageSet = new Set((pageImages || []).map((item: any) => item.product_id));

    for (const product of pageProducts as ProductRecord[]) {
      if (!hasImageSet.has(product.id)) {
        selected.push(product);
        if (selected.length >= batchSize) break;
      }
    }

    currentOffset += pageProducts.length;

    if (pageProducts.length < DISCOVERY_PAGE_SIZE || (totalProducts > 0 && currentOffset >= totalProducts)) {
      done = true;
      break;
    }
  }

  return {
    products: selected,
    nextOffset: currentOffset,
    totalProducts,
    done,
  };
}

function getBrandName(product: ProductRecord): string {
  if (Array.isArray(product.brands)) {
    return product.brands[0]?.name || "";
  }
  return product.brands?.name || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SERPER_API_KEY");
    if (!apiKey) throw new Error("SERPER_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.max(1, Math.min(Number(body.batch_size) || 5, 10));
    const requestedIds = Array.isArray(body.product_ids)
      ? body.product_ids.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const scanOffset = Math.max(0, Number(body.scan_offset) || 0);

    let products: ProductRecord[] = [];
    let totalProducts: number | null = null;
    let totalMissing: number | null = null;
    let nextOffset = scanOffset;
    let done = false;

    if (requestedIds.length > 0) {
      const { data, error } = await withRetry("fetch requested products", () =>
        supabase
          .from("products")
          .select("id, title, brands(name), volume_ml, volume_unit")
          .in("id", requestedIds),
      );

      if (error) throw error;
      products = (data || []) as ProductRecord[];
      totalProducts = requestedIds.length;
      nextOffset = scanOffset + products.length;
      done = true;
    } else {
      const discovery = await discoverMissingProducts(supabase, batchSize, scanOffset);
      products = discovery.products;
      totalProducts = discovery.totalProducts;
      nextOffset = discovery.nextOffset;
      done = discovery.done;

      // Count products that actually have NO images
      try {
        const { count: totalProductCount } = await withRetry("count all products", () =>
          supabase.from("products").select("id", { count: "exact", head: true }),
        );
        const { count: productsWithImages } = await withRetry("count products with images", () =>
          supabase.from("product_images").select("product_id", { count: "exact", head: true }),
        );
        // product_images can have multiple rows per product, so we need distinct count
        const { data: distinctWithImages } = await withRetry("count distinct products with images", () =>
          supabase.rpc("count_products_with_images").single(),
        );
        if (distinctWithImages && typeof distinctWithImages === "object" && "count" in distinctWithImages) {
          totalMissing = (totalProductCount || 0) - Number(distinctWithImages.count);
        }
      } catch (e) {
        // Fallback: just don't set totalMissing, UI will use totalProducts
        console.warn("Could not count missing images:", e);
      }
    }

    if (products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          skipped: 0,
          failed: 0,
          results: [],
          totalMissing,
          totalProducts,
          nextOffset,
          done: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existingImages, error: existingImagesError } = await withRetry("fetch existing images for batch", () =>
      supabase.from("product_images").select("product_id").in("product_id", products.map((product) => product.id)),
    );

    if (existingImagesError) throw existingImagesError;

    const hasImageSet = new Set((existingImages || []).map((item: any) => item.product_id));
    const results: any[] = [];

    for (const product of products) {
      if (hasImageSet.has(product.id)) {
        results.push({ id: product.id, status: "skipped", reason: "already has images" });
        continue;
      }

      const brandName = getBrandName(product);
      let cleanTitle = product.title;
      if (brandName && cleanTitle.toLowerCase().startsWith(brandName.toLowerCase())) {
        cleanTitle = cleanTitle.slice(brandName.length).trim();
      }

      const fullName = `${brandName} ${cleanTitle}`.trim();
      const brandSlug = normalizeCompact(brandName);
      const titleWords = Array.from(
        new Set(normalizeText(`${brandName} ${cleanTitle}`).split(" ").filter((w) => w.length > 2)),
      );
      const volumeStr = product.volume_ml
        ? `${product.volume_ml}${product.volume_unit || "ml"}`
        : undefined;

      const searchQueries = buildSearchQueries(brandName, cleanTitle, volumeStr);

      try {
        const candidates: CandidateImage[] = [];

        for (const query of searchQueries) {
          if (candidates.some((candidate) => candidate.score >= 30)) break;

          console.log(`[${product.id.slice(0, 8)}] Query: "${query}"`);

          try {
            const images = await searchImages(apiKey, query);
            for (const img of images) {
              if (!img.imageUrl) continue;
              const score = scoreCandidate(img, titleWords, brandSlug, fullName, volumeStr);
              if (score >= MIN_SCORE) {
                candidates.push({
                  url: img.imageUrl,
                  thumbnailUrl: img.thumbnailUrl || "",
                  source: img.source || "",
                  domain: img.domain || "",
                  title: img.title || "",
                  width: img.imageWidth || 0,
                  height: img.imageHeight || 0,
                  score,
                  link: img.link || "",
                });
              }
            }
          } catch (error) {
            const status = (error as any)?.status;
            if (status === 402 || status === 429) {
              results.push({ id: product.id, status: "payment_required", title: fullName });
              break;
            }
            console.error(`[${product.id.slice(0, 8)}] Search error:`, error);
          }

          await sleep(200);
        }

        if (results.some((result) => result.id === product.id)) continue;

        const deduped = new Map<string, CandidateImage>();
        for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
          const key = stripQueryAndHash(candidate.url).toLowerCase();
          if (!deduped.has(key)) deduped.set(key, candidate);
        }

        const uniqueCandidates = Array.from(deduped.values()).sort((a, b) => b.score - a.score).slice(0, 8);
        const topScore = uniqueCandidates[0]?.score || 0;
        console.log(`[${product.id.slice(0, 8)}] "${fullName}" → ${uniqueCandidates.length} candidates, top score: ${topScore}`);

        if (topScore < MIN_SCORE) {
          results.push({ id: product.id, status: "no_confident_match", topScore, title: fullName });
          continue;
        }

        let saved: { finalUrl: string; persisted: string; candidate: CandidateImage } | null = null;
        for (let i = 0; i < uniqueCandidates.length; i++) {
          const candidate = uniqueCandidates[i];
          const persisted = await persistImage(supabase, product.id, candidate, i);
          if (persisted) {
            saved = { ...persisted, candidate };
            console.log(`[${product.id.slice(0, 8)}] ✓ Saved: ${persisted.finalUrl} (score: ${candidate.score}, domain: ${candidate.domain}, mode: ${persisted.persisted})`);
            break;
          }
          console.log(`[${product.id.slice(0, 8)}] ✗ Rejected: ${candidate.url} (score: ${candidate.score})`);
        }

        if (!saved) {
          results.push({ id: product.id, status: "no_images_found", title: fullName, topScore });
          continue;
        }

        const { error: insertError } = await withRetry(`insert image row ${product.id}`, () =>
          supabase.from("product_images").insert({
            product_id: product.id,
            image_url: saved!.finalUrl,
            sort_order: 0,
          }),
        );

        if (insertError) throw insertError;

        results.push({
          id: product.id,
          status: "success",
          images: 1,
          url: saved.finalUrl,
          domain: saved.candidate.domain,
          persisted: saved.persisted,
          score: saved.candidate.score,
          title: fullName,
        });

        await sleep(150);
      } catch (error) {
        console.error(`Error for ${product.id}:`, error);
        results.push({ id: product.id, status: "error", error: String(error), title: fullName });
      }
    }

    const succeeded = results.filter((result) => result.status === "success").length;
    const skipped = results.filter((result) => result.status === "skipped").length;
    const failed = results.filter((result) => result.status !== "success" && result.status !== "skipped").length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded,
        skipped,
        failed,
        results,
        totalMissing,
        totalProducts,
        nextOffset,
        done,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("search-product-images error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

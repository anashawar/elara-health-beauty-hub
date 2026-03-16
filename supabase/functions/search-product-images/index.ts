import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEARCH_API_URL = "https://api.firecrawl.dev/v1/search";
const MAX_SEARCH_QUERIES = 4;
const MAX_RESULTS_PER_QUERY = 6;
const MAX_CANDIDATES = 12;
const MIN_PAGE_SCORE = 5;
const MIN_IMAGE_SCORE = 10;
const MIN_TRUST_FALLBACK_SCORE = 20;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

type SearchResultLike = Record<string, any>;
type ImageSource = "jsonld-product" | "jsonld" | "meta" | "metadata" | "img" | "markdown";

type ExtractedImage = {
  url: string;
  source: ImageSource;
};

type CandidateImage = {
  pageUrl: string;
  pageScore: number;
  resultTitle: string;
  score: number;
  source: ImageSource;
  url: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/");
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeVolume(value?: string): string {
  return (value || "").toLowerCase().replace(/\s+/g, "");
}

function safeAbsoluteUrl(value: string, baseUrl?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isProbablyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|avif)(?:$|\?)/i.test(url);
}

function stripQueryAndHash(url: string): string {
  return url.split("#")[0].split("?")[0];
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
    "related", "recommend", "recently", "gift-card", "whatsapp",
  ];
  return reject.some((pattern) => lower.includes(pattern));
}

function scorePage(result: SearchResultLike, titleWords: string[], brandSlug: string, fullName: string, volumeStr?: string): number {
  const payload = (typeof result?.data === "object" && result.data) ? result.data : result;
  const pageUrl = pickString(payload?.url, result?.url);
  const title = pickString(payload?.title, result?.title);
  const description = pickString(payload?.description, result?.description);
  const markdown = pickString(payload?.markdown, result?.markdown).slice(0, 400);

  const raw = `${pageUrl} ${title} ${description} ${markdown}`.toLowerCase();
  const normalized = normalizeText(raw);
  const compact = normalizeCompact(raw);

  let score = 0;

  if (brandSlug && compact.includes(brandSlug)) score += 6;

  const matchedWords = titleWords.filter((word) => normalized.includes(word));
  score += matchedWords.length * 2;
  if (matchedWords.length >= 4) score += 8;
  else if (matchedWords.length >= 3) score += 5;
  else if (matchedWords.length >= 2) score += 3;

  const normalizedFullName = normalizeText(fullName);
  if (normalizedFullName && normalized.includes(normalizedFullName)) score += 10;

  const compactVolume = normalizeVolume(volumeStr);
  if (compactVolume && compact.includes(compactVolume)) score += 3;

  if (/\/product|\/products|\/p\/|\/dp\/|sku|item/i.test(pageUrl)) score += 5;
  if (/\b(buy|shop|price|foundation|serum|cream|gel|cleanser|moisturizer|lotion)\b/i.test(raw)) score += 2;

  if (/404|not found|page not found|page unavailable|error 404|requested page/i.test(raw)) score -= 25;
  if (/blog|article|review|compare|best|top|collection|category|search|wishlist|news/i.test(raw)) score -= 8;
  if (/homepage|landing|campaign|lookbook|gift guide|summer collection/i.test(raw)) score -= 7;

  return score;
}

function scoreImage(url: string, candidate: Omit<CandidateImage, "score" | "url">, titleWords: string[], brandSlug: string, productVolume?: string): number {
  const lower = url.toLowerCase();
  if (isJunkImage(lower)) return -1;
  if (!isProbablyImageUrl(lower)) return -1;

  let score = candidate.pageScore;
  const path = stripQueryAndHash(lower);
  const compactPath = normalizeCompact(path);

  if (brandSlug && compactPath.includes(brandSlug)) score += 6;

  const matched = titleWords.filter((word) => path.includes(word));
  score += matched.length * 2;
  if (matched.length >= 3) score += 6;
  else if (matched.length >= 2) score += 3;

  const compactVolume = normalizeVolume(productVolume);
  if (compactVolume && compactPath.includes(compactVolume)) score += 3;

  const trusted = [
    "cloudinary", "shopify", "cdn.shopify", "scene7", "akamaized",
    "imgix", "fastly", "amazonaws", "cloudfront", "images.ctfassets.net",
    "iherb", "lookfantastic", "notino", "notinoimg", "sephora", "ulta",
    "cultbeauty", "dermstore", "skinstore", "chemistwarehouse", "boots.com",
    "superdrug", "feelunique", "beautybay", "caretobeauty", "fragrancex",
    "fragrancenet", "douglas", "parfumdreams", "beautylish", "yesstyle",
    "stylevana", "jolse", "static.thcdn", "media-amazon", "images-na.ssl-images-amazon",
  ];
  if (trusted.some((domain) => lower.includes(domain))) score += 4;

  if (/\/product|\/products|\/catalog|\/media|\/image|\/images\//i.test(lower)) score += 3;
  if (/white|clean|studio|packshot|front|primary|main|hero|default/i.test(lower)) score += 2;
  if (/[_-](1|01|0)\.(jpg|jpeg|png|webp|avif)$/.test(path)) score += 2;

  const sourceBonus: Record<ImageSource, number> = {
    "jsonld-product": 12,
    jsonld: 8,
    meta: 7,
    metadata: 6,
    img: 3,
    markdown: 1,
  };
  score += sourceBonus[candidate.source] || 0;

  if (/(_thumb|_xs\.|_sm\.|\/thumb\/|\/small\/|_50x|_75x|_100x|_150x)/i.test(lower)) score -= 7;
  if (/desktop_\d+|mobile_\d+|carousel|slider|swatch|shade|before-after/i.test(lower)) score -= 5;
  if (/collection_pages|homepage|lookbook|editorial|blog/i.test(lower)) score -= 10;

  return score;
}

function flattenPossibleUrls(value: unknown, baseUrl?: string): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    const absolute = safeAbsoluteUrl(decodeHtmlEntities(value.trim()), baseUrl);
    return absolute ? [absolute] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenPossibleUrls(item, baseUrl));
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (typeof objectValue.url === "string") {
      return flattenPossibleUrls(objectValue.url, baseUrl);
    }
    return Object.values(objectValue).flatMap((item) => flattenPossibleUrls(item, baseUrl));
  }

  return [];
}

function extractImagesFromMarkdown(markdown: string, baseUrl?: string): string[] {
  const images: string[] = [];
  const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = mdRegex.exec(markdown)) !== null) {
    const absolute = safeAbsoluteUrl(match[1], baseUrl);
    if (absolute) images.push(absolute);
  }

  const urlRegex = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|avif)(\?[^\s"'<>]*)?)/gi;
  while ((match = urlRegex.exec(markdown)) !== null) {
    const absolute = safeAbsoluteUrl(match[1], baseUrl);
    if (absolute) images.push(absolute);
  }

  return images;
}

function extractMetaImageUrls(html: string, baseUrl?: string): string[] {
  const images: string[] = [];
  const metaTagRegex = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaTagRegex.exec(html)) !== null) {
    const tag = match[0];
    const property = (tag.match(/(?:property|name|itemprop)=(["'])(.*?)\1/i)?.[2] || "").toLowerCase();
    if (!["og:image", "og:image:url", "twitter:image", "twitter:image:src", "image"].includes(property)) continue;

    const content = tag.match(/content=(["'])(.*?)\1/i)?.[2];
    if (!content) continue;

    const absolute = safeAbsoluteUrl(decodeHtmlEntities(content), baseUrl);
    if (absolute) images.push(absolute);
  }

  const linkRegex = /<link\b[^>]*rel=(["'])image_src\1[^>]*href=(["'])(.*?)\2[^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const absolute = safeAbsoluteUrl(decodeHtmlEntities(match[3]), baseUrl);
    if (absolute) images.push(absolute);
  }

  return images;
}

function extractImageTags(html: string, baseUrl?: string): string[] {
  const images: string[] = [];
  const imgTagRegex = /<img\b[^>]*>/gi;
  const attrNames = ["src", "data-src", "data-lazy-src", "data-original", "data-image", "data-zoom-image", "data-large_image"];
  let match: RegExpExecArray | null;

  while ((match = imgTagRegex.exec(html)) !== null) {
    const tag = match[0];

    for (const attr of attrNames) {
      const value = tag.match(new RegExp(`${attr}=(["'])(.*?)\\1`, "i"))?.[2];
      if (!value) continue;
      const absolute = safeAbsoluteUrl(decodeHtmlEntities(value), baseUrl);
      if (absolute) images.push(absolute);
    }

    const srcset = tag.match(/srcset=(["'])(.*?)\1/i)?.[2];
    if (srcset) {
      const parts = srcset.split(",").map((part) => part.trim()).filter(Boolean);
      const lastUrl = parts.at(-1)?.split(/\s+/)?.[0];
      if (lastUrl) {
        const absolute = safeAbsoluteUrl(decodeHtmlEntities(lastUrl), baseUrl);
        if (absolute) images.push(absolute);
      }
    }
  }

  return images;
}

function extractJsonLdImages(html: string, baseUrl?: string): ExtractedImage[] {
  const results: ExtractedImage[] = [];
  const scriptRegex = /<script[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  const visitNode = (node: unknown, source: ImageSource) => {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) visitNode(item, source);
      return;
    }

    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const typeValue = typeof obj["@type"] === "string" ? obj["@type"].toLowerCase() : "";
    const nextSource: ImageSource = typeValue.includes("product") ? "jsonld-product" : source;

    for (const imageKey of ["image", "images", "thumbnailUrl", "contentUrl"]) {
      const urls = flattenPossibleUrls(obj[imageKey], baseUrl);
      for (const url of urls) results.push({ url, source: nextSource });
    }

    for (const value of Object.values(obj)) {
      visitNode(value, nextSource);
    }
  };

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = decodeHtmlEntities(match[2].trim())
      .replace(/^<!--/, "")
      .replace(/-->$/, "")
      .trim();

    if (!rawJson) continue;

    try {
      visitNode(JSON.parse(rawJson), "jsonld");
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return results;
}

function extractImagesFromSearchResult(result: SearchResultLike): ExtractedImage[] {
  const payload = (typeof result?.data === "object" && result.data) ? result.data : result;
  const pageUrl = pickString(payload?.url, result?.url);
  const markdown = pickString(payload?.markdown, result?.markdown);
  const html = pickString(payload?.html, result?.html);
  const metadata = payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {};

  const extracted: ExtractedImage[] = [
    ...flattenPossibleUrls((metadata as any)?.ogImage, pageUrl).map((url) => ({ url, source: "metadata" as const })),
    ...flattenPossibleUrls((metadata as any)?.image, pageUrl).map((url) => ({ url, source: "metadata" as const })),
    ...flattenPossibleUrls((metadata as any)?.images, pageUrl).map((url) => ({ url, source: "metadata" as const })),
    ...extractMetaImageUrls(html, pageUrl).map((url) => ({ url, source: "meta" as const })),
    ...extractJsonLdImages(html, pageUrl),
    ...extractImageTags(html, pageUrl).map((url) => ({ url, source: "img" as const })),
    ...extractImagesFromMarkdown(markdown, pageUrl).map((url) => ({ url, source: "markdown" as const })),
  ];

  const deduped = new Map<string, ExtractedImage>();
  for (const item of extracted) {
    if (!item.url.startsWith("http")) continue;
    const key = stripQueryAndHash(item.url).toLowerCase();
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return Array.from(deduped.values());
}

function upgradeToHighRes(url: string): string {
  let upgraded = url;
  upgraded = upgraded.replace(/_(?:100x100|150x150|200x200|300x300|thumb|small|xs|sm|s)\./gi, ".");
  upgraded = upgraded.replace(/\/(?:thumb|small|thumbnail|xs|sm)\//gi, "/large/");
  upgraded = upgraded.replace(/_\d+x\d*(\.\w+)$/, "$1");
  return upgraded;
}

function buildSearchQueries(brandName: string, title: string, volumeStr?: string): string[] {
  const fullName = `${brandName} ${title}`.trim();
  const retailerSites = "site:lookfantastic.com OR site:notino.com OR site:iherb.com OR site:sephora.com OR site:ulta.com OR site:boots.com";

  const queries = [
    `"${fullName}"`,
    volumeStr ? `"${fullName}" "${volumeStr}"` : "",
    `"${fullName}" product`,
    `${fullName} product image`,
    `${fullName} ${retailerSites}`,
    `${brandName} ${title.split(/\s+/).slice(0, 4).join(" ")}`,
  ].filter(Boolean);

  return Array.from(new Set(queries)).slice(0, MAX_SEARCH_QUERIES);
}

async function searchWeb(apiKey: string, query: string): Promise<SearchResultLike[]> {
  const resp = await fetch(SEARCH_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: MAX_RESULTS_PER_QUERY,
      scrapeOptions: {
        formats: ["html", "markdown"],
        onlyMainContent: false,
        waitFor: 1500,
      },
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    const error = new Error(`Firecrawl search failed (${resp.status}): ${errorText}`);
    (error as any).status = resp.status;
    throw error;
  }

  const data = await resp.json();
  return Array.isArray(data?.data) ? data.data : [];
}

function inferExtension(contentType: string, url: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const byUrl = stripQueryAndHash(url).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return byUrl || "jpg";
}

async function fetchImageBytes(url: string, pageUrl?: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const headers = new Headers(BROWSER_HEADERS);
    if (pageUrl) {
      try {
        headers.set("Referer", `${new URL(pageUrl).origin}/`);
      } catch {
        // Ignore invalid referer.
      }
    }

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers,
    });

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
  const download = await fetchImageBytes(candidate.url, candidate.pageUrl);

  if (download) {
    const ext = inferExtension(download.contentType, candidate.url);
    const path = `${productId}/${rank}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, download.bytes, {
        contentType: download.contentType,
        upsert: true,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return { finalUrl: data.publicUrl, persisted: "storage" };
    }

    console.error(`[${productId.slice(0, 8)}] Storage upload failed:`, uploadError.message);
  }

  if (candidate.score >= MIN_TRUST_FALLBACK_SCORE && candidate.source !== "markdown" && candidate.source !== "img") {
    return { finalUrl: candidate.url, persisted: "remote" };
  }

  return null;
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

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title, brands(name), volume_ml, volume_unit")
      .in("id", product_ids);
    if (productsError) throw productsError;

    const { data: existingImages } = await supabase
      .from("product_images")
      .select("product_id")
      .in("product_id", product_ids);
    const hasImageSet = new Set((existingImages || []).map((item: any) => item.product_id));

    const results: any[] = [];

    for (const product of products || []) {
      if (hasImageSet.has(product.id)) {
        results.push({ id: product.id, status: "skipped", reason: "already has images" });
        continue;
      }

      const brandName = (product as any).brands?.name || "";
      let cleanTitle = product.title;
      if (brandName && cleanTitle.toLowerCase().startsWith(brandName.toLowerCase())) {
        cleanTitle = cleanTitle.slice(brandName.length).trim();
      }

      const fullName = `${brandName} ${cleanTitle}`.trim();
      const brandSlug = normalizeCompact(brandName);
      const titleWords = Array.from(new Set(normalizeText(`${brandName} ${cleanTitle}`).split(" ").filter((word) => word.length > 2)));
      const volumeStr = (product as any).volume_ml
        ? `${(product as any).volume_ml}${(product as any).volume_unit || "ml"}`
        : undefined;

      const searchQueries = buildSearchQueries(brandName, cleanTitle, volumeStr);

      try {
        const candidates: CandidateImage[] = [];
        let paymentRequired = false;

        for (const query of searchQueries) {
          if (paymentRequired) break;
          if (candidates.some((candidate) => candidate.score >= 24)) break;

          console.log(`[${product.id.slice(0, 8)}] Query: ${query}`);

          try {
            const searchResults = await searchWeb(apiKey, query);

            for (const result of searchResults) {
              const payload = (typeof result?.data === "object" && result.data) ? result.data : result;
              const pageUrl = pickString(payload?.url, result?.url);
              const resultTitle = pickString(payload?.title, result?.title);
              const pageScore = scorePage(result, titleWords, brandSlug, fullName, volumeStr);

              if (!pageUrl || pageScore < MIN_PAGE_SCORE) continue;

              const extractedImages = extractImagesFromSearchResult(result);
              for (const extracted of extractedImages) {
                const upgradedUrl = upgradeToHighRes(extracted.url);
                const candidateBase = {
                  pageUrl,
                  pageScore,
                  resultTitle,
                  source: extracted.source,
                };
                const score = scoreImage(upgradedUrl, candidateBase, titleWords, brandSlug, volumeStr);
                if (score >= MIN_IMAGE_SCORE) {
                  candidates.push({ ...candidateBase, url: upgradedUrl, score });
                }
              }
            }
          } catch (error) {
            const status = (error as any)?.status;
            if (status === 402) {
              paymentRequired = true;
              break;
            }
            console.error(`[${product.id.slice(0, 8)}] Search error:`, error);
          }

          await sleep(250);
        }

        if (paymentRequired) {
          results.push({ id: product.id, status: "payment_required" });
          continue;
        }

        const deduped = new Map<string, CandidateImage>();
        for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
          const key = stripQueryAndHash(candidate.url).toLowerCase();
          const existing = deduped.get(key);
          if (!existing || existing.score < candidate.score) {
            deduped.set(key, candidate);
          }
        }

        const uniqueCandidates = Array.from(deduped.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_CANDIDATES);

        const topScore = uniqueCandidates[0]?.score || 0;
        console.log(`[${product.id.slice(0, 8)}] "${fullName}" → ${uniqueCandidates.length} candidates, top score: ${topScore}`);

        if (topScore < MIN_IMAGE_SCORE) {
          results.push({ id: product.id, status: "no_confident_match", topScore, title: fullName });
          continue;
        }

        let saved: { finalUrl: string; persisted: "storage" | "remote"; candidate: CandidateImage } | null = null;
        for (let index = 0; index < uniqueCandidates.length; index++) {
          const candidate = uniqueCandidates[index];
          const persisted = await persistImage(supabase, product.id, candidate, index);
          if (persisted) {
            saved = { ...persisted, candidate };
            console.log(
              `[${product.id.slice(0, 8)}] ✓ Saved: ${persisted.finalUrl} (score: ${candidate.score}, source: ${candidate.source}, mode: ${persisted.persisted})`,
            );
            break;
          }

          console.log(`[${product.id.slice(0, 8)}] ✗ Rejected: ${candidate.url} (score: ${candidate.score}, source: ${candidate.source})`);
        }

        if (!saved) {
          results.push({ id: product.id, status: "no_images_found", title: fullName, topScore });
          continue;
        }

        const { error: insertError } = await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: saved.finalUrl,
          sort_order: 0,
        });

        if (insertError) throw insertError;

        results.push({
          id: product.id,
          status: "success",
          images: 1,
          url: saved.finalUrl,
          source: saved.candidate.source,
          persisted: saved.persisted,
          score: saved.candidate.score,
          title: fullName,
        });

        await sleep(250);
      } catch (error) {
        console.error(`Error for ${product.id}:`, error);
        results.push({ id: product.id, status: "error", error: String(error), title: fullName });
      }
    }

    const succeeded = results.filter((result) => result.status === "success").length;
    const skipped = results.filter((result) => result.status === "skipped").length;
    const failed = results.filter((result) => result.status !== "success" && result.status !== "skipped").length;

    return new Response(
      JSON.stringify({ success: true, processed: results.length, succeeded, skipped, failed, results }),
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
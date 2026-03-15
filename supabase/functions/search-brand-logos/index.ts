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

    const { brand_ids } = await req.json();
    if (!brand_ids || !Array.isArray(brand_ids) || brand_ids.length === 0) {
      throw new Error("brand_ids array is required");
    }

    const { data: brands, error: bErr } = await supabase
      .from("brands")
      .select("id, name, logo_url")
      .in("id", brand_ids);
    if (bErr) throw bErr;

    const results: any[] = [];

    for (const brand of (brands || [])) {
      if (brand.logo_url) {
        results.push({ id: brand.id, status: "skipped", reason: "already has logo" });
        continue;
      }

      try {
        let logoUrl: string | null = null;

        // Strategy 1: Search for the brand's official site and extract branding
        logoUrl = await tryOfficialSiteBranding(brand.name, apiKey);

        // Strategy 2: Search for brand logo on logo aggregator sites
        if (!logoUrl) {
          logoUrl = await tryLogoAggregators(brand.name, apiKey);
        }

        // Strategy 3: Try Clearbit Logo API (free, no key needed, returns PNG)
        if (!logoUrl) {
          logoUrl = await tryClearbitLogo(brand.name);
        }

        // Strategy 4: Fallback search for PNG logo images
        if (!logoUrl) {
          logoUrl = await tryDirectLogoSearch(brand.name, apiKey);
        }

        if (logoUrl) {
          // Validate the logo URL is accessible
          const validated = await validateImageUrl(logoUrl);
          if (validated) {
            const { error: updateErr } = await supabase
              .from("brands")
              .update({ logo_url: validated })
              .eq("id", brand.id);

            if (updateErr) {
              console.error(`Failed to update brand ${brand.name}:`, updateErr);
              results.push({ id: brand.id, status: "error", error: updateErr.message });
            } else {
              console.log(`✅ Found logo for ${brand.name}: ${validated}`);
              results.push({ id: brand.id, status: "success", logo_url: validated });
            }
          } else {
            console.log(`❌ Logo URL not accessible for ${brand.name}: ${logoUrl}`);
            results.push({ id: brand.id, status: "no_logo_found" });
          }
        } else {
          console.log(`❌ No logo found for ${brand.name}`);
          results.push({ id: brand.id, status: "no_logo_found" });
        }

        // Rate limit between brands
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error(`Error for brand ${brand.name}:`, err);
        results.push({ id: brand.id, status: "error", error: String(err) });
      }
    }

    const succeeded = results.filter(r => r.status === "success").length;
    const failed = results.filter(r => r.status !== "success" && r.status !== "skipped").length;

    return new Response(
      JSON.stringify({ success: true, processed: results.length, succeeded, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("search-brand-logos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Strategy 1: Find the brand's official website via search, then extract
 * the logo using Firecrawl's branding extraction format.
 */
async function tryOfficialSiteBranding(brandName: string, apiKey: string): Promise<string | null> {
  try {
    // First, find the brand's official website
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${brandName} official website skincare beauty cosmetics`,
        limit: 3,
      }),
    });

    if (!searchResp.ok) {
      console.error(`Search failed for "${brandName}":`, searchResp.status);
      return null;
    }

    const searchData = await searchResp.json();
    const searchResults = searchData.data || [];

    // Try to find the official site (look for brand name in domain)
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let officialUrl: string | null = null;

    for (const result of searchResults) {
      const url = result.url || "";
      const domain = extractDomain(url).toLowerCase();
      // Prefer domains containing the brand name
      if (domain.includes(brandSlug) || domain.includes(brandName.toLowerCase().replace(/\s+/g, ""))) {
        officialUrl = url;
        break;
      }
    }

    // Fallback to first result if no exact domain match
    if (!officialUrl && searchResults.length > 0) {
      officialUrl = searchResults[0].url;
    }

    if (!officialUrl) return null;

    console.log(`Scraping branding from ${officialUrl} for "${brandName}"`);

    // Now scrape the official site for branding info (logo)
    const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: officialUrl,
        formats: ["branding"],
      }),
    });

    if (!scrapeResp.ok) {
      console.error(`Scrape failed for ${officialUrl}:`, scrapeResp.status);
      return null;
    }

    const scrapeData = await scrapeResp.json();
    const branding = scrapeData.data?.branding || scrapeData.branding;

    if (branding) {
      // Check branding.logo first, then branding.images.logo
      const logoUrl = branding.logo || branding.images?.logo;
      if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("http")) {
        console.log(`Found branding logo for "${brandName}": ${logoUrl}`);
        return logoUrl;
      }
    }

    return null;
  } catch (err) {
    console.error(`tryOfficialSiteBranding error for "${brandName}":`, err);
    return null;
  }
}

/**
 * Strategy 2: Search logo aggregator sites (worldvectorlogo, brandsoftheworld, seeklogo)
 */
async function tryLogoAggregators(brandName: string, apiKey: string): Promise<string | null> {
  try {
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `"${brandName}" logo PNG site:worldvectorlogo.com OR site:seeklogo.com OR site:brandsoftheworld.com OR site:logowik.com`,
        limit: 5,
        scrapeOptions: {
          formats: ["links"],
        },
      }),
    });

    if (!searchResp.ok) return null;

    const searchData = await searchResp.json();
    for (const result of (searchData.data || [])) {
      for (const link of (result.links || [])) {
        if (typeof link === "string" && isHighQualityLogoUrl(link)) {
          return link;
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`tryLogoAggregators error for "${brandName}":`, err);
    return null;
  }
}

/**
 * Strategy 3: Try Clearbit Logo API — free, returns PNG, very reliable for known brands
 */
async function tryClearbitLogo(brandName: string): Promise<string | null> {
  try {
    // Try common domain patterns
    const slugs = [
      brandName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com",
      brandName.toLowerCase().replace(/\s+/g, "-") + ".com",
      brandName.toLowerCase().replace(/\s+/g, "") + ".com",
    ];

    for (const domain of slugs) {
      const url = `https://logo.clearbit.com/${domain}`;
      const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("image")) {
          console.log(`Clearbit logo found for "${brandName}": ${url}`);
          return url;
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`tryClearbitLogo error for "${brandName}":`, err);
    return null;
  }
}

/**
 * Strategy 4: Direct search for PNG logo
 */
async function tryDirectLogoSearch(brandName: string, apiKey: string): Promise<string | null> {
  try {
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `"${brandName}" brand logo PNG transparent high resolution`,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown", "links"],
          onlyMainContent: true,
        },
      }),
    });

    if (!searchResp.ok) return null;

    const searchData = await searchResp.json();
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const result of (searchData.data || [])) {
      const markdown = result.markdown || "";
      const links = result.links || [];

      // Extract image URLs from markdown
      const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
      let match;
      while ((match = mdImageRegex.exec(markdown)) !== null) {
        const url = match[1];
        if (isRelevantLogo(url, brandSlug)) {
          return url;
        }
      }

      // Check links
      for (const link of links) {
        if (typeof link === "string" && isRelevantLogo(link, brandSlug)) {
          return link;
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`tryDirectLogoSearch error for "${brandName}":`, err);
    return null;
  }
}

/** Validate that a URL points to an actual accessible image */
async function validateImageUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (resp.ok) {
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("image") || contentType.includes("svg")) {
        return resp.url; // Return final URL after redirects
      }
    }
    // Even if HEAD fails, some CDNs don't support HEAD — try GET with range
    const getResp = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
    });
    if (getResp.ok || getResp.status === 206) {
      return getResp.url;
    }
    return null;
  } catch {
    return null;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function isHighQualityLogoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const hasImageExt = [".png", ".svg", ".webp"].some(ext => lower.includes(ext));
  const hasLogoIndicator = lower.includes("logo") || lower.includes("brand");
  // Avoid tiny icons, favicons, and social media thumbnails
  const isNotIcon = !lower.includes("favicon") && !lower.includes("icon-") && !lower.includes("/icons/");
  return hasImageExt && hasLogoIndicator && isNotIcon;
}

function isRelevantLogo(url: string, brandSlug: string): boolean {
  const lower = url.toLowerCase();
  const hasImageExt = [".png", ".svg", ".webp", ".jpg", ".jpeg"].some(ext => lower.includes(ext));
  if (!hasImageExt) return false;
  
  const hasBrandName = lower.includes(brandSlug);
  const hasLogoKeyword = lower.includes("logo");
  const isNotIcon = !lower.includes("favicon") && !lower.includes("icon-16") && !lower.includes("icon-32");
  
  // Prefer PNG/SVG with logo or brand name in URL
  if ((hasBrandName || hasLogoKeyword) && isNotIcon) return true;
  
  return false;
}

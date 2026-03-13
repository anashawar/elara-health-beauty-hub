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
      // Skip brands that already have a logo
      if (brand.logo_url) {
        results.push({ id: brand.id, status: "skipped", reason: "already has logo" });
        continue;
      }

      try {
        // Search for the brand's official website to find their logo
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `${brand.name} skincare beauty brand official logo`,
            limit: 3,
            scrapeOptions: {
              formats: ["markdown", "links"],
              onlyMainContent: true,
            },
          }),
        });

        if (!searchResp.ok) {
          const errText = await searchResp.text();
          console.error(`Search error for brand "${brand.name}":`, searchResp.status, errText);
          if (searchResp.status === 402) {
            results.push({ id: brand.id, status: "payment_required" });
            break;
          }
          results.push({ id: brand.id, status: "error", error: errText });
          continue;
        }

        const searchData = await searchResp.json();
        const searchResults = searchData.data || [];

        let logoUrl: string | null = null;

        for (const result of searchResults) {
          if (logoUrl) break;

          const markdown = result.markdown || "";
          const links = result.links || [];

          // Look for logo in markdown image references
          const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi;
          let match;
          while ((match = mdImageRegex.exec(markdown)) !== null) {
            const url = match[1].toLowerCase();
            if (url.includes("logo") && isImageUrl(url)) {
              logoUrl = match[1];
              break;
            }
          }

          // Look for logo in links
          if (!logoUrl) {
            for (const link of links) {
              if (typeof link === "string") {
                const lower = link.toLowerCase();
                if (lower.includes("logo") && isImageUrl(lower)) {
                  logoUrl = link;
                  break;
                }
              }
            }
          }

          // Fallback: look for any brand-related image
          if (!logoUrl) {
            const brandSlug = brand.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (const link of links) {
              if (typeof link === "string") {
                const lower = link.toLowerCase();
                if (lower.includes(brandSlug) && isImageUrl(lower) && (lower.includes("brand") || lower.includes("logo") || lower.endsWith(".svg") || lower.endsWith(".png"))) {
                  logoUrl = link;
                  break;
                }
              }
            }
          }
        }

        if (!logoUrl) {
          // Try a second search specifically for logo
          const logoSearchResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `"${brand.name}" logo png transparent`,
              limit: 3,
              scrapeOptions: {
                formats: ["links"],
              },
            }),
          });

          if (logoSearchResp.ok) {
            const logoData = await logoSearchResp.json();
            for (const result of (logoData.data || [])) {
              if (logoUrl) break;
              for (const link of (result.links || [])) {
                if (typeof link === "string" && isImageUrl(link.toLowerCase())) {
                  const lower = link.toLowerCase();
                  if (lower.includes("logo") || lower.endsWith(".png") || lower.endsWith(".svg")) {
                    logoUrl = link;
                    break;
                  }
                }
              }
            }
          }
        }

        if (logoUrl) {
          const { error: updateErr } = await supabase
            .from("brands")
            .update({ logo_url: logoUrl })
            .eq("id", brand.id);

          if (updateErr) {
            console.error(`Failed to update brand ${brand.name}:`, updateErr);
            results.push({ id: brand.id, status: "error", error: updateErr.message });
          } else {
            console.log(`Found logo for ${brand.name}: ${logoUrl}`);
            results.push({ id: brand.id, status: "success", logo_url: logoUrl });
          }
        } else {
          console.log(`No logo found for ${brand.name}`);
          results.push({ id: brand.id, status: "no_logo_found" });
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 500));
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

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".svg"].some(ext => lower.includes(ext));
}

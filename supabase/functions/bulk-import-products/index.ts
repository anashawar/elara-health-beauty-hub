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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { products } = await req.json();
    // products: Array<{ name: string, cost: number }>

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new Error("products array is required");
    }

    const BATCH_SIZE = 100;
    let totalInserted = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      const productRows = batch.map((p: any) => {
        const cost = typeof p.cost === "string"
          ? parseFloat(p.cost.replace(/,/g, ""))
          : Number(p.cost);
        const price = Math.round((cost * 1.35) / 250) * 250;
        const slug = p.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 100);

        return {
          title: p.name.trim(),
          slug: slug || `product-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          price,
          original_price: Math.round((price * 1.15) / 250) * 250,
          in_stock: true,
        };
      });

      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert(productRows)
        .select("id, title");

      if (insertErr) {
        console.error(`Batch ${i / BATCH_SIZE + 1} error:`, insertErr.message);
        // Try one-by-one for this batch
        for (const row of productRows) {
          const { data: single, error: singleErr } = await supabase
            .from("products")
            .insert(row)
            .select("id")
            .single();
          if (singleErr) {
            totalErrors++;
            errors.push(`${row.title}: ${singleErr.message}`);
          } else if (single) {
            totalInserted++;
            // Save cost
            const cost = batch.find((p: any) => p.name.trim() === row.title)?.cost;
            const costNum = typeof cost === "string" ? parseFloat(cost.replace(/,/g, "")) : Number(cost);
            if (costNum > 0) {
              await supabase.from("product_costs").insert({ product_id: single.id, cost: costNum });
            }
          }
        }
        continue;
      }

      totalInserted += (inserted || []).length;

      // Save costs for this batch
      const costRows = (inserted || []).map((p: any) => {
        const original = batch.find((b: any) => b.name.trim() === p.title);
        const cost = original
          ? (typeof original.cost === "string" ? parseFloat(original.cost.replace(/,/g, "")) : Number(original.cost))
          : 0;
        return { product_id: p.id, cost };
      }).filter((c: any) => c.cost > 0);

      if (costRows.length > 0) {
        const { error: costErr } = await supabase.from("product_costs").insert(costRows);
        if (costErr) console.error("Cost insert error:", costErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: totalInserted,
        errors: totalErrors,
        error_details: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bulk-import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

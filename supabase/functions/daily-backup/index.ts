import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES_TO_BACKUP = [
  "products",
  "product_images",
  "product_tags",
  "brands",
  "categories",
  "subcategories",
  "orders",
  "order_items",
  "profiles",
  "addresses",
  "coupons",
  "offers",
  "banners",
  "reviews",
  "loyalty_points",
  "loyalty_transactions",
  "loyalty_rewards",
  "wishlist_items",
  "cart_items",
  "warehouses",
  "warehouse_users",
  "brand_warehouses",
  "product_costs",
  "skin_analyses",
  "notification_campaigns",
  "order_ratings",
  "support_conversations",
  "support_messages",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // e.g. 2026-03-26
    const timeStr = now.toISOString().split("T")[1].replace(/[:.]/g, "-").slice(0, 8);
    const folder = `${dateStr}/${timeStr}`;

    const results: Record<string, { rows: number; error?: string }> = {};

    // Process tables in parallel batches of 5
    for (let i = 0; i < TABLES_TO_BACKUP.length; i += 5) {
      const batch = TABLES_TO_BACKUP.slice(i, i + 5);
      await Promise.all(
        batch.map(async (table) => {
          try {
            // Fetch all rows (paginated for large tables)
            let allRows: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
              const { data, error } = await supabase
                .from(table)
                .select("*")
                .range(from, from + pageSize - 1);

              if (error) {
                results[table] = { rows: 0, error: error.message };
                return;
              }

              if (data && data.length > 0) {
                allRows = allRows.concat(data);
                from += pageSize;
                hasMore = data.length === pageSize;
              } else {
                hasMore = false;
              }
            }

            // Upload as JSON to storage
            const jsonContent = JSON.stringify(allRows, null, 2);
            const filePath = `${folder}/${table}.json`;

            const { error: uploadError } = await supabase.storage
              .from("database-backups")
              .upload(filePath, new Blob([jsonContent], { type: "application/json" }), {
                contentType: "application/json",
                upsert: true,
              });

            if (uploadError) {
              results[table] = { rows: allRows.length, error: uploadError.message };
            } else {
              results[table] = { rows: allRows.length };
            }
          } catch (e) {
            results[table] = { rows: 0, error: String(e) };
          }
        })
      );
    }

    const totalRows = Object.values(results).reduce((sum, r) => sum + r.rows, 0);
    const errors = Object.entries(results).filter(([, r]) => r.error);

    return new Response(
      JSON.stringify({
        success: true,
        backup_folder: folder,
        total_tables: TABLES_TO_BACKUP.length,
        total_rows: totalRows,
        errors: errors.length > 0 ? Object.fromEntries(errors) : undefined,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";

    // --- LOGIN endpoint ---
    if (req.method === "POST") {
      const body = await req.json();

      if (body.action === "login") {
        const { username, password } = body;
        if (!username || !password) return json({ error: "Username and password required" }, 400);

        const { data: row } = await supabase
          .from("prep_access_tokens")
          .select("id, token, label, password_hash, is_active")
          .eq("username", username)
          .eq("is_active", true)
          .maybeSingle();

        if (!row) return json({ error: "Invalid credentials" }, 401);
        if (row.password_hash !== password) return json({ error: "Invalid credentials" }, 401);

        return json({ token: row.token, label: row.label });
      }

      // Mark prepared action
      if (body.order_id) {
        const { data: tokenRow } = await supabase
          .from("prep_access_tokens")
          .select("id")
          .eq("token", token)
          .eq("is_active", true)
          .maybeSingle();
        if (!tokenRow) return json({ error: "Invalid or expired link" }, 401);

        const { error: updateErr } = await supabase
          .from("orders")
          .update({ status: "prepared" })
          .eq("id", body.order_id)
          .in("status", ["pending", "processing"]);
        if (updateErr) throw updateErr;

        // Notify operations users
        const { data: opsUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "operations"]);

        if (opsUsers && opsUsers.length > 0) {
          const notifications = opsUsers.map((u: any) => ({
            user_id: u.user_id,
            title: "Order Prepared ✅",
            body: `Order #${body.order_id.slice(0, 8)} has been prepared and is ready for delivery.`,
            type: "order",
            link_url: "/admin/orders",
            icon: "📦",
          }));
          await supabase.from("notifications").insert(notifications);
        }

        return json({ success: true });
      }

      return json({ error: "Invalid action" }, 400);
    }

    // --- GET orders ---
    if (req.method === "GET") {
      const { data: tokenRow } = await supabase
        .from("prep_access_tokens")
        .select("id, is_active, excluded_brand_ids, excluded_product_ids")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!tokenRow) return json({ error: "Invalid or expired link" }, 401);

      const excludedBrandIds: string[] = tokenRow.excluded_brand_ids || [];
      const excludedProductIds: string[] = tokenRow.excluded_product_ids || [];

      const statusFilter = url.searchParams.get("status") || "pending,processing";
      const statuses = statusFilter.split(",").map((s) => s.trim());

      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("id, status, created_at, notes, address_id")
        .in("status", statuses)
        .order("created_at", { ascending: true });
      if (ordersErr) throw ordersErr;

      const orderIds = (orders || []).map((o: any) => o.id);
      if (orderIds.length === 0) return json({ orders: [] });

      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, quantity")
        .in("order_id", orderIds);

      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      
      // Fetch products WITH brand_id so we can filter by brand
      const { data: products } = await supabase
        .from("products")
        .select("id, title, slug, volume_ml, volume_unit, brand_id")
        .in("id", productIds);

      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true });

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      const imageMap = new Map<string, string>();
      for (const img of images || []) {
        if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.image_url);
      }

      // Fetch addresses
      const addressIds = [...new Set((orders || []).filter((o: any) => o.address_id).map((o: any) => o.address_id))];
      let addressMap = new Map();
      if (addressIds.length > 0) {
        const { data: addresses } = await supabase
          .from("addresses")
          .select("id, city, area, street, building, floor, apartment, phone, label")
          .in("id", addressIds);
        addressMap = new Map((addresses || []).map((a: any) => [a.id, a]));
      }

      // Determine which items are excluded for this warehouse
      const isExcludedItem = (productId: string): boolean => {
        if (excludedProductIds.includes(productId)) return true;
        const product = productMap.get(productId);
        if (product && product.brand_id && excludedBrandIds.includes(product.brand_id)) return true;
        return false;
      };

      const enrichedOrders: any[] = [];

      for (const order of orders || []) {
        const orderItems = (items || []).filter((i: any) => i.order_id === order.id);
        
        // Split items into warehouse items vs excluded items
        const warehouseItems: any[] = [];
        const excludedItems: any[] = [];

        for (const item of orderItems) {
          const product = productMap.get(item.product_id);
          const mapped = {
            id: item.id,
            quantity: item.quantity,
            product: product
              ? {
                  id: product.id,
                  title: product.title,
                  volume: product.volume_ml ? `${product.volume_ml}${product.volume_unit || "ml"}` : null,
                  image_url: imageMap.get(product.id) || null,
                }
              : null,
          };

          if (isExcludedItem(item.product_id)) {
            excludedItems.push(mapped);
          } else {
            warehouseItems.push(mapped);
          }
        }

        // Only include order if it has items for this warehouse
        if (warehouseItems.length === 0) continue;

        const address = order.address_id ? addressMap.get(order.address_id) : null;

        enrichedOrders.push({
          id: order.id,
          status: order.status,
          created_at: order.created_at,
          notes: order.notes,
          items: warehouseItems,
          excluded_item_count: excludedItems.length,
          address: address
            ? { city: address.city, area: address.area, street: address.street, building: address.building, floor: address.floor, apartment: address.apartment, phone: address.phone, label: address.label }
            : null,
        });
      }

      return json({ orders: enrichedOrders });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

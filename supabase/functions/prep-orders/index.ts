import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Validate token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("prep_access_tokens")
      .select("id, is_active")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET — fetch pending/processing orders with their items + product info (NO prices)
    if (req.method === "GET") {
      const statusFilter = url.searchParams.get("status") || "pending,processing";
      const statuses = statusFilter.split(",").map((s) => s.trim());

      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("id, status, created_at, notes")
        .in("status", statuses)
        .order("created_at", { ascending: true });

      if (ordersErr) throw ordersErr;

      // Fetch order items for these orders
      const orderIds = (orders || []).map((o: any) => o.id);
      if (orderIds.length === 0) {
        return new Response(JSON.stringify({ orders: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, quantity")
        .in("order_id", orderIds);

      if (itemsErr) throw itemsErr;

      // Fetch product details (no price)
      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      const { data: products } = await supabase
        .from("products")
        .select("id, title, slug, volume_ml, volume_unit")
        .in("id", productIds);

      // Fetch primary images
      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true });

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      const imageMap = new Map<string, string>();
      for (const img of images || []) {
        if (!imageMap.has(img.product_id)) {
          imageMap.set(img.product_id, img.image_url);
        }
      }

      // Fetch addresses for orders
      const { data: allOrders } = await supabase
        .from("orders")
        .select("id, address_id")
        .in("id", orderIds);
      
      const addressIds = [...new Set((allOrders || []).filter((o: any) => o.address_id).map((o: any) => o.address_id))];
      let addressMap = new Map();
      if (addressIds.length > 0) {
        const { data: addresses } = await supabase
          .from("addresses")
          .select("id, city, area, street, building, floor, apartment, phone, label")
          .in("id", addressIds);
        addressMap = new Map((addresses || []).map((a: any) => [a.id, a]));
      }

      // Build response
      const enrichedOrders = (orders || []).map((order: any) => {
        const orderItems = (items || [])
          .filter((i: any) => i.order_id === order.id)
          .map((i: any) => {
            const product = productMap.get(i.product_id);
            return {
              id: i.id,
              quantity: i.quantity,
              product: product
                ? {
                    id: product.id,
                    title: product.title,
                    volume: product.volume_ml
                      ? `${product.volume_ml}${product.volume_unit || "ml"}`
                      : null,
                    image_url: imageMap.get(product.id) || null,
                  }
                : null,
            };
          });

        const addrId = (allOrders || []).find((o: any) => o.id === order.id)?.address_id;
        const address = addrId ? addressMap.get(addrId) : null;

        return {
          id: order.id,
          status: order.status,
          created_at: order.created_at,
          notes: order.notes,
          items: orderItems,
          address: address
            ? {
                city: address.city,
                area: address.area,
                street: address.street,
                building: address.building,
                floor: address.floor,
                apartment: address.apartment,
                phone: address.phone,
                label: address.label,
              }
            : null,
        };
      });

      return new Response(JSON.stringify({ orders: enrichedOrders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — mark order as prepared
    if (req.method === "POST") {
      const { order_id } = await req.json();
      if (!order_id) {
        return new Response(JSON.stringify({ error: "order_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "prepared" })
        .eq("id", order_id)
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
          body: `Order #${order_id.slice(0, 8)} has been prepared and is ready for delivery.`,
          type: "order",
          link_url: "/admin/orders",
          icon: "📦",
        }));

        await supabase.from("notifications").insert(notifications);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

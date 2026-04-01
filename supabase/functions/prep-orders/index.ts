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
        // Verify password server-side using bcrypt
        const { data: hashMatch, error: hashErr } = await supabase.rpc("verify_prep_password", {
          _plain_password: password,
          _stored_hash: row.password_hash,
        });
        if (hashErr || !hashMatch) return json({ error: "Invalid credentials" }, 401);

        return json({ token: row.token, label: row.label });
      }

      // Send note to operations
      if (body.action === "send-note") {
        const { order_id, note } = body;
        if (!order_id || !note) return json({ error: "Order ID and note required" }, 400);

        const { data: tokenRow } = await supabase
          .from("prep_access_tokens")
          .select("id, label")
          .eq("token", token)
          .eq("is_active", true)
          .maybeSingle();
        if (!tokenRow) return json({ error: "Invalid or expired link" }, 401);

        const warehouseName = tokenRow.label || "Warehouse";

        // Notify operations & admin users
        const { data: opsUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "operations"]);

        if (opsUsers && opsUsers.length > 0) {
          const notifications = opsUsers.map((u: any) => ({
            user_id: u.user_id,
            title: `⚠️ ${warehouseName} Note`,
            body: `Order #${order_id.slice(0, 8)}: ${note}`,
            type: "order",
            link_url: "/admin/orders",
            icon: "📋",
          }));
          await supabase.from("notifications").insert(notifications);
        }

        return json({ success: true });
      }

      // --- Warehouse portal: add request ---
      if (body.action === "warehouse-add-request") {
        const { user_id, warehouse_id, type, title, description, priority, created_by_username, brand_id, product_id } = body;
        if (!user_id || !warehouse_id || !type || !title) return json({ error: "Missing required fields" }, 400);

        // Verify warehouse user
        const { data: wUser } = await supabase
          .from("warehouse_users")
          .select("id")
          .eq("id", user_id)
          .eq("warehouse_id", warehouse_id)
          .eq("is_active", true)
          .maybeSingle();
        if (!wUser) return json({ error: "Unauthorized" }, 401);

        const { error: insertErr } = await supabase.from("warehouse_requests").insert({
          warehouse_id,
          type,
          title: title.substring(0, 500),
          description: description ? description.substring(0, 2000) : null,
          priority: priority || "normal",
          created_by_username: created_by_username || null,
          brand_id: brand_id || null,
          product_id: product_id || null,
        });
        if (insertErr) throw insertErr;

        await supabase.from("warehouse_notifications").insert({
          warehouse_id,
          title: `New ${type.replace("_", " ")}`,
          body: `${created_by_username || "User"} added: ${title.substring(0, 200)}`,
          type: "request",
        });

        return json({ success: true });
      }

      // --- Warehouse portal: mark notifications read ---
      if (body.action === "warehouse-mark-read") {
        const { user_id, warehouse_id, notification_ids } = body;
        if (!user_id || !warehouse_id) return json({ error: "Missing fields" }, 400);

        const { data: wUser } = await supabase
          .from("warehouse_users")
          .select("id")
          .eq("id", user_id)
          .eq("warehouse_id", warehouse_id)
          .eq("is_active", true)
          .maybeSingle();
        if (!wUser) return json({ error: "Unauthorized" }, 401);

        if (notification_ids && notification_ids.length > 0) {
          await supabase.from("warehouse_notifications")
            .update({ is_read: true })
            .in("id", notification_ids)
            .eq("warehouse_id", warehouse_id);
        }

        return json({ success: true });
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

    // --- GET requests ---
    if (req.method === "GET") {
      const action = new URL(req.url).searchParams.get("action");

      // Warehouse data endpoints (authenticated by warehouse_id in query)
      if (action === "warehouse-data") {
        const warehouseId = url.searchParams.get("warehouse_id");
        const userId = url.searchParams.get("user_id");
        if (!warehouseId || !userId) return json({ error: "Missing warehouse_id or user_id" }, 400);

        // Verify the user exists and is active
        const { data: wUser } = await supabase
          .from("warehouse_users")
          .select("id, warehouse_id")
          .eq("id", userId)
          .eq("warehouse_id", warehouseId)
          .eq("is_active", true)
          .maybeSingle();
        if (!wUser) return json({ error: "Unauthorized" }, 401);

        const [reqRes, notifRes] = await Promise.all([
          supabase.from("warehouse_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("warehouse_notifications")
            .select("*")
            .eq("warehouse_id", warehouseId)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        return json({
          requests: reqRes.data || [],
          notifications: notifRes.data || [],
        });
      }

      const { data: tokenRow } = await supabase
        .from("prep_access_tokens")
        .select("id, is_active, excluded_brand_ids, excluded_product_ids, label")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!tokenRow) return json({ error: "Invalid or expired link" }, 401);

      const excludedBrandIds: string[] = tokenRow.excluded_brand_ids || [];
      const excludedProductIds: string[] = tokenRow.excluded_product_ids || [];

      // action already declared above

      // --- COSTS SUMMARY endpoint ---
      if (action === "costs-summary") {
        const dateFrom = url.searchParams.get("from") || "";
        const dateTo = url.searchParams.get("to") || "";

        let query = supabase
          .from("orders")
          .select("id, status, created_at, user_id")
          .not("status", "eq", "cancelled");

        if (dateFrom) query = query.gte("created_at", dateFrom);
        if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");

        const { data: orders, error: ordersErr } = await query.order("created_at", { ascending: false });
        if (ordersErr) throw ordersErr;

        if (!orders || orders.length === 0) {
          return json({ orders: [], summary: { total_cost: 0, total_orders: 0, total_items: 0 } });
        }

        const orderIds = orders.map((o: any) => o.id);

        const { data: items } = await supabase
          .from("order_items")
          .select("id, order_id, product_id, quantity, price")
          .in("order_id", orderIds);

        const productIds = [...new Set((items || []).map((i: any) => i.product_id))];

        const { data: products } = await supabase
          .from("products")
          .select("id, title, brand_id")
          .in("id", productIds);

        const { data: costs } = await supabase
          .from("product_costs")
          .select("product_id, cost")
          .in("product_id", productIds);

        const productMap = new Map((products || []).map((p: any) => [p.id, p]));
        const costMap = new Map((costs || []).map((c: any) => [c.product_id, c.cost]));

        const isExcludedItem = (productId: string): boolean => {
          if (excludedProductIds.includes(productId)) return true;
          const product = productMap.get(productId);
          if (product && product.brand_id && excludedBrandIds.includes(product.brand_id)) return true;
          return false;
        };

        let totalCost = 0;
        let totalItems = 0;
        let validOrderCount = 0;

        const orderSummaries: any[] = [];

        for (const order of orders) {
          const orderItems = (items || []).filter((i: any) => i.order_id === order.id);
          let orderCost = 0;
          let orderItemCount = 0;
          const itemDetails: any[] = [];

          for (const item of orderItems) {
            if (isExcludedItem(item.product_id)) continue;
            const cost = costMap.get(item.product_id) || 0;
            const itemTotalCost = cost * item.quantity;
            orderCost += itemTotalCost;
            orderItemCount += item.quantity;
            const product = productMap.get(item.product_id);
            itemDetails.push({
              product_id: item.product_id,
              title: product?.title || "Unknown",
              quantity: item.quantity,
              unit_cost: cost,
              total_cost: itemTotalCost,
              sale_price: item.price,
            });
          }

          if (orderItemCount === 0) continue;

          validOrderCount++;
          totalCost += orderCost;
          totalItems += orderItemCount;

          orderSummaries.push({
            id: order.id,
            created_at: order.created_at,
            status: order.status,
            total_cost: orderCost,
            item_count: orderItemCount,
            items: itemDetails,
          });
        }

        return json({
          orders: orderSummaries,
          summary: {
            total_cost: totalCost,
            total_orders: validOrderCount,
            total_items: totalItems,
          },
        });
      }

      // --- ANALYTICS endpoint ---
      if (action === "analytics") {
        const dateFrom = url.searchParams.get("from") || "";
        const dateTo = url.searchParams.get("to") || "";

        let query = supabase
          .from("orders")
          .select("id, status, created_at")
          .not("status", "eq", "cancelled");

        if (dateFrom) query = query.gte("created_at", dateFrom);
        if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");

        const { data: orders, error: ordersErr } = await query.order("created_at", { ascending: false });
        if (ordersErr) throw ordersErr;

        if (!orders || orders.length === 0) {
          return json({
            total_orders: 0,
            status_breakdown: {},
            orders_by_day: [],
          });
        }

        const orderIds = orders.map((o: any) => o.id);
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, product_id, quantity")
          .in("order_id", orderIds);

        const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
        const { data: products } = await supabase
          .from("products")
          .select("id, brand_id")
          .in("id", productIds);

        const productMap = new Map((products || []).map((p: any) => [p.id, p]));

        const isExcludedItem = (productId: string): boolean => {
          if (excludedProductIds.includes(productId)) return true;
          const product = productMap.get(productId);
          if (product && product.brand_id && excludedBrandIds.includes(product.brand_id)) return true;
          return false;
        };

        // Count valid orders (those with at least one non-excluded item)
        const validOrderIds = new Set<string>();
        let totalItems = 0;
        for (const item of items || []) {
          if (!isExcludedItem(item.product_id)) {
            validOrderIds.add(item.order_id);
            totalItems += item.quantity;
          }
        }

        const validOrders = orders.filter((o: any) => validOrderIds.has(o.id));

        // Status breakdown
        const statusBreakdown: Record<string, number> = {};
        for (const o of validOrders) {
          statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
        }

        // Orders by day
        const dayMap = new Map<string, number>();
        for (const o of validOrders) {
          const day = o.created_at.split("T")[0];
          dayMap.set(day, (dayMap.get(day) || 0) + 1);
        }
        const ordersByDay = [...dayMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));

        return json({
          total_orders: validOrders.length,
          total_items: totalItems,
          status_breakdown: statusBreakdown,
          orders_by_day: ordersByDay,
        });
      }

      // --- DEFAULT: GET orders ---
      const statusFilter = url.searchParams.get("status") || "processing";
      const statuses = statusFilter.split(",").map((s) => s.trim());

      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("id, status, created_at, notes, address_id, user_id, payment_method")
        .in("status", statuses)
        .order("created_at", { ascending: true });
      if (ordersErr) throw ordersErr;

      const orderIds = (orders || []).map((o: any) => o.id);
      if (orderIds.length === 0) return json({ orders: [] });

      // Fetch user profiles for customer names
      const userIds = [...new Set((orders || []).map((o: any) => o.user_id))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", userIds);
        for (const p of profiles || []) {
          profileMap.set(p.user_id, p.full_name || p.phone || "Customer");
        }
      }

      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, quantity, price")
        .in("order_id", orderIds);

      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      
      const { data: products } = await supabase
        .from("products")
        .select("id, title, slug, volume_ml, volume_unit, brand_id")
        .in("id", productIds);

      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true });

      // Fetch product costs
      const { data: costs } = await supabase
        .from("product_costs")
        .select("product_id, cost")
        .in("product_id", productIds);

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      const costMap = new Map((costs || []).map((c: any) => [c.product_id, c.cost]));
      const imageMap = new Map<string, string[]>();
      for (const img of images || []) {
        if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
        imageMap.get(img.product_id)!.push(img.image_url);
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

      const isExcludedItem = (productId: string): boolean => {
        if (excludedProductIds.includes(productId)) return true;
        const product = productMap.get(productId);
        if (product && product.brand_id && excludedBrandIds.includes(product.brand_id)) return true;
        return false;
      };

      const enrichedOrders: any[] = [];

      for (const order of orders || []) {
        const orderItems = (items || []).filter((i: any) => i.order_id === order.id);
        const warehouseItems: any[] = [];

        for (const item of orderItems) {
          if (isExcludedItem(item.product_id)) continue;
          const product = productMap.get(item.product_id);
          const cost = costMap.get(item.product_id) || 0;
          warehouseItems.push({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            cost: cost,
            total_cost: cost * item.quantity,
            product: product
              ? {
                  id: product.id,
                  title: product.title,
                  volume: product.volume_ml ? `${product.volume_ml}${product.volume_unit || "ml"}` : null,
                  image_url: imageMap.get(product.id)?.[0] || null,
                  all_images: imageMap.get(product.id) || [],
                }
              : null,
          });
        }

        if (warehouseItems.length === 0) continue;

        const address = order.address_id ? addressMap.get(order.address_id) : null;
        const orderTotalCost = warehouseItems.reduce((s: number, i: any) => s + i.total_cost, 0);

        enrichedOrders.push({
          id: order.id,
          status: order.status,
          created_at: order.created_at,
          notes: order.notes,
          customer_name: profileMap.get(order.user_id) || "Customer",
          payment_method: order.payment_method || "cod",
          total_cost: orderTotalCost,
          items: warehouseItems,
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

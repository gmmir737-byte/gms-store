import type { Handler } from "@netlify/functions";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

// Local-only diagnostic: log presence (true/false) of important env var names
// This logs only when running in Netlify Dev or when NODE_ENV is development.
const _isLocalDiag = process.env.NETLIFY_DEV === "true" || process.env.NETLIFY === "true" || process.env.NODE_ENV === "development";
if (_isLocalDiag) {
  const _varsToCheck = [
    "VITE_RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE",
    "VITE_SUPABASE_ANON_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM",
  ];
  const _presence: Record<string, boolean> = {};
  for (const n of _varsToCheck) {
    _presence[n] = Boolean(process.env[n]);
  }
  console.info("[env-diag] razorpay-create-order: env presence (only names, no values):", _presence);
}

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export const handler: Handler = async (event) => {
  try {
    if (_isLocalDiag) {
      const _varsToCheck = [
        "VITE_RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_WEBHOOK_SECRET",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE",
        "VITE_SUPABASE_ANON_KEY",
        "RESEND_API_KEY",
        "RESEND_FROM",
      ];
      const _presence: Record<string, boolean> = {};
      for (const n of _varsToCheck) _presence[n] = Boolean(process.env[n]);
      console.info("[env-diag] razorpay-create-order (request): env presence (names only):", _presence);
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    interface CreateOrderBody {
      user_id: string;
      order_number: string;
      total: number;
      currency?: string;
      shipping_address: Record<string, unknown>;
      billing_address?: Record<string, unknown> | null;
      items: Array<{
        product_id: string;
        product_name: string;
        product_image?: string;
        quantity: number;
        price: number;
        total: number;
      }>;
      subtotal?: number;
      discount?: number;
      shipping_cost?: number;
      tax?: number;
      coupon_id?: string | null;
      notes?: string | null;
    }

    const {
      user_id,
      order_number,
      total,
      currency,
      shipping_address,
      billing_address,
      items,
      subtotal,
      discount,
      shipping_cost,
      tax,
      coupon_id,
      notes,
    } = body as CreateOrderBody;

    if (!user_id || !order_number || total == null || !items || !Array.isArray(items)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required order fields" }) };
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return { statusCode: 500, body: JSON.stringify({ error: "Payment gateway not configured" }) };
    }

    const amount = Math.round(Number(total) * 100);
    const payload = {
      amount,
      currency: currency || "INR",
      receipt: order_number,
      payment_capture: 1,
      notes: {
        order_number,
      },
    };

    const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    interface RazorpayError {
      description?: string;
    }

    type RazorpayOrderResponse = { error?: RazorpayError } & Record<string, unknown>;

    const rzpData = await rzpRes.json() as RazorpayOrderResponse;
    if (!rzpRes.ok) {
      console.error("Razorpay order error", rzpData);
      return { statusCode: 502, body: JSON.stringify({ error: rzpData.error?.description || "Failed to create Razorpay order" }) };
    }

    // Build the order insert object containing only columns defined in the
    // base `orders` table schema. Razorpay-specific columns are omitted to
    // match the current DB schema (migration may not be applied).
    const orderInsert = {
      order_number,
      user_id,
      status: "pending",
      payment_status: "pending",
      payment_method: "razorpay",
      payment_id: null,
      subtotal: subtotal ?? 0,
      discount: discount ?? 0,
      shipping_cost: shipping_cost ?? 0,
      tax: tax ?? 0,
      total,
      coupon_id: coupon_id ?? null,
      shipping_address,
      billing_address: billing_address || shipping_address,
      notes: notes || null,
      // Intentionally omit any `razorpay_*` columns when inserting so the
      // payload matches the DB schema that may not include those fields.
    };

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([orderInsert]),
    });

    if (!orderRes.ok) {
      const orderError = await orderRes.json().catch(() => null);
      console.error("Supabase order insert failed", orderError);
      return { statusCode: 502, body: JSON.stringify({ error: "Failed to save order" }) };
    }

    const orderLookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=id,order_number&order_number=eq.${encodeURIComponent(order_number)}`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        },
      }
    );

    type OrderLookupResponseItem = {
      id: number;
      order_number: string;
    };

    const orderLookupData = await orderLookupRes.json() as OrderLookupResponseItem[];
    if (!orderLookupRes.ok || !Array.isArray(orderLookupData) || orderLookupData.length === 0) {
      console.error("Supabase order lookup failed", orderLookupData);
      return { statusCode: 502, body: JSON.stringify({ error: "Failed to retrieve saved order" }) };
    }

    const order = orderLookupData[0];
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));

    const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderItems),
    });

    if (!itemsRes.ok) {
      const itemsData = await itemsRes.text();
      console.error("Supabase order_items insert failed", itemsData);
      return { statusCode: 502, body: JSON.stringify({ error: "Failed to save order items" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ error: null, razorpayOrder: rzpData, order }) };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

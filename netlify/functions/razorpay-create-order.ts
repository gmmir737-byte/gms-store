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

async function getRazorpayCredentials(supabaseUrl: string, supabaseKey: string) {
  let keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
  let keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET || "";

  if ((!keyId || !keySecret) && supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/settings?select=razorpay_key,razorpay_secret&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          if (!keyId && data[0].razorpay_key) keyId = data[0].razorpay_key;
          if (!keySecret && data[0].razorpay_secret) keySecret = data[0].razorpay_secret;
        }
      }
    } catch (e) {
      console.warn("Could not fetch razorpay settings from DB:", e);
    }
  }

  return { keyId, keySecret };
}

export const handler: Handler = async (event) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY || "";

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

    // Validate delivery locality availability against delivery_areas table
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE && shipping_address) {
      try {
        const areaCheckRes = await fetch(
          `${SUPABASE_URL}/rest/v1/delivery_areas?select=id,area_name,city,state,pincode,is_active,delivery_charge,estimated_delivery_time`,
          {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
          }
        );

        if (areaCheckRes.ok) {
          const allAreas = (await areaCheckRes.json()) as Array<{
            id: string;
            area_name: string;
            is_active: boolean;
            delivery_charge?: number | null;
            estimated_delivery_time?: string | null;
          }>;

          // If store has defined delivery areas, enforce active locality validation
          if (Array.isArray(allAreas) && allAreas.length > 0) {
            const requestedArea = ((shipping_address.area as string) || "").trim().toLowerCase();
            const matchedArea = allAreas.find(
              (a) => a.is_active && a.area_name.trim().toLowerCase() === requestedArea
            );

            if (!matchedArea) {
              return {
                statusCode: 400,
                body: JSON.stringify({
                  error: `Delivery is currently unavailable in the selected locality (${
                    shipping_address.area || "unspecified"
                  }). Please choose a serviceable delivery locality.`,
                }),
              };
            }

            // Enrich shipping address snapshot with verified delivery area details
            shipping_address.delivery_charge = matchedArea.delivery_charge ?? null;
            shipping_address.estimated_delivery_time = matchedArea.estimated_delivery_time ?? null;
          }
        }
      } catch (err) {
        console.warn("Delivery area validation check notice:", err);
      }
    }

    const { keyId, keySecret } = await getRazorpayCredentials(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    if (!keyId) {
      return { statusCode: 500, body: JSON.stringify({ error: "Payment gateway key ID not configured" }) };
    }

    const amount = Math.round(Number(total) * 100);
    let realRzpOrderId: string | null = null;

    if (keySecret) {
      const payload = {
        amount,
        currency: currency || "INR",
        receipt: order_number,
        payment_capture: 1,
        notes: {
          order_number,
        },
      };

      try {
        const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await rzpRes.json() as Record<string, unknown>;
        if (rzpRes.ok && data && typeof data.id === "string") {
          realRzpOrderId = data.id as string;
        } else {
          console.warn("Razorpay API order creation returned warning/error:", data);
        }
      } catch (e) {
        console.warn("Failed calling Razorpay API:", e);
      }
    }

    const rzpData = {
      id: realRzpOrderId,
      amount,
      currency: currency || "INR",
      status: realRzpOrderId ? "created" : "pending",
    };

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

    const clientAuth = event.headers.authorization || event.headers.Authorization;
    const supabaseAuthHeader = (clientAuth && clientAuth.startsWith("Bearer "))
      ? clientAuth
      : `Bearer ${SUPABASE_SERVICE_ROLE}`;

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: supabaseAuthHeader,
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
          Authorization: supabaseAuthHeader,
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
        Authorization: supabaseAuthHeader,
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

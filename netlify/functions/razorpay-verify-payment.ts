import type { Handler } from "@netlify/functions";
import crypto from "crypto";

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

// Local-only diagnostic: log presence (true/false) of important env var names
const _isLocalDiag_verify = process.env.NETLIFY_DEV === "true" || process.env.NETLIFY === "true" || process.env.NODE_ENV === "development";
if (_isLocalDiag_verify) {
  const _varsToCheck_verify = [
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
  const _presence_verify: Record<string, boolean> = {};
  for (const n of _varsToCheck_verify) _presence_verify[n] = Boolean(process.env[n]);
  console.info("[env-diag] razorpay-verify-payment: env presence (only names, no values):", _presence_verify);
}

export const handler: Handler = async (event) => {
  try {
    if (_isLocalDiag_verify) {
      const _varsToCheck_verify = [
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
      const _presence_verify: Record<string, boolean> = {};
      for (const n of _varsToCheck_verify) _presence_verify[n] = Boolean(process.env[n]);
      console.info("[env-diag] razorpay-verify-payment (request): env presence (names only):", _presence_verify);
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = body as any;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !order_id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing payment verification fields" }) };
    }

    if (!RAZORPAY_KEY_SECRET) {
      return { statusCode: 500, body: JSON.stringify({ error: "Payment gateway not configured" }) };
    }
    // Fetch existing order to guard against duplicate/late callbacks
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}&select=*`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      },
    });

    const exist = await getRes.json();
    if (!getRes.ok) {
      console.error('Failed to fetch order for verification', { status: getRes.status, body: exist });
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch order for verification' }) };
    }

    const orderRecord = Array.isArray(exist) && exist.length ? exist[0] : null;
    if (!orderRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
    }

    if (orderRecord.payment_status === 'paid') {
      // Already paid — return success to idempotently acknowledge
      return { statusCode: 200, body: JSON.stringify({ error: null, order: orderRecord, message: 'Order already marked as paid' }) };
    }

    // Validate signature using HMAC SHA256 (Razorpay spec)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(payload).digest();
    let providedSigBuffer: Buffer;
    try {
      providedSigBuffer = Buffer.from(razorpay_signature, 'hex');
    } catch (e) {
      // signature not hex; fall back to utf8
      providedSigBuffer = Buffer.from(razorpay_signature);
    }

    // Use timingSafeEqual when buffers are same length; otherwise fail
    if (providedSigBuffer.length !== expectedSignature.length || !crypto.timingSafeEqual(expectedSignature, providedSigBuffer)) {
      console.error('Signature mismatch', { expected: expectedSignature.toString('hex'), provided: razorpay_signature });
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment signature verification failed' }) };
    }

    // Update order as paid
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        payment_status: 'paid',
        payment_id: razorpay_payment_id,
        status: 'processing',
      }),
    });

    const updatedData = await updateRes.json();
    if (!updateRes.ok || !Array.isArray(updatedData) || updatedData.length === 0) {
      console.error('Supabase order update failed', updatedData);
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to update order status' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ error: null, order: updatedData[0] }) };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

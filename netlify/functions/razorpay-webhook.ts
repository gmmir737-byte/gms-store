import type { Handler } from "@netlify/functions";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

// Local-only diagnostic: log presence (true/false) of important env var names
const _isLocalDiag_webhook = process.env.NETLIFY_DEV === "true" || process.env.NETLIFY === "true" || process.env.NODE_ENV === "development";
if (_isLocalDiag_webhook) {
  const _varsToCheck_webhook = [
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
  const _presence_webhook: Record<string, boolean> = {};
  for (const n of _varsToCheck_webhook) _presence_webhook[n] = Boolean(process.env[n]);
  console.info("[env-diag] razorpay-webhook: env presence (only names, no values):", _presence_webhook);
}

export const handler: Handler = async (event) => {
  try {
    if (_isLocalDiag_webhook) {
      const _varsToCheck_webhook = [
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
      const _presence_webhook: Record<string, boolean> = {};
      for (const n of _varsToCheck_webhook) _presence_webhook[n] = Boolean(process.env[n]);
      console.info("[env-diag] razorpay-webhook (request): env presence (names only):", _presence_webhook);
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error('Missing RAZORPAY_WEBHOOK_SECRET');
      return { statusCode: 500, body: JSON.stringify({ error: 'Webhook secret not configured' }) };
    }

    // Razorpay sends signature in header 'x-razorpay-signature'
    const signature = (event.headers['x-razorpay-signature'] || event.headers['X-Razorpay-Signature'] || '') as string;
    const body = event.body || '';

    const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(body).digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(signature, 'hex');
    } catch (e) {
      provided = Buffer.from(signature);
    }

    if (provided.length !== expected.length || !crypto.timingSafeEqual(expected, provided)) {
      console.error('Invalid webhook signature', { signature });
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const payload = JSON.parse(body);
    const eventType = payload.event || payload.type || '';

    // Handle payment captured / payment authorized / order.paid events
    if (eventType === 'payment.captured' || eventType === 'payment.authorized' || eventType === 'order.paid') {
      // Payment entity location
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_entity || payload?.payload?.payment?.entity;
      const payment = paymentEntity || payload.payload?.payment?.entity || null;
      const razorpay_payment_id = payment?.id || payment?.payment_id || null;
      const razorpay_order_id = payment?.order_id || null;
      const noteOrderNumber = payment?.notes?.order_number || null;

      if (!razorpay_order_id || !razorpay_payment_id) {
        console.error('Webhook missing payment identifiers', payload);
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing payment identifiers in webhook' }) };
      }

      // Prefer order_number lookup so this handler works against the base orders
      // table schema without requiring optional razorpay_* columns.
      if (!noteOrderNumber) {
        console.error('Webhook missing order_number note for lookup', payload);
        return { statusCode: 400, body: JSON.stringify({ error: 'Unable to locate order without order_number metadata' }) };
      }

      const orderQuery = `order_number=eq.${encodeURIComponent(noteOrderNumber)}`;

      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?${orderQuery}&select=*`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        },
      });

      const exist = await getRes.json();
      if (!getRes.ok) {
        console.error('Failed to fetch order for webhook', { status: getRes.status, body: exist });
        return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch order' }) };
      }

      const orderRecord = Array.isArray(exist) && exist.length ? exist[0] : null;
      if (!orderRecord) {
        console.error('Order not found for webhook', { razorpay_order_id });
        return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
      }

      if (orderRecord.payment_status === 'paid') {
        // Idempotent: already processed
        return { statusCode: 200, body: JSON.stringify({ error: null, message: 'Already processed' }) };
      }

      // Update order as paid, but do not send email here to avoid duplicates (frontend handles email)
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderRecord.id)}`, {
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
          payment_verified_at: new Date().toISOString(),
          status: 'processing',
        }),
      });

      const updated = await updateRes.json() as Array<Record<string, unknown>>;
      if (!updateRes.ok) {
        console.error('Failed to update order in webhook', updated);
        return { statusCode: 502, body: JSON.stringify({ error: 'Failed to update order' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ error: null, order: updated[0] }) };
    }

    // For other events, acknowledge
    return { statusCode: 200, body: JSON.stringify({ error: null, message: 'Event ignored' }) };
  } catch (err) {
    console.error('Webhook handler error', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

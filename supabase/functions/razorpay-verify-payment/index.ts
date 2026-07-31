import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') || '';

if (!RAZORPAY_KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing required environment variables');
}

async function hmacSha256(key: string, message: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !order_id) {
      return new Response(JSON.stringify({ error: 'Missing payment verification fields' }), { status: 400 });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500 });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = await hmacSha256(RAZORPAY_KEY_SECRET, payload);

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Payment signature verification failed' }), { status: 400 });
    }

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
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        payment_verified_at: new Date().toISOString(),
        status: 'processing',
      }),
    });

    const updatedData = await updateRes.json();
    if (!updateRes.ok || !Array.isArray(updatedData) || updatedData.length === 0) {
      console.error('Supabase order update failed', updatedData);
      return new Response(JSON.stringify({ error: 'Failed to update order status' }), { status: 502 });
    }

    return new Response(JSON.stringify({ error: null, order: updatedData[0] }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});

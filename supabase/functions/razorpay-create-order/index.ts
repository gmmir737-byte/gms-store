import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') || '';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing required environment variables');
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      user_id,
      order_number,
      total,
      currency,
      shipping_address,
      billing_address,
      items,
      email,
      phone,
      subtotal,
      discount,
      shipping_cost,
      tax,
      coupon_id,
      notes,
    } = body;

    if (!user_id || !order_number || total == null || !items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'Missing required order fields' }), { status: 400 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500 });
    }

    const amount = Math.round(Number(total) * 100);
    const payload = {
      amount,
      currency: currency || 'INR',
      receipt: order_number,
      payment_capture: 1,
    };

    const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('Razorpay order error', rzpData);
      return new Response(JSON.stringify({ error: rzpData.error?.description || 'Failed to create Razorpay order' }), { status: 502 });
    }

    const orderInsert = {
      order_number,
      user_id,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'razorpay',
      payment_id: null,
      subtotal: subtotal ?? 0,
      discount: discount ?? 0,
      shipping_cost: shipping_cost ?? 0,
      tax: tax ?? 0,
      total,
      shipping_address,
      billing_address: billing_address || shipping_address,
      notes: notes || null,
      razorpay_order_id: rzpData.id,
      razorpay_order_status: rzpData.status,
      razorpay_order_amount: rzpData.amount,
      razorpay_order_currency: rzpData.currency,
      razorpay_order_created_at: new Date(rzpData.created_at * 1000).toISOString(),
    };

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([orderInsert]),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !Array.isArray(orderData) || orderData.length === 0) {
      console.error('Supabase order insert failed', orderData);
      return new Response(JSON.stringify({ error: 'Failed to save order' }), { status: 502 });
    }

    const order = orderData[0];
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));

    const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderItems),
    });

    if (!itemsRes.ok) {
      const itemsData = await itemsRes.text();
      console.error('Supabase order_items insert failed', itemsData);
      return new Response(JSON.stringify({ error: 'Failed to save order items' }), { status: 502 });
    }

    return new Response(JSON.stringify({ error: null, razorpayOrder: rzpData, order }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});

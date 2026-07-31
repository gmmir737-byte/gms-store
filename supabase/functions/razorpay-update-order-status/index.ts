import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing required environment variables');
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { order_id, reason } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'Missing order_id' }), { status: 400 });
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
        payment_status: 'failed',
        status: 'cancelled',
        notes: reason ? `Payment failed: ${reason}` : 'Payment failed or cancelled',
      }),
    });

    const updatedData = await updateRes.json();
    if (!updateRes.ok || !Array.isArray(updatedData) || updatedData.length === 0) {
      console.error('Supabase order status update failed', updatedData);
      return new Response(JSON.stringify({ error: 'Failed to update order status' }), { status: 502 });
    }

    return new Response(JSON.stringify({ error: null, order: updatedData[0] }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});

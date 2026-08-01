import type { Handler } from "@netlify/functions";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    interface UpdateOrderStatusBody {
      order_id: string;
      reason?: string | null;
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { order_id, reason } = body as UpdateOrderStatusBody;

    if (!order_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing order_id' }) };
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
        notes: reason || null,
      }),
    });

    const updatedData = await updateRes.json() as Array<Record<string, unknown>>;
    if (!updateRes.ok) {
      console.error('Failed to update order status', updatedData);
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to update order' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ error: null, order: updatedData[0] }) };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

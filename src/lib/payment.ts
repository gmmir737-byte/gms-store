import { retryFetch } from './net';

function resolveFunctionUrl(endpoint: string) {
  if (!endpoint || /^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return endpoint;
  }

  return `${supabaseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

async function postJson(endpoint: string, payload: unknown) {
  const url = resolveFunctionUrl(endpoint);

  try {
    const res = await retryFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, {
      retries: 3,
      retryDelayMs: 300,
      timeoutMs: 10000,
      retryOnStatus: [429, 500, 502, 503, 504],
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Payment service returned an invalid response' };
    }

    if (!res.ok) {
      return { error: data?.error || 'Payment service request failed' };
    }

    return data;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to reach the payment service',
    };
  }
}

export async function createRazorpayOrder(payload: {
  user_id: string;
  order_number: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  currency: string;
  shipping_address: any;
  billing_address: any;
  items: Array<{ product_id: string; product_name: string; product_image: string | null; quantity: number; price: number; total: number }>;
  email?: string;
  phone?: string;
  coupon_id?: string | null;
  notes?: string | null;
}) {
  const endpoint = import.meta.env.VITE_RAZORPAY_ORDER_CREATE_URL || '/functions/v1/razorpay-create-order';
  return postJson(endpoint, payload);
}

export async function verifyRazorpayPayment(payload: {
  order_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  const endpoint = import.meta.env.VITE_RAZORPAY_PAYMENT_VERIFY_URL || '/functions/v1/razorpay-verify-payment';
  return postJson(endpoint, payload);
}

export async function markRazorpayOrderFailed(payload: {
  order_id: string;
  reason?: string;
}) {
  const endpoint = import.meta.env.VITE_RAZORPAY_ORDER_FAIL_URL || '/functions/v1/razorpay-update-order-status';
  return postJson(endpoint, payload);
}

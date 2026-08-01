import { retryFetch } from './net';

type OrderAddress = unknown;

type PayloadError = { error?: string };

function resolveFunctionUrl(endpoint: string) {
  if (!endpoint || /^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return endpoint;
  }

  // If calling a local Netlify function path, keep it relative so the browser
  // will request from the same origin (Netlify Dev or production host).
  if (endpoint.startsWith('/.netlify/')) {
    return endpoint;
  }

  // If calling a Supabase Edge Function (path contains /functions), use the
  // functions subdomain (e.g. project.functions.supabase.co).
  try {
    const url = new URL(supabaseUrl);
    const host = url.host || '';

    if (endpoint.startsWith('/functions') || endpoint.startsWith('functions')) {
      // Replace the main supabase host with the functions subdomain when possible
      // e.g. ysvs...supabase.co -> ysvs...functions.supabase.co
      const functionsHost = host.replace('.supabase.co', '.functions.supabase.co');
      // If endpoint is like /functions/v1/<name>, strip the prefix and call /<name> on functions subdomain
      const m = endpoint.match(/^\/?functions\/v1\/(.+)$/i);
      const fnPath = m ? `/${m[1]}` : (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
      return `${url.protocol}//${functionsHost}${fnPath}`;
    }

    return `${supabaseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  } catch {
    return `${supabaseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }
}

async function postJson<T = unknown>(endpoint: string, payload: unknown): Promise<T> {
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

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Payment service returned an invalid response' };
    }

    if (!res.ok) {
      console.error('Payment service error', { url, status: res.status, body: data });
      const body = data as PayloadError;
      return { error: body.error || `Payment service request failed (${res.status})` } as T;
    }

    return data as T;
  } catch (error) {
    console.error('Payment service unreachable', { url, error });
    return {
      error: error instanceof Error ? `${error.name}: ${error.message}` : 'Unable to reach the payment service',
    } as T;
  }
}

export interface RazorpayOrderPayloadItem {
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  total: number;
}

export interface CreateRazorpayOrderPayload {
  user_id: string;
  order_number: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  currency: string;
  shipping_address: OrderAddress;
  billing_address: OrderAddress;
  items: RazorpayOrderPayloadItem[];
  email?: string;
  phone?: string;
  coupon_id?: string | null;
  notes?: string | null;
}

export interface CreateRazorpayOrderResponse {
  error?: string | null;
  razorpayOrder?: { id: string; amount: number; currency: string; [key: string]: unknown };
  order?: { id: string; order_number: string; [key: string]: unknown };
}

export async function createRazorpayOrder(payload: CreateRazorpayOrderPayload) {
  const endpoint = import.meta.env.VITE_RAZORPAY_ORDER_CREATE_URL || '/.netlify/functions/razorpay-create-order';
  return postJson<CreateRazorpayOrderResponse>(endpoint, payload);
}

export interface VerifyRazorpayPaymentPayload {
  order_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyRazorpayPaymentResponse {
  error?: string | null;
  order?: { id: string; [key: string]: unknown };
}

export async function verifyRazorpayPayment(payload: VerifyRazorpayPaymentPayload) {
  const endpoint = import.meta.env.VITE_RAZORPAY_PAYMENT_VERIFY_URL || '/.netlify/functions/razorpay-verify-payment';
  return postJson<VerifyRazorpayPaymentResponse>(endpoint, payload);
}

export async function markRazorpayOrderFailed(payload: {
  order_id: string;
  reason?: string;
}) {
  const endpoint = import.meta.env.VITE_RAZORPAY_ORDER_FAIL_URL || '/.netlify/functions/razorpay-update-order-status';
  return postJson(endpoint, payload);
}

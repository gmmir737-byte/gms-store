// Supabase Edge Function (Deno)
// Deploy to Supabase Functions as `otp-send`

import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || '';
const OTP_EXPIRY_MIN = Number(Deno.env.get('OTP_EXPIRY_MIN') || '10');
const RATE_LIMIT_ATTEMPTS = Number(Deno.env.get('OTP_RATE_LIMIT_ATTEMPTS') || '5');
const RATE_LIMIT_BLOCK_MIN = Number(Deno.env.get('OTP_RATE_LIMIT_BLOCK_MIN') || '15');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function createOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Helper: generate 6-digit OTP
function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: SHA256
async function sha256(input: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return createOptionsResponse();
  if (req.method !== 'POST') return createJsonResponse({ error: 'Method not allowed' }, 405);
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.email || '').toString().trim();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!identifier) return createJsonResponse({ error: 'Missing identifier' }, 400);
    const normalizedIdentifier = identifier.includes('@') ? identifier.toLowerCase() : identifier;

    // Use Supabase REST to update rate limit and insert OTP using service role key
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE')!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return createJsonResponse({ error: 'Server not configured' }, 500);
    }

    // Rate limit key: email or ip
    const key = `otp:${normalizedIdentifier}`;

    // Check rate limit
    const rlRes = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?key=eq.${encodeURIComponent(key)}`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
    });
    const rlData = await rlRes.json();
    let blockedUntil = null;
    if (Array.isArray(rlData) && rlData.length > 0) blockedUntil = rlData[0].blocked_until;
    if (blockedUntil && new Date(blockedUntil) > new Date()) {
      return createJsonResponse({ error: 'Too many requests. Try later.' }, 429);
    }

    // Create OTP
    const otp = genOtp();
    const salt = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const hash = await sha256(otp + salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000).toISOString();

    // Insert OTP record
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/auth_otps`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([{ email: normalizedIdentifier, otp_hash: hash, salt, expires_at: expiresAt }]),
    });

    if (!insertRes.ok) {
      return createJsonResponse({ error: 'Failed to store OTP' }, 500);
    }

    // Update rate limit attempts: increment or insert
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ key, attempts: 1, blocked_until: null }]),
    });
    // Note: if already exists, PATCH instead
    if (upsertRes.status === 409) {
      // increment
      await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?key=eq.${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attempts: `auth_rate_limits.attempts+1` }),
      });
    }

    // Send email via SendGrid if configured
    if (SENDGRID_API_KEY && FROM_EMAIL) {
      const sendRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: normalizedIdentifier }], subject: 'Your verification code' }],
          from: { email: FROM_EMAIL },
          content: [{ type: 'text/plain', value: `Your verification code is: ${otp}. It expires in ${OTP_EXPIRY_MIN} minutes.` }],
        }),
      });

      if (!sendRes.ok) {
        // fallback: return code in response for manual testing
        return createJsonResponse({ error: null, note: 'sendgrid_failed', code: otp }, 200);
      }
    } else {
      // No email provider configured; return code in response for development/testing
      return createJsonResponse({ error: null, note: 'dev_mode', code: otp }, 200);
    }

    return createJsonResponse({ error: null }, 200);
  } catch (err) {
    console.error(err);
    return createJsonResponse({ error: 'Internal error' }, 500);
  }
});

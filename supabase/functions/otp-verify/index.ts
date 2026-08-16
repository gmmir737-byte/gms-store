import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

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
    const code = (body.code || '').toString();
    if (!identifier || !code) return createJsonResponse({ error: 'Missing fields' }, 400 );
    const normalizedIdentifier = identifier.includes('@') ? identifier.toLowerCase() : identifier;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE')!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return createJsonResponse({ error: 'Server not configured' }, 500);
    }

    // Find latest non-consumed OTP for email
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_otps?email=eq.${encodeURIComponent(normalizedIdentifier)}&consumed=eq.false&order=created_at.desc&limit=1`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return createJsonResponse({ error: 'Invalid or expired code' }, 400);
    const otpRecord = rows[0];
    if (new Date(otpRecord.expires_at) < new Date()) return createJsonResponse({ error: 'OTP expired' }, 400);

    // Verify
    const hash = await sha256(code + otpRecord.salt);
    if (hash !== otpRecord.otp_hash) {
      // increment attempts
      await fetch(`${SUPABASE_URL}/rest/v1/auth_otps?id=eq.${otpRecord.id}`, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempts: otpRecord.attempts + 1 }),
      });
      return createJsonResponse({ error: 'Invalid code' }, 400);
    }

    // Mark consumed
    await fetch(`${SUPABASE_URL}/rest/v1/auth_otps?id=eq.${otpRecord.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumed: true }),
    });

    // If verification for signup, optionally create a profile or perform actions here.

    return createJsonResponse({ error: null }, 200);
  } catch (err) {
    console.error(err);
    return createJsonResponse({ error: 'Internal error' }, 500);
  }
});

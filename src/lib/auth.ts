import { supabase, auth } from './supabase';

const PHONE_AUTH_ENABLED = import.meta.env.VITE_SUPABASE_PHONE_AUTH_ENABLED !== 'false';

type SignInResult = { error: string | null; data?: any };

// Simple in-memory brute-force protection (client-side advisory only)
const ATTEMPT_LIMIT = 5;
const BLOCK_MS = 5 * 60 * 1000; // 5 minutes
const attempts: Record<string, { count: number; firstAt: number }> = {};

function recordAttempt(key: string) {
  const now = Date.now();
  const cur = attempts[key];
  if (!cur) attempts[key] = { count: 1, firstAt: now };
  else attempts[key].count += 1;
}

function isBlocked(key: string) {
  const cur = attempts[key];
  if (!cur) return false;
  if (cur.count >= ATTEMPT_LIMIT && Date.now() - cur.firstAt < BLOCK_MS) return true;
  if (Date.now() - cur.firstAt >= BLOCK_MS) {
    delete attempts[key];
    return false;
  }
  return false;
}

export function validatePassword(password: string) {
  // Minimum 8 chars, at least one upper, one lower, one digit, one special
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return re.test(password);
}

/**
 * Validates a phone number. Accepts E.164 format (e.g. +1234567890)
 * or a string of digits that will be normalised to E.164.
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+]/g, '');
  // E.164: + followed by 7-15 digits
  return /^\+\d{7,15}$/.test(cleaned);
}

/**
 * Normalises a phone number to E.164 format (+<country code><number>).
 * Strips spaces, dashes, parentheses and other non-digit characters.
 * If the number doesn't start with +, prepends +.
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export async function signInWithPassword(email: string, password: string, remember = true): Promise<SignInResult> {
  const key = `signin:${email}`;
  if (isBlocked(key)) return { error: 'Too many attempts. Try again later.' };

  try {
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error) {
      recordAttempt(key);
      return { error: error.message };
    }

    // Supabase stores session in localStorage under key 'supabase.auth.token'.
    // If user chose not to be remembered, move the session to sessionStorage.
    try {
      const storageKey = 'supabase.auth.token';
      if (!remember) {
        const token = localStorage.getItem(storageKey);
        if (token) {
          sessionStorage.setItem(storageKey, token);
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      // ignore storage errors
    }

    return { error: null, data };
  } catch (err) {
    recordAttempt(key);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function signUpWithPassword(email: string, password: string, fullName?: string, remember = true): Promise<SignInResult> {
  if (!validatePassword(password)) return { error: 'Password does not meet strength requirements' };

  try {
    const { data, error } = await auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return { error: error.message };

    // If signup produced a session and user doesn't want persistence, move token to sessionStorage
    try {
      const storageKey = 'supabase.auth.token';
      if (!remember) {
        const token = localStorage.getItem(storageKey);
        if (token) {
          sessionStorage.setItem(storageKey, token);
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      // ignore
    }

    return { error: null, data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function normalizeOtpError(error: any, isEmail: boolean) {
  const message = error?.message || String(error || 'Unknown error');
  if (!isEmail && /unsupported phone provider/i.test(message)) {
    return 'Phone login is not configured in your Supabase project. Please ask the site administrator to enable phone authentication in the Supabase Dashboard (Authentication → Providers → Phone) and configure an SMS provider (e.g., Twilio).';
  }
  return message;
}

export async function sendOtp(identifier: string): Promise<{ error: string | null; note?: string; code?: string }> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: 'Identifier is required' };

  try {
    const isEmail = trimmed.includes('@');
    if (!isEmail && !PHONE_AUTH_ENABLED) {
      return { error: 'Phone login is not enabled. Please use an email address instead.' };
    }

    let payload: { email?: string; phone?: string };
    if (isEmail) {
      payload = { email: trimmed };
    } else {
      if (!validatePhoneNumber(trimmed)) {
        return { error: 'Please enter a valid phone number in international format (e.g., +1234567890)' };
      }
      payload = { phone: formatPhoneNumber(trimmed) };
    }

    const { data, error } = await auth.signInWithOtp(payload as any);

    if (error) {
      return { error: normalizeOtpError(error, isEmail) };
    }
    return { error: null, note: 'otp_sent', code: data?.messageId ?? undefined };
  } catch (err) {
    console.error('sendOtp failed', err);
    return { error: normalizeOtpError(err, trimmed.includes('@')) };
  }
}

export async function verifyOtp(identifier: string, code: string): Promise<{ error: string | null }> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: 'Identifier is required' };
  if (!code.trim()) return { error: 'OTP code is required' };

  try {
    const isEmail = trimmed.includes('@');
    if (!isEmail && !PHONE_AUTH_ENABLED) {
      return { error: 'Phone login is not enabled. Please use an email address instead.' };
    }

    let credentials: any;
    if (isEmail) {
      credentials = { email: trimmed, token: code, type: 'email' as const };
    } else {
      if (!validatePhoneNumber(trimmed)) {
        return { error: 'Please enter a valid phone number in international format (e.g., +1234567890)' };
      }
      credentials = { phone: formatPhoneNumber(trimmed), token: code, type: 'sms' as const };
    }

    const { error } = await auth.verifyOtp(credentials);
    if (error) {
      return { error: normalizeOtpError(error, isEmail) };
    }
    return { error: null };
  } catch (err) {
    console.error('verifyOtp failed', err);
    return { error: normalizeOtpError(err, trimmed.includes('@')) };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await auth.signOut();
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getSession() {
  const { data } = await auth.getSession();
  return data?.session ?? null;
}

export function onAuthStateChange(cb: (event: string, session: any) => void) {
  const { data } = auth.onAuthStateChange((event, session) => {
    cb(event, session);
  });
  return data.subscription;
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  try {
    const { data, error } = await auth.signInWithOAuth({ provider });
    if (error) return { error: error.message };
    return { error: null, data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  try {
    const { data, error } = await auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export default {
  signInWithPassword,
  signUpWithPassword,
  sendOtp,
  verifyOtp,
  sendPasswordReset,
  signOut,
  getSession,
  onAuthStateChange,
  signInWithProvider,
  validatePassword,
};

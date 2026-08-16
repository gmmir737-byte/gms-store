import { auth } from './supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

const PHONE_AUTH_ENABLED = import.meta.env.VITE_SUPABASE_PHONE_AUTH_ENABLED !== 'false';

type SignInResult = { error: string | null; data?: unknown };

// In-memory rate limiting / brute-force protection
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

export function validatePassword(password: string): boolean {
  // At least 8 characters
  return password.length >= 8;
}

/**
 * Validates a phone number. Accepts E.164 format (e.g. +919876543210)
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return /^\+\d{7,15}$/.test(cleaned);
}

/**
 * Normalises a phone number to E.164 format (+<country code><number>).
 */
export function formatPhoneNumber(phone: string, defaultCountryCode = '+91'): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('+')) {
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  const key = `signin:${email.toLowerCase().trim()}`;
  if (isBlocked(key)) {
    return { error: 'Too many failed login attempts. Please wait 5 minutes before trying again.' };
  }

  try {
    const { data, error } = await auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      recordAttempt(key);
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Incorrect email or password. Please try again.' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Your email address is not verified. Please check your inbox for the confirmation email.' };
      }
      return { error: error.message };
    }

    delete attempts[key];
    return { error: null, data };
  } catch (err) {
    recordAttempt(key);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName?: string
): Promise<SignInResult> {
  if (!validatePassword(password)) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  try {
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName?.trim() || '',
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return { error: 'An account with this email address already exists. Please sign in instead.' };
      }
      return { error: error.message };
    }

    return { error: null, data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function normalizeOtpError(error: unknown, isEmail: boolean): string {
  const errObj = error as { message?: string; status?: number };
  const message = errObj?.message || String(error || 'An error occurred during verification');

  if (!isEmail && /unsupported phone provider|sms provider/i.test(message)) {
    return 'Phone authentication provider is not configured in Supabase. Please ask the administrator to configure an SMS gateway (e.g., Twilio) in Supabase Authentication Dashboard.';
  }
  if (/invalid token|otp has expired|token has expired/i.test(message)) {
    return 'The verification code is invalid or has expired. Please request a new OTP.';
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many OTP requests. Please wait a minute before requesting another code.';
  }

  return message;
}

export async function sendOtp(identifier: string): Promise<{ error: string | null; messageId?: string }> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: 'Email address or phone number is required.' };

  try {
    const isEmail = trimmed.includes('@');
    if (!isEmail && !PHONE_AUTH_ENABLED) {
      return { error: 'Phone login is disabled. Please use an email address.' };
    }

    if (isEmail) {
      const { data, error } = await auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) return { error: normalizeOtpError(error, true) };
      return { error: null, messageId: data?.messageId ?? undefined };
    } else {
      const formattedPhone = formatPhoneNumber(trimmed);
      if (!validatePhoneNumber(formattedPhone)) {
        return { error: 'Please enter a valid phone number (e.g. +919876543210).' };
      }

      const { data, error } = await auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) return { error: normalizeOtpError(error, false) };
      return { error: null, messageId: data?.messageId ?? undefined };
    }
  } catch (err) {
    return { error: normalizeOtpError(err, identifier.includes('@')) };
  }
}

export async function verifyOtp(identifier: string, code: string): Promise<{ error: string | null }> {
  const trimmed = identifier.trim();
  const trimmedCode = code.trim();

  if (!trimmed) return { error: 'Phone number or email is required.' };
  if (!trimmedCode) return { error: 'Please enter the verification code.' };

  try {
    const isEmail = trimmed.includes('@');

    if (isEmail) {
      const { error } = await auth.verifyOtp({
        email: trimmed,
        token: trimmedCode,
        type: 'email',
      });
      if (error) return { error: normalizeOtpError(error, true) };
    } else {
      const formattedPhone = formatPhoneNumber(trimmed);
      const { error } = await auth.verifyOtp({
        phone: formattedPhone,
        token: trimmedCode,
        type: 'sms',
      });
      if (error) return { error: normalizeOtpError(error, false) };
    }

    return { error: null };
  } catch (err) {
    return { error: normalizeOtpError(err, identifier.includes('@')) };
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

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await auth.getSession();
    if (error) {
      console.warn('getSession error:', error.message);
      return null;
    }
    return data?.session ?? null;
  } catch (err) {
    console.warn('getSession thrown:', err);
    return null;
  }
}

export function onAuthStateChange(cb: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = auth.onAuthStateChange((event, session) => {
    cb(event, session);
  });
  return data.subscription;
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  try {
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : undefined,
      },
    });

    if (error) return { error: error.message };

    if (data?.url) {
      // If running inside an iframe (like AI Studio preview), open in popup or top window
      // to avoid Google's X-Frame-Options DENY / 403 iframe restriction
      if (window.self !== window.top) {
        const popup = window.open(data.url, '_blank', 'width=600,height=700');
        if (!popup) {
          window.top!.location.href = data.url;
        }
      } else {
        window.location.href = data.url;
      }
    }

    return { error: null, data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const trimmed = email.trim();
  if (!trimmed) return { error: 'Please enter your email address.' };

  try {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  if (!validatePassword(newPassword)) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  try {
    const { error } = await auth.updateUser({
      password: newPassword,
    });
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
  updatePassword,
  signOut,
  getSession,
  onAuthStateChange,
  signInWithProvider,
  validatePassword,
};

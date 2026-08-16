Auth flow (planned)

Goals:
- Email + Password
- OTP verification for new accounts
- Email verification
- Forgot Password
- Remember Me
- Stay logged in across sessions
- Login with Google
- Login with Apple (stub)
- Phone login (SMS OTP)
- Strong password validation
- Brute-force protection
- Preserve existing profiles, cart, wishlist, orders

Planned steps:
1. Scaffold UI (login/register/otp/reset) — done (UI only)
2. Implement server-side helpers (Edge function / RPC) for OTP + brute-force protection
3. Implement Supabase Auth wrapper and update `AuthContext` to support new flows
4. Add social login config and Apple stub
5. Hardening: password rules, rate-limiting, email templates
6. Testing and rollout

## Phone Login (SMS OTP) Setup

The frontend code for phone login is already implemented. However, phone authentication
must be **enabled in the Supabase project dashboard** for it to work.

### Prerequisites
- A Twilio account (or Supabase built-in SMS provider)
- A Twilio phone number that supports SMS
- The phone auth provider enabled in Supabase

### Steps to enable phone auth

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Navigate to **Authentication → Providers → Phone**
3. Toggle **Enable** for the Phone provider
4. Under **SMS Provider**, select **Twilio** (or Supabase built-in)
5. Enter your Twilio credentials:
   - **Account SID** — from your Twilio console
   - **Auth Token** — from your Twilio console
   - **Phone number** — your Twilio phone number (E.164 format, e.g. +1234567890)
6. Click **Save**

### How it works (code flow)

1. User enters a phone number on the **LoginPage** (in E.164 format, e.g. +1234567890)
2. `LoginPage` navigates to `/otp-verify?identifier=PHONE`
3. User clicks "Send OTP" → `OtpVerifyPage` calls `authLib.sendOtp(identifier)`
4. `sendOtp` in `src/lib/auth.ts`:
   - Validates the phone number (E.164 format)
   - Formats it to E.164 if needed
   - Calls `supabase.auth.signInWithOtp({ phone: formattedNumber })`
   - Supabase sends an SMS with a 6-digit code
5. User enters the code → `OtpVerifyPage` calls `authLib.verifyOtp(identifier, code)`
6. `verifyOtp` calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
7. On success, Supabase creates a session → `AuthContext` picks it up via `onAuthStateChange`
8. If the user has no profile, `AuthContext.fetchProfile` creates one automatically

### Notes
- The `.env` flag `VITE_SUPABASE_PHONE_AUTH_ENABLED=true` only controls whether the phone
  login UI is shown. It does NOT enable phone auth in Supabase.
- Phone numbers must be in E.164 format (e.g. +1234567890). The code automatically
  formats numbers that don't start with `+`.
- If phone auth is not enabled in the Supabase dashboard, users will see an error message
  with instructions on how to enable it.
- The old custom OTP edge functions (`otp-send`, `otp-verify`) are kept as reference but
  are no longer used. The app uses Supabase built-in passwordless authentication.

Next approval request:
- Confirm I should implement the Supabase auth wrapper and begin wiring the `AuthContext` to use the new flows.

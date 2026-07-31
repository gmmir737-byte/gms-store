-- Create OTP and rate-limit tables for auth flows
CREATE TABLE IF NOT EXISTS auth_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  salt text NOT NULL,
  purpose text DEFAULT 'signup',
  attempts integer DEFAULT 0,
  consumed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON auth_otps(email);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires ON auth_otps(expires_at);

-- Rate limit tracking per email or ip
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz
);

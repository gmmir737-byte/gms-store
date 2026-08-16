-- Add Razorpay-specific order fields and payment verification tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_order_status text,
  ADD COLUMN IF NOT EXISTS razorpay_order_amount bigint,
  ADD COLUMN IF NOT EXISTS razorpay_order_currency text,
  ADD COLUMN IF NOT EXISTS razorpay_order_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS razorpay_signature text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

-- Ensure payment id uniqueness for Razorpay payments to prevent duplicate updates
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders (razorpay_payment_id);

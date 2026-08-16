-- Migration 007: Production-Ready Rebuilt Product Return System
-- File: /supabase/migrations/20260709170000_007_new_return_system.sql

-- 1. Create main returns table
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  customer_note TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  
  -- Courier & Pickup tracking fields
  courier_name TEXT,
  tracking_number TEXT,
  pickup_date DATE,
  
  -- Refund details
  refund_amount NUMERIC(10, 2),
  refund_method TEXT,
  refund_transaction_id TEXT,
  
  -- Notes
  admin_note TEXT,
  internal_note TEXT,
  
  -- Audit Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  pickup_scheduled_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  refund_started_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index for fast user & order return lookups
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);

-- 2. Refactor return_status_history to link to return_id
ALTER TABLE public.return_status_history 
ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE;

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_return_status_history_return ON public.return_status_history(return_id);

-- 3. Enable RLS on returns table
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Customers can view their own returns" ON public.returns;
DROP POLICY IF EXISTS "Customers can create returns for their own orders" ON public.returns;
DROP POLICY IF EXISTS "Admins full access to returns" ON public.returns;

-- Customer RLS: View own returns
CREATE POLICY "Customers can view their own returns"
  ON public.returns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Customer RLS: Create return for own order
CREATE POLICY "Customers can create returns for their own orders"
  ON public.returns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Customer RLS: Cancel own return if still REQUESTED
CREATE POLICY "Customers can update own returns if requested"
  ON public.returns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'REQUESTED');

-- Admin RLS: Full access to all returns
CREATE POLICY "Admins full access to returns"
  ON public.returns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'admin'
    )
  );

-- 4. Enable RLS on return_status_history with return_id support
DROP POLICY IF EXISTS "Customers view customer_visible history for their returns" ON public.return_status_history;

CREATE POLICY "Customers view customer_visible history for their returns"
  ON public.return_status_history FOR SELECT
  TO authenticated
  USING (
    customer_visible = true AND
    EXISTS (
      SELECT 1 FROM public.returns
      WHERE public.returns.id = public.return_status_history.return_id
      AND public.returns.user_id = auth.uid()
    )
  );

-- 5. Add return_window_days to store settings if missing
INSERT INTO public.settings (key, value)
VALUES ('return_window_days', '7')
ON CONFLICT (key) DO NOTHING;

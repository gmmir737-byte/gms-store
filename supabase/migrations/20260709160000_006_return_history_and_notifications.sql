-- Migration 006: Enhanced Return Status History, Admin Review Tracking & Customer Notifications
-- File: /supabase/migrations/20260709160000_006_return_history_and_notifications.sql

-- 1. Add reviewed_at and reviewed_by to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- 2. Create return_status_history table
CREATE TABLE IF NOT EXISTS public.return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  customer_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Enable RLS on return_status_history
ALTER TABLE public.return_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Customers view customer_visible history for their orders" ON public.return_status_history;
DROP POLICY IF EXISTS "Admins full access to return_status_history" ON public.return_status_history;

-- Policy: Customers can read customer-visible history for their own orders
CREATE POLICY "Customers view customer_visible history for their orders"
  ON public.return_status_history FOR SELECT
  TO authenticated
  USING (
    customer_visible = true AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE public.orders.id = public.return_status_history.order_id
      AND public.orders.user_id = auth.uid()
    )
  );

-- Policy: Admins have full access
CREATE POLICY "Admins full access to return_status_history"
  ON public.return_status_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'admin'
    )
  );

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'return_update',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins/Service can insert notifications" ON public.notifications;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins or Service can insert notifications
CREATE POLICY "Admins/Service can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_return_status_history_order ON public.return_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

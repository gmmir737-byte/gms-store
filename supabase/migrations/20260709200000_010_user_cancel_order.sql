-- Migration: Add user order cancellation policy and secure RPC function
-- File: /supabase/migrations/20260709200000_010_user_cancel_order.sql

-- 1. Secure RPC function for customer to cancel their own pending/processing order
CREATE OR REPLACE FUNCTION public.cancel_customer_order(p_order_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID %', p_order_id;
  END IF;

  -- Ensure caller owns the order (or is admin)
  IF v_order.user_id <> v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'You are not authorized to cancel this order';
  END IF;

  -- Ensure order is in a cancellable state
  IF v_order.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Order cannot be cancelled because it is already %', v_order.status;
  END IF;

  -- Update order status to cancelled
  UPDATE public.orders
  SET status = 'cancelled',
      notes = CASE 
        WHEN p_reason IS NOT NULL AND LENGTH(TRIM(p_reason)) > 0 THEN 
          COALESCE(notes || ' | ', '') || 'Cancelled by customer: ' || TRIM(p_reason)
        ELSE 
          COALESCE(notes || ' | ', '') || 'Cancelled by customer'
      END,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Restore stock if it was deducted
  IF v_order.stock_deducted IS TRUE THEN
    PERFORM public.restore_order_stock(p_order_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID, TEXT) TO authenticated, service_role;

-- 2. Add RLS policy allowing customers to update their own order to 'cancelled' if pending/processing
DROP POLICY IF EXISTS "orders_user_cancel" ON public.orders;
CREATE POLICY "orders_user_cancel" ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND status IN ('pending', 'processing')
  )
  WITH CHECK (
    auth.uid() = user_id AND status = 'cancelled'
  );

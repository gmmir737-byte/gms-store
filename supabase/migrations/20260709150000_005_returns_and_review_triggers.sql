-- Migration 005: Add order return/cancel fields and product rating recalculation triggers
-- File: /supabase/migrations/20260709150000_005_returns_and_review_triggers.sql

-- 1. Add return_status, return_reason, cancel_reason to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT 'none' CHECK (return_status IN ('none', 'requested', 'approved', 'rejected', 'pickup_pending', 'received', 'refunded')),
ADD COLUMN IF NOT EXISTS return_reason TEXT,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. Ensure RLS policies on reviews allow DELETE for review owner
DROP POLICY IF EXISTS "reviews_user_delete" ON public.reviews;
CREATE POLICY "reviews_user_delete" ON public.reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 3. Function to automatically recalculate product rating_avg and rating_count
CREATE OR REPLACE FUNCTION public.recalculate_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_product_id UUID;
  v_avg DECIMAL(3,2);
  v_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  IF target_product_id IS NOT NULL THEN
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)
    INTO v_avg, v_count
    FROM public.reviews
    WHERE product_id = target_product_id AND is_approved = true;

    UPDATE public.products
    SET rating_avg = v_avg,
        rating_count = v_count,
        updated_at = NOW()
    WHERE id = target_product_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Apply trigger to reviews table
DROP TRIGGER IF EXISTS trg_recalculate_product_rating ON public.reviews;
CREATE TRIGGER trg_recalculate_product_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_product_rating();

-- 4. Function to restore stock when an order is cancelled
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID %', p_order_id;
  END IF;

  -- Only restore if stock was marked as deducted
  IF v_order.stock_deducted IS TRUE THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = p_order_id
    LOOP
      IF v_item.product_id IS NOT NULL THEN
        UPDATE public.products
        SET quantity = quantity + v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    UPDATE public.orders
    SET stock_deducted = FALSE,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'message', 'Stock restored');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Stock was not deducted, no restoration needed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_order_stock(UUID) TO authenticated, anon, service_role;

-- Migration: Add inventory deduction functions, stock_deducted tracking, and triggers
-- File: /supabase/migrations/20260709140000_004_inventory_deduction.sql

-- 1. Add stock_deducted column to orders table if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;

-- 2. Add CHECK constraint on products.quantity to ensure it never becomes negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_quantity_non_negative'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_quantity_non_negative CHECK (quantity >= 0);
  END IF;
END $$;

-- 3. Create or replace atomic stock deduction RPC function by Order ID
CREATE OR REPLACE FUNCTION public.deduct_order_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- Lock the target order row for update
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID %', p_order_id;
  END IF;

  -- Idempotency check: if stock was already deducted for this order, exit gracefully
  IF v_order.stock_deducted IS TRUE THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_deducted', true,
      'message', 'Stock has already been deducted for this order'
    );
  END IF;

  -- Verify all items in the order have sufficient stock available
  FOR v_item IN
    SELECT oi.product_id, oi.quantity, p.name, p.quantity AS current_stock
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    FOR UPDATE OF p
  LOOP
    IF v_item.current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product "%": requested %, available %',
        v_item.name, v_item.quantity, v_item.current_stock;
    END IF;
  END LOOP;

  -- Deduct stock for each item in the order
  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.products
    SET quantity = quantity - v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;
  END LOOP;

  -- Mark order as stock_deducted = TRUE
  UPDATE public.orders
  SET stock_deducted = TRUE,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_deducted', false,
    'message', 'Stock successfully deducted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_order_stock(UUID) TO authenticated, anon, service_role;

-- 4. Create or replace item-level product decrement function for direct RPC calls
CREATE OR REPLACE FUNCTION public.decrement_product_quantity(p_id UUID, qty INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET quantity = GREATEST(0, quantity - qty),
      updated_at = NOW()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_quantity(UUID, INT) TO authenticated, anon, service_role;

-- 5. Create function to restore stock if an order is cancelled
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

  IF v_order.stock_deducted IS FALSE THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_restored', true,
      'message', 'Stock was not deducted for this order'
    );
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.products
    SET quantity = quantity + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;
  END LOOP;

  UPDATE public.orders
  SET stock_deducted = FALSE,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_restored', false,
    'message', 'Stock successfully restored'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_order_stock(UUID) TO authenticated, anon, service_role;

-- 6. Automatic trigger for payment status update to 'paid'
CREATE OR REPLACE FUNCTION public.trg_auto_deduct_stock_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid' OR NEW.stock_deducted IS FALSE) THEN
    PERFORM public.deduct_order_stock(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_auto_deduct_stock ON public.orders;

CREATE TRIGGER trg_orders_auto_deduct_stock
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid')
EXECUTE FUNCTION public.trg_auto_deduct_stock_on_paid();

-- 7. Automatic trigger for order status update to 'cancelled'
CREATE OR REPLACE FUNCTION public.trg_auto_restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.stock_deducted IS TRUE THEN
    PERFORM public.restore_order_stock(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_auto_restore_stock ON public.orders;

CREATE TRIGGER trg_orders_auto_restore_stock
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'cancelled')
EXECUTE FUNCTION public.trg_auto_restore_stock_on_cancel();

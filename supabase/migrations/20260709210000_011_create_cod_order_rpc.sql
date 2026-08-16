-- Migration: Add secure COD order creation RPC with authoritative price, discount, delivery, and stock validation
-- File: /supabase/migrations/20260709210000_011_create_cod_order_rpc.sql

CREATE OR REPLACE FUNCTION public.create_cod_order(
  p_order_number TEXT,
  p_shipping_address JSONB,
  p_billing_address JSONB,
  p_items JSONB,
  p_coupon_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_item JSONB;
  v_product RECORD;
  v_coupon RECORD;
  v_matched_area RECORD;
  v_order_id UUID;
  v_subtotal NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_shipping_cost NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2) := 0;
  v_unit_price NUMERIC(10,2) := 0;
  v_line_total NUMERIC(10,2) := 0;
  v_req_qty INT;
  v_now TIMESTAMPTZ := NOW();
  v_coupon_applied_id UUID := NULL;
  v_area_name TEXT;
  v_min_order_amount NUMERIC(10,2) := 0;
BEGIN
  -- 1. Verify authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate input arguments
  IF p_order_number IS NULL OR LENGTH(TRIM(p_order_number)) = 0 THEN
    RAISE EXCEPTION 'Order number is required';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items cannot be empty';
  END IF;

  IF p_shipping_address IS NULL THEN
    RAISE EXCEPTION 'Shipping address is required';
  END IF;

  -- Verify shipping address ownership if an address id is provided
  IF p_shipping_address ? 'id' AND p_shipping_address->>'id' IS NOT NULL AND LENGTH(p_shipping_address->>'id') > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.addresses
      WHERE id = (p_shipping_address->>'id')::uuid
      AND user_id <> v_user_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized shipping address selected';
    END IF;
  END IF;

  -- 3. Calculate authoritative subtotal & validate products/stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT (v_item ? 'product_id') OR v_item->>'product_id' IS NULL THEN
      RAISE EXCEPTION 'Each order item must include a valid product_id';
    END IF;

    v_req_qty := (v_item->>'quantity')::INT;
    IF v_req_qty IS NULL OR v_req_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for order item';
    END IF;

    -- Query authoritative product row with FOR UPDATE lock
    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found with ID %', v_item->>'product_id';
    END IF;

    IF v_product.status IS NOT NULL AND v_product.status <> 'active' THEN
      RAISE EXCEPTION 'Product "%" is currently inactive or unavailable', v_product.name;
    END IF;

    IF v_product.quantity < v_req_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product "%": available %, requested %',
        v_product.name, v_product.quantity, v_req_qty;
    END IF;

    -- Determine authoritative unit price (checking active flash-sale)
    v_unit_price := v_product.price;
    IF v_product.is_flash_sale IS TRUE
       AND v_product.flash_sale_price IS NOT NULL
       AND v_product.flash_sale_price > 0
       AND (v_product.flash_sale_ends IS NULL OR v_product.flash_sale_ends > v_now) THEN
      v_unit_price := v_product.flash_sale_price;
    END IF;

    v_line_total := ROUND((v_unit_price * v_req_qty)::NUMERIC, 2);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  v_subtotal := ROUND(v_subtotal, 2);

  -- 4. Authoritative discount & coupon validation
  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE id = p_coupon_id
    FOR UPDATE;

    IF FOUND AND v_coupon.is_active IS TRUE
       AND (v_coupon.valid_from IS NULL OR v_coupon.valid_from <= v_now)
       AND (v_coupon.valid_until IS NULL OR v_coupon.valid_until >= v_now)
       AND (v_coupon.usage_limit IS NULL OR v_coupon.used_count < v_coupon.usage_limit)
       AND (v_coupon.min_order_amount IS NULL OR v_subtotal >= v_coupon.min_order_amount) THEN
      
      v_coupon_applied_id := v_coupon.id;
      IF v_coupon.type = 'percentage' THEN
        v_discount := ROUND((v_subtotal * v_coupon.value / 100)::NUMERIC, 2);
        IF v_coupon.max_discount IS NOT NULL AND v_coupon.max_discount > 0 THEN
          v_discount := LEAST(v_discount, v_coupon.max_discount);
        END IF;
      ELSIF v_coupon.type = 'fixed' THEN
        v_discount := LEAST(v_coupon.value, v_subtotal);
      END IF;

      v_discount := LEAST(v_discount, v_subtotal);

      -- Increment coupon usage
      UPDATE public.coupons
      SET used_count = COALESCE(used_count, 0) + 1
      WHERE id = v_coupon.id;
    END IF;
  END IF;

  -- 5. Authoritative delivery area validation & delivery charge
  v_area_name := TRIM(COALESCE(p_shipping_address->>'area', ''));
  IF LENGTH(v_area_name) > 0 THEN
    SELECT * INTO v_matched_area
    FROM public.delivery_areas
    WHERE is_active = TRUE
      AND LOWER(TRIM(area_name)) = LOWER(v_area_name)
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Delivery is currently unavailable in the selected locality (%)', v_area_name;
    END IF;

    v_min_order_amount := COALESCE(v_matched_area.minimum_order_amount, 0);
    IF v_min_order_amount > 0 AND v_subtotal < v_min_order_amount THEN
      RAISE EXCEPTION 'Minimum order amount for % is ₹%', v_matched_area.area_name, v_min_order_amount;
    END IF;

    v_shipping_cost := COALESCE(v_matched_area.delivery_charge, 0);
  END IF;

  -- 6. Calculate authoritative final total
  v_total := GREATEST(0, ROUND((v_subtotal - v_discount + v_shipping_cost)::NUMERIC, 2));

  -- 7. Insert the orders record
  INSERT INTO public.orders (
    order_number,
    user_id,
    status,
    payment_status,
    payment_method,
    payment_id,
    subtotal,
    discount,
    shipping_cost,
    tax,
    total,
    coupon_id,
    shipping_address,
    billing_address,
    notes,
    stock_deducted,
    created_at,
    updated_at
  ) VALUES (
    p_order_number,
    v_user_id,
    'pending',
    'pending',
    'cod',
    NULL,
    v_subtotal,
    v_discount,
    v_shipping_cost,
    0,
    v_total,
    v_coupon_applied_id,
    p_shipping_address,
    COALESCE(p_billing_address, p_shipping_address),
    p_notes,
    FALSE,
    v_now,
    v_now
  )
  RETURNING id INTO v_order_id;

  -- 8. Insert order_items with authoritative database prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_req_qty := (v_item->>'quantity')::INT;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID;

    v_unit_price := v_product.price;
    IF v_product.is_flash_sale IS TRUE
       AND v_product.flash_sale_price IS NOT NULL
       AND v_product.flash_sale_price > 0
       AND (v_product.flash_sale_ends IS NULL OR v_product.flash_sale_ends > v_now) THEN
      v_unit_price := v_product.flash_sale_price;
    END IF;

    v_line_total := ROUND((v_unit_price * v_req_qty)::NUMERIC, 2);

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      price,
      total,
      created_at
    ) VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      CASE 
        WHEN jsonb_array_length(to_jsonb(v_product.images)) > 0 THEN v_product.images[1]
        ELSE NULL
      END,
      v_req_qty,
      v_unit_price,
      v_line_total,
      v_now
    );
  END LOOP;

  -- 9. Atomically deduct inventory for the newly created COD order
  PERFORM public.deduct_order_stock(v_order_id);

  -- 10. Return authoritative order metadata to client
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping_cost', v_shipping_cost,
    'total', v_total,
    'stock_deducted', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cod_order(TEXT, JSONB, JSONB, JSONB, UUID, TEXT) TO authenticated, service_role;

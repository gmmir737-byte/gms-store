import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') || '';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing required environment variables');
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      user_id,
      order_number,
      currency,
      shipping_address,
      billing_address,
      items,
      coupon_id,
      notes,
    } = body;

    if (!user_id || !order_number || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required order fields or empty items list' }), { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Database service configuration error' }), { status: 500 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 500 });
    }

    // 1. Fetch products from database to calculate authoritative prices & subtotal
    const productIds = items
      .map((i: any) => i.product_id)
      .filter((id: any) => typeof id === 'string' && id.trim().length > 0);

    if (productIds.length !== items.length) {
      return new Response(JSON.stringify({ error: 'Invalid product identifiers in order items' }), { status: 400 });
    }

    // Query authoritative product catalog
    const productFilter = `(${productIds.map((id: string) => `"${id}"`).join(',')})`;
    const productsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=in.${productFilter}&select=id,name,price,is_flash_sale,flash_sale_price,flash_sale_ends,quantity,status,images`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        },
      }
    );

    if (!productsRes.ok) {
      console.error('Failed to fetch products from DB:', await productsRes.text());
      return new Response(JSON.stringify({ error: 'Failed to verify product information' }), { status: 502 });
    }

    const dbProducts: any[] = await productsRes.json();
    const dbProductMap = new Map<string, any>();
    dbProducts.forEach((p) => dbProductMap.set(p.id, p));

    let verifiedSubtotal = 0;
    const verifiedOrderItems: any[] = [];
    const now = new Date();

    for (const clientItem of items) {
      const dbProduct = dbProductMap.get(clientItem.product_id);
      if (!dbProduct) {
        return new Response(
          JSON.stringify({ error: `Product not found or unavailable (ID: ${clientItem.product_id})` }),
          { status: 400 }
        );
      }

      if (dbProduct.status && dbProduct.status !== 'active') {
        return new Response(
          JSON.stringify({ error: `Product "${dbProduct.name}" is not currently available for purchase.` }),
          { status: 400 }
        );
      }

      const reqQuantity = Number(clientItem.quantity);
      if (!Number.isInteger(reqQuantity) || reqQuantity <= 0) {
        return new Response(
          JSON.stringify({ error: `Invalid quantity for product "${dbProduct.name}".` }),
          { status: 400 }
        );
      }

      if (typeof dbProduct.quantity === 'number' && dbProduct.quantity < reqQuantity) {
        return new Response(
          JSON.stringify({
            error: `Insufficient stock for "${dbProduct.name}". Available: ${dbProduct.quantity}, requested: ${reqQuantity}.`,
          }),
          { status: 400 }
        );
      }

      // Determine authoritative price (supporting flash sales if active & unexpired)
      let authoritativeUnitPrice = Number(dbProduct.price) || 0;
      if (
        dbProduct.is_flash_sale &&
        typeof dbProduct.flash_sale_price === 'number' &&
        dbProduct.flash_sale_price > 0
      ) {
        const flashEnds = dbProduct.flash_sale_ends ? new Date(dbProduct.flash_sale_ends) : null;
        if (!flashEnds || flashEnds > now) {
          authoritativeUnitPrice = Number(dbProduct.flash_sale_price);
        }
      }

      const lineTotal = Math.round(authoritativeUnitPrice * reqQuantity * 100) / 100;
      verifiedSubtotal += lineTotal;

      verifiedOrderItems.push({
        product_id: dbProduct.id,
        product_name: dbProduct.name,
        product_image: Array.isArray(dbProduct.images) && dbProduct.images.length > 0 ? dbProduct.images[0] : null,
        quantity: reqQuantity,
        price: authoritativeUnitPrice,
        total: lineTotal,
      });
    }

    verifiedSubtotal = Math.round(verifiedSubtotal * 100) / 100;

    // 2. Validate authoritative discount / coupon (if coupon_id provided)
    let verifiedDiscount = 0;
    let verifiedCouponId: string | null = null;

    if (coupon_id && typeof coupon_id === 'string' && coupon_id.trim().length > 0) {
      try {
        const couponRes = await fetch(
          `${SUPABASE_URL}/rest/v1/coupons?id=eq.${encodeURIComponent(coupon_id)}&select=*`,
          {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
          }
        );

        if (couponRes.ok) {
          const couponList = await couponRes.json();
          if (Array.isArray(couponList) && couponList.length > 0) {
            const coupon = couponList[0];
            const isCouponActive = coupon.is_active !== false;
            const validFromPassed = !coupon.valid_from || new Date(coupon.valid_from) <= now;
            const validUntilValid = !coupon.valid_until || new Date(coupon.valid_until) >= now;
            const usageLimitValid =
              coupon.usage_limit == null || (coupon.used_count || 0) < coupon.usage_limit;
            const minOrderMet =
              !coupon.min_order_amount || verifiedSubtotal >= Number(coupon.min_order_amount);

            if (isCouponActive && validFromPassed && validUntilValid && usageLimitValid && minOrderMet) {
              verifiedCouponId = coupon.id;
              if (coupon.type === 'percentage') {
                let calc = (verifiedSubtotal * Number(coupon.value)) / 100;
                if (coupon.max_discount && Number(coupon.max_discount) > 0) {
                  calc = Math.min(calc, Number(coupon.max_discount));
                }
                verifiedDiscount = Math.min(calc, verifiedSubtotal);
              } else if (coupon.type === 'fixed') {
                verifiedDiscount = Math.min(Number(coupon.value), verifiedSubtotal);
              }
              verifiedDiscount = Math.round(verifiedDiscount * 100) / 100;
            }
          }
        }
      } catch (couponErr) {
        console.warn('Coupon verification notice:', couponErr);
      }
    }

    // 3. Authoritative delivery area validation, minimum order check & delivery charge
    let verifiedShippingCost = 0;

    if (shipping_address) {
      const areaCheckRes = await fetch(
        `${SUPABASE_URL}/rest/v1/delivery_areas?select=id,area_name,city,state,pincode,is_active,delivery_charge,minimum_order_amount,estimated_delivery_time`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          },
        }
      );

      if (areaCheckRes.ok) {
        const allAreas = await areaCheckRes.json();
        if (Array.isArray(allAreas) && allAreas.length > 0) {
          const requestedArea = ((shipping_address.area as string) || '').trim().toLowerCase();
          const matchedArea = allAreas.find(
            (a: any) => a.is_active && a.area_name.trim().toLowerCase() === requestedArea
          );

          if (!matchedArea) {
            return new Response(
              JSON.stringify({
                error: `Delivery is currently unavailable in the selected locality (${
                  shipping_address.area || 'unspecified'
                }). Please choose a serviceable delivery locality.`,
              }),
              { status: 400 }
            );
          }

          // Authoritative minimum order check on verified subtotal
          const minOrderAmount = Number(matchedArea.minimum_order_amount) || 0;
          if (minOrderAmount > 0 && verifiedSubtotal < minOrderAmount) {
            return new Response(
              JSON.stringify({
                error: `Minimum order amount for ${matchedArea.area_name} is ₹${minOrderAmount}.`,
              }),
              { status: 400 }
            );
          }

          const areaDeliveryCharge =
            typeof matchedArea.delivery_charge === 'number' ? matchedArea.delivery_charge : 0;
          verifiedShippingCost = areaDeliveryCharge;

          shipping_address.delivery_charge = matchedArea.delivery_charge ?? null;
          shipping_address.estimated_delivery_time = matchedArea.estimated_delivery_time ?? null;
        }
      }
    }

    // 4. Calculate authoritative final order total
    const verifiedTotal = Math.max(0, Math.round((verifiedSubtotal - verifiedDiscount + verifiedShippingCost) * 100) / 100);

    // 5. Server calculates Razorpay charge amount in paise from authoritative total
    const razorpayAmountInPaise = Math.round(verifiedTotal * 100);

    if (razorpayAmountInPaise <= 0) {
      return new Response(
        JSON.stringify({ error: 'Order total must be greater than zero for online payments' }),
        { status: 400 }
      );
    }

    const payload = {
      amount: razorpayAmountInPaise,
      currency: currency || 'INR',
      receipt: order_number,
      payment_capture: 1,
    };

    const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('Razorpay order error', rzpData);
      return new Response(JSON.stringify({ error: rzpData.error?.description || 'Failed to create Razorpay order' }), { status: 502 });
    }

    // 6. Insert order using authoritative server-calculated amounts
    const orderInsert = {
      order_number,
      user_id,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'razorpay',
      payment_id: null,
      subtotal: verifiedSubtotal,
      discount: verifiedDiscount,
      shipping_cost: verifiedShippingCost,
      tax: 0,
      total: verifiedTotal,
      coupon_id: verifiedCouponId,
      shipping_address,
      billing_address: billing_address || shipping_address,
      notes: notes || null,
      razorpay_order_id: rzpData.id,
      razorpay_order_status: rzpData.status,
      razorpay_order_amount: rzpData.amount,
      razorpay_order_currency: rzpData.currency,
      razorpay_order_created_at: new Date(rzpData.created_at * 1000).toISOString(),
    };

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([orderInsert]),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !Array.isArray(orderData) || orderData.length === 0) {
      console.error('Supabase order insert failed', orderData);
      return new Response(JSON.stringify({ error: 'Failed to save order' }), { status: 502 });
    }

    const order = orderData[0];
    const orderItemsToInsert = verifiedOrderItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));

    const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderItemsToInsert),
    });

    if (!itemsRes.ok) {
      const itemsData = await itemsRes.text();
      console.error('Supabase order_items insert failed', itemsData);
      return new Response(JSON.stringify({ error: 'Failed to save order items' }), { status: 502 });
    }

    return new Response(JSON.stringify({ error: null, razorpayOrder: rzpData, order }), { status: 200 });
  } catch (err) {
    console.error('Error in razorpay-create-order:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});

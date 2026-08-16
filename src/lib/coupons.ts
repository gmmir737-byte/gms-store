import { supabase } from './supabase';
import type { Coupon } from '../types/database';

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discount: number;
}

/**
 * Validates a coupon code against current cart subtotal and database constraints.
 * Handles case-insensitivity, whitespace trimming, active status, expiration,
 * usage limits, minimum order values, and percentage/fixed discount calculations.
 */
export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidationResult> {
  const cleanCode = code.trim();

  if (!cleanCode) {
    return { valid: false, error: 'Please enter a coupon code', discount: 0 };
  }

  try {
    // Query coupons table case-insensitively using ilike
    const { data: coupon, error: dbError } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (dbError) {
      console.error('Error fetching coupon from database:', dbError);
      return { valid: false, error: 'Invalid coupon code', discount: 0 };
    }

    if (!coupon) {
      return { valid: false, error: 'Invalid coupon code', discount: 0 };
    }

    const typedCoupon = coupon as Coupon;

    // 1. Check if coupon is active
    if (!typedCoupon.is_active) {
      return { valid: false, error: 'This coupon is inactive or disabled', discount: 0 };
    }

    const now = new Date();

    // 2. Check valid_from
    if (typedCoupon.valid_from && new Date(typedCoupon.valid_from) > now) {
      return { valid: false, error: 'This coupon is not active yet', discount: 0 };
    }

    // 3. Check valid_until expiration date
    if (typedCoupon.valid_until && new Date(typedCoupon.valid_until) < now) {
      return { valid: false, error: 'This coupon has expired', discount: 0 };
    }

    // 4. Check usage limit
    if (
      typedCoupon.usage_limit !== null &&
      typedCoupon.usage_limit !== undefined &&
      typedCoupon.usage_limit > 0 &&
      (typedCoupon.used_count || 0) >= typedCoupon.usage_limit
    ) {
      return { valid: false, error: 'This coupon has reached its usage limit', discount: 0 };
    }

    // 5. Check minimum order amount
    const minAmount = typedCoupon.min_order_amount || 0;
    if (minAmount > 0 && subtotal < minAmount) {
      return {
        valid: false,
        error: `Minimum order amount of ₹${minAmount.toLocaleString()} is required for this coupon`,
        discount: 0,
      };
    }

    // 6. Calculate discount amount
    let discount = 0;
    if (typedCoupon.type === 'percentage') {
      discount = (subtotal * typedCoupon.value) / 100;

      // Apply max_discount limit if set
      if (typedCoupon.max_discount && typedCoupon.max_discount > 0) {
        discount = Math.min(discount, typedCoupon.max_discount);
      }
    } else if (typedCoupon.type === 'fixed') {
      discount = typedCoupon.value;
    }

    // Ensure discount does not exceed subtotal
    discount = Math.min(discount, subtotal);
    discount = Math.max(0, Math.round(discount * 100) / 100);

    return {
      valid: true,
      coupon: typedCoupon,
      discount,
    };
  } catch (err) {
    console.error('Coupon validation exception:', err);
    return { valid: false, error: 'Failed to validate coupon code', discount: 0 };
  }
}

/**
 * Increments the used_count for a coupon after a successful order.
 */
export async function incrementCouponUsage(couponId: string) {
  try {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', couponId)
      .maybeSingle();

    if (coupon) {
      const currentCount = coupon.used_count || 0;
      await supabase
        .from('coupons')
        .update({ used_count: currentCount + 1 })
        .eq('id', couponId);
    }
  } catch (err) {
    console.error('Failed to increment coupon used_count:', err);
  }
}

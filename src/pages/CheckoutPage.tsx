import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Truck, ShoppingBag, Tag, CheckCircle2, AlertCircle, Clock, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { useDelivery } from '../contexts/DeliveryContext';
import { Button, Input } from '../components/common';
import { AreaSelector } from '../components/common';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { createRazorpayOrder, verifyRazorpayPayment, markRazorpayOrderFailed, CreateRazorpayOrderResponse } from '../lib/payment';
import type { Address, AddressSnapshot } from '../types/database';
import { incrementCouponUsage } from '../lib/coupons';

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    order_number: string;
  };
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  modal: {
    ondismiss: () => void | Promise<void>;
  };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayWindow extends Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}

export function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, discount, appliedCoupon, applyCoupon, removeCoupon, clearCart, loading: cartLoading } = useCart();
  const { settings } = useSettings();
  const { activeAreas } = useDelivery();
  const navigate = useNavigate();

  const isRazorpayAvailable = settings.razorpay_enabled || Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>(() => {
    if (isRazorpayAvailable) return 'razorpay';
    if (settings.cod_enabled) return 'cod';
    return 'razorpay';
  });
  const [savingOrder, setSavingOrder] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // User Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');

  const [newAddress, setNewAddress] = useState<AddressSnapshot>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    area: '',
    tehsil: '',
    district: '',
    city: '',
    state: '',
    postal_code: '',
    country: settings.country || 'India',
  });
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const handleCheckoutApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setApplyingCoupon(true);
    const result = await applyCoupon(couponCode);
    if (result.success) {
      toast.success(result.message);
      setCouponCode('');
    } else {
      toast.error(result.message);
    }
    setApplyingCoupon(false);
  };

  useEffect(() => {
    if (!settings.cod_enabled && paymentMethod === 'cod') {
      setPaymentMethod('razorpay');
    }
  }, [settings.cod_enabled, paymentMethod]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (authLoading || cartLoading) return;
    if (user && items.length === 0) {
      navigate('/cart');
    }
  }, [authLoading, cartLoading, user, items.length, navigate]);

  const loadSavedAddresses = useCallback(async () => {
    if (!user || loadedUserId === user.id) return;

    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'shipping')
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Failed to load saved shipping addresses:', error);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const addressesList = data as Address[];
        setSavedAddresses(addressesList);

        // Select the default address or first address
        const defaultAddr = addressesList.find((a) => a.is_default) || addressesList[0];
        setSelectedAddressId(defaultAddr.id);
        setNewAddress({
          full_name: defaultAddr.full_name,
          phone: defaultAddr.phone,
          address_line1: defaultAddr.address_line1,
          address_line2: defaultAddr.address_line2 ?? '',
          area: defaultAddr.area ?? '',
          tehsil: defaultAddr.tehsil ?? '',
          district: defaultAddr.district ?? '',
          city: defaultAddr.city,
          state: defaultAddr.state,
          postal_code: defaultAddr.postal_code,
          country: defaultAddr.country,
        });
      }
    } catch (err) {
      console.error('Error loading saved shipping addresses:', err);
    } finally {
      setLoadingAddresses(false);
      setLoadedUserId(user.id);
    }
  }, [user, loadedUserId]);

  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses]);

  // Find matching delivery area configuration
  const currentAreaName = (newAddress.area || '').trim();
  const matchingArea = useMemo(() => {
    if (!currentAreaName) return null;
    return (
      activeAreas.find(
        (a) => a.area_name.toLowerCase() === currentAreaName.toLowerCase()
      ) || null
    );
  }, [currentAreaName, activeAreas]);

  // Determine serviceability: if active areas are defined, require active area match
  const isAreaServiceable = useMemo(() => {
    if (activeAreas.length === 0) return true; // No restrictions if no areas in DB
    if (!currentAreaName) return false;
    return matchingArea ? matchingArea.is_active : false;
  }, [activeAreas.length, currentAreaName, matchingArea]);

  // Calculate delivery fee
  const shippingCost = useMemo(() => {
    if (subtotal >= settings.free_shipping_amount) {
      return 0;
    }
    if (matchingArea && typeof matchingArea.delivery_charge === 'number') {
      return matchingArea.delivery_charge;
    }
    return settings.shipping_charge;
  }, [subtotal, settings.free_shipping_amount, settings.shipping_charge, matchingArea]);

  const total = Math.max(0, subtotal - discount + shippingCost);

  const selectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setNewAddress({
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 ?? '',
      area: addr.area ?? '',
      tehsil: addr.tehsil ?? '',
      district: addr.district ?? '',
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
    });
  };

  const selectNewAddress = () => {
    setSelectedAddressId('new');
    setNewAddress({
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      area: '',
      tehsil: '',
      district: '',
      city: '',
      state: '',
      postal_code: '',
      country: settings.country || 'India',
    });
  };


const sendOrderEmail = async (orderData: Record<string, unknown>) => {
  try {
    const response = await fetch("/.netlify/functions/send-order-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      console.warn(`Order email notification skipped or unavailable (${response.status})`);
      return null;
    }

    return await response.text();
  } catch (err) {
    console.warn("Order email service unavailable:", err);
    return null;
  }
};

  const validateAddress = () => {
    if (
      !newAddress.full_name.trim() ||
      !newAddress.phone.trim() ||
      !newAddress.address_line1.trim() ||
      !newAddress.city.trim() ||
      !newAddress.state.trim() ||
      !newAddress.postal_code.trim()
    ) {
      toast.error('Please fill all required address fields');
      return false;
    }

    if (!newAddress.area?.trim()) {
      toast.error('Please select or specify your Area / Locality');
      return false;
    }

    // Check locality serviceability
    if (activeAreas.length > 0 && !isAreaServiceable) {
      toast.error(`Delivery is currently unavailable in "${newAddress.area}". Please choose another area.`);
      return false;
    }

    // Check minimum order amount for the delivery area
    const minOrder = matchingArea ? Number(matchingArea.minimum_order_amount) || 0 : 0;
    if (minOrder > 0 && subtotal < minOrder) {
      toast.error(`Minimum order amount for ${matchingArea?.area_name || newAddress.area} is ₹${minOrder.toLocaleString('en-IN')}.`);
      return false;
    }

    return true;
  };

  const loadRazorpayScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if ((window as unknown as RazorpayWindow).Razorpay) {
        return resolve();
      }

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay script')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.body.appendChild(script);
    });
  }, []);

  const saveShippingAddressToProfile = useCallback(async (address: AddressSnapshot) => {
    if (!user) return;

    const addressInsert = {
      user_id: user.id,
      type: 'shipping',
      is_default: true,
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || null,
      area: address.area || null,
      tehsil: address.tehsil || null,
      district: address.district || null,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
    };

    const { data: existingAddresses, error: fetchError } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'shipping')
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    if (Array.isArray(existingAddresses) && existingAddresses.length > 0) {
      const { error: updateError } = await supabase
        .from('addresses')
        .update(addressInsert)
        .eq('user_id', user.id)
        .eq('type', 'shipping');
      if (updateError) throw updateError;
      return;
    }

    const { error: insertError } = await supabase
      .from('addresses')
      .insert(addressInsert);
    if (insertError) throw insertError;
  }, [user]);

  const handlePlaceOrder = async () => {
      if (!user) return;

      if (!validateAddress()) {
        return;
      }

      if (items.length === 0) {
        toast.error('Your cart is empty. Add something to checkout.');
        navigate('/cart');
        return;
      }

      if (paymentMethod === 'razorpay' && !isRazorpayAvailable) {
        toast.error('Online payments are currently unavailable. Please choose Cash on Delivery.');
        return;
      }

      const shippingAddress: AddressSnapshot = {
        full_name: newAddress.full_name,
        phone: newAddress.phone,
        address_line1: newAddress.address_line1,
        address_line2: newAddress.address_line2,
        area: newAddress.area,
        tehsil: newAddress.tehsil,
        district: newAddress.district,
        city: newAddress.city,
        state: newAddress.state,
        postal_code: newAddress.postal_code,
        country: newAddress.country,
        delivery_charge: shippingCost,
        estimated_delivery_time: matchingArea?.estimated_delivery_time || null,
      };

      try {
        await saveShippingAddressToProfile(shippingAddress);
      } catch (err) {
        console.error('Failed to save shipping address:', err);
        toast.error('Could not save your shipping address, but your order can still be placed.');
      }

      setSavingOrder(true);

      try {
        const orderNumber = `GM${Date.now().toString().slice(-8)}`;

        const razorpayItems = items.map((item) => {
          const price = item.product?.is_flash_sale && item.product?.flash_sale_price
            ? item.product.flash_sale_price
            : item.product?.price || 0;

          return {
            product_id: item.product_id,
            product_name: item.product?.name || 'Unknown Product',
            product_image: item.product?.images?.[0] || null,
            quantity: item.quantity,
            price,
            total: price * item.quantity,
          };
        });

        const processStockDeduction = async (
          orderedItems: Array<{ product_id: string; quantity: number }>,
          orderId?: string
        ) => {
          if (orderId) {
            try {
              const { error: rpcErr } = await supabase.rpc('deduct_order_stock', {
                p_order_id: orderId,
              });
              if (!rpcErr) return;
            } catch (e) {
              console.warn('deduct_order_stock RPC notice:', e);
            }
          }

          for (const item of orderedItems) {
            if (!item.product_id || !item.quantity) continue;
            try {
              const { data: currentProduct } = await supabase
                .from('products')
                .select('quantity')
                .eq('id', item.product_id)
                .maybeSingle();

              if (currentProduct && typeof currentProduct.quantity === 'number') {
                const updatedQty = Math.max(0, currentProduct.quantity - item.quantity);
                const { error: updateError } = await supabase
                  .from('products')
                  .update({
                    quantity: updatedQty,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', item.product_id);

                if (updateError) {
                  console.error(`Direct stock update failed for ${item.product_id}:`, updateError);
                }
              }
            } catch (err) {
              console.error(`Direct stock update exception for ${item.product_id}:`, err);
            }
          }
        };

        if (paymentMethod === 'razorpay') {
          const payload = {
            user_id: user.id,
            order_number: orderNumber,
            total,
            subtotal,
            discount,
            shipping_cost: shippingCost,
            tax: 0,
            currency: settings.currency || 'INR',
            shipping_address: shippingAddress,
            billing_address: shippingAddress,
            items: razorpayItems,
            email: user.email ?? undefined,
            phone: shippingAddress.phone,
            coupon_id: appliedCoupon ? appliedCoupon.id : null,
            notes: null,
          };

          console.info('[Razorpay] Initiating order creation:', { order_number: orderNumber, total, currency: payload.currency });
          const response = (await createRazorpayOrder(payload)) as CreateRazorpayOrderResponse;
          if (response.error || !response.razorpayOrder || !response.order) {
            console.error('[Razorpay] Order creation failed:', response);
            toast.error(response.error || 'Failed to create Razorpay order. Please try again or use Cash on Delivery.');
            setSavingOrder(false);
            return;
          }

          const razorpayOrder = response.razorpayOrder;
          const orderRecord = response.order;
          const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || settings.razorpay_key || '';

          if (!keyId) {
            console.error('[Razorpay] Key ID missing (VITE_RAZORPAY_KEY_ID / settings.razorpay_key)');
            toast.error('Payment gateway key is not configured.');
            setSavingOrder(false);
            return;
          }

          const options: Record<string, unknown> = {
            key: keyId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: settings.store_name,
            description: `Order ${orderNumber}`,
            prefill: {
              name: shippingAddress.full_name,
              email: user.email ?? '',
              contact: shippingAddress.phone,
            },
            notes: {
              order_number: orderNumber,
            },
            handler: async function (response: RazorpayPaymentResponse) {
              setSavingOrder(true);
              try {
                const verifyPayload = {
                  order_id: orderRecord.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id || (razorpayOrder.id ?? ''),
                  razorpay_signature: response.razorpay_signature || '',
                };

                const verifyData = await verifyRazorpayPayment(verifyPayload);

                if (verifyData.error) {
                  toast.error(verifyData.error);
                  navigate(`/order-failure?order=${orderNumber}`);
                  return;
                }

                await processStockDeduction(razorpayItems, orderRecord.id);

                try {
                  await sendOrderEmail({
                    customerEmail: user.email,
                    customerName: shippingAddress.full_name,
                    orderNumber,
                    items: razorpayItems,
                    total,
                    storeName: settings.store_name,
                  });
                } catch (error) {
                  console.error("Failed to send order email:", error);
                }

                if (appliedCoupon) {
                  await incrementCouponUsage(appliedCoupon.id);
                }

                await clearCart();

                navigate(
                  `/order-success?order=${orderNumber}&email=${encodeURIComponent(user.email ?? "")}`
                );
              } catch {
                toast.error('Payment verification failed. Please contact support.');
                navigate(`/order-failure?order=${orderNumber}`);
              } finally {
                setSavingOrder(false);
              }
            },
            modal: {
              ondismiss: async () => {
                toast.error('Payment was cancelled.');
                await markRazorpayOrderFailed({ order_id: orderRecord.id, reason: 'payment_cancelled' });
                setSavingOrder(false);
                navigate(`/order-failure?order=${orderNumber}`);
              },
            },
          };

          if (razorpayOrder.id && typeof razorpayOrder.id === 'string' && !razorpayOrder.id.includes('ORD_') && !razorpayOrder.id.includes('ORD-')) {
            options.order_id = razorpayOrder.id;
          }

          try {
            await loadRazorpayScript();
            const rzp = new (window as unknown as RazorpayWindow).Razorpay(options);
            rzp.open();
          } catch (err) {
            console.error('Razorpay script load failed:', err);
            toast.error('Unable to load payment gateway. Please try again later.');
            await markRazorpayOrderFailed({ order_id: orderRecord.id, reason: 'gateway_load_failed' });
            navigate(`/order-failure?order=${orderNumber}`);
          }
          return;
        }

        // Execute authoritative database-side COD order creation
        const codItemsPayload = items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        }));

        let createdOrderId: string | null = null;
        let createdOrderTotal = total;

        const { data: codRpcData, error: codRpcError } = await supabase.rpc('create_cod_order', {
          p_order_number: orderNumber,
          p_shipping_address: shippingAddress,
          p_billing_address: shippingAddress,
          p_items: codItemsPayload,
          p_coupon_id: appliedCoupon ? appliedCoupon.id : null,
          p_notes: null,
        });

        if (codRpcError) {
          console.warn('[COD Order] RPC returned error, attempting fallback insert:', codRpcError.message);
          
          // Fallback path in case RPC is not yet executed in database instance
          const { data: orderResult, error: orderError } = await supabase
            .from('orders')
            .insert({
              order_number: orderNumber,
              user_id: user.id,
              status: 'pending',
              payment_status: 'pending',
              payment_method: paymentMethod,
              payment_id: null,
              subtotal,
              discount,
              shipping_cost: shippingCost,
              tax: 0,
              total,
              coupon_id: appliedCoupon ? appliedCoupon.id : null,
              shipping_address: shippingAddress,
            })
            .select()
            .maybeSingle();

          if (orderError || !orderResult) {
            console.error(orderError);
            toast.error(orderError?.message || 'Order was not created.');
            setSavingOrder(false);
            return;
          }

          createdOrderId = orderResult.id;

          const orderItems = items.map(item => ({
            order_id: orderResult.id,
            product_id: item.product_id,
            product_name: item.product?.name || 'Unknown Product',
            product_image: item.product?.images?.[0] || null,
            quantity: item.quantity,
            price: item.product?.is_flash_sale && item.product?.flash_sale_price
              ? item.product.flash_sale_price
              : item.product?.price || 0,
            total: (item.product?.is_flash_sale && item.product?.flash_sale_price
              ? item.product.flash_sale_price
              : item.product?.price || 0) * item.quantity,
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) {
            console.error(itemsError);
            await supabase.from('orders').delete().eq('id', orderResult.id);
            toast.error(itemsError.message);
            setSavingOrder(false);
            return;
          }

          await processStockDeduction(
            items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
            orderResult.id
          );

          if (appliedCoupon) {
            await incrementCouponUsage(appliedCoupon.id);
          }
        } else {
          if (!codRpcData || !codRpcData.success) {
            toast.error('Failed to create Cash on Delivery order.');
            setSavingOrder(false);
            return;
          }
          createdOrderId = codRpcData.order_id;
          createdOrderTotal = codRpcData.total ?? total;
        }

        try {
          await sendOrderEmail({
            customerEmail: user.email,
            customerName: shippingAddress.full_name,
            orderNumber,
            items: razorpayItems,
            total: createdOrderTotal,
            storeName: settings.store_name,
          });
        } catch (error) {
          console.error("Failed to send order email:", error);
        }

        await clearCart();

        navigate(
          `/order-success?order=${orderNumber}&email=${encodeURIComponent(user.email ?? "")}`
        );
      } catch (error) {
        console.error("Checkout Error:", error);

        toast.error(
            error instanceof Error
                ? error.message
                : "Unknown checkout error"
        );
} finally {
        setSavingOrder(false);
      }
    };

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-8">
      Checkout • {settings.store_name}
</h1>
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Left Column - Address & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delivery Address & Locality
                </h2>
              </div>

              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectNewAddress()}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Enter New Address
                </button>
              )}
            </div>

            {/* Saved Addresses Picker */}
            {savedAddresses.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Choose from saved addresses:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    const addrServiceable = activeAreas.some(
                      (a) =>
                        addr.area &&
                        a.area_name.toLowerCase() === addr.area.toLowerCase() &&
                        a.is_active
                    );

                    return (
                      <div
                        key={addr.id}
                        onClick={() => selectSavedAddress(addr)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-left relative ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/30 dark:bg-primary-950/30 ring-2 ring-primary-500/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                            {addr.full_name}
                          </p>
                          {addr.area && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                addrServiceable
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              }`}
                            >
                              {addrServiceable ? '✓ Serviceable' : '✕ Unavailable'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {addr.address_line1}, {addr.area ? `${addr.area}, ` : ''}{addr.tehsil ? `${addr.tehsil}, ` : ''}{addr.district ? `${addr.district}, ` : ''}{addr.city} - {addr.postal_code}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          Ph: {addr.phone}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  value={newAddress.full_name}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, full_name: e.target.value });
                  }}
                  placeholder="Enter full name"
                />
                <Input
                  label="Phone Number *"
                  value={newAddress.phone}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, phone: e.target.value });
                  }}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Area / Locality Selector with Autocomplete and auto-fill */}
              <AreaSelector
                value={newAddress.area || ''}
                city={newAddress.city}
                tehsil={newAddress.tehsil || ''}
                district={newAddress.district || ''}
                state={newAddress.state}
                onChange={(areaName) => {
                  setSelectedAddressId('new');
                  setNewAddress((prev) => ({ ...prev, area: areaName }));
                }}
                onAutoFillLocation={(loc) => {
                  setSelectedAddressId('new');
                  setNewAddress((prev) => ({
                    ...prev,
                    city: loc.city || prev.city,
                    tehsil: loc.tehsil || prev.tehsil,
                    district: loc.district || prev.district,
                    state: loc.state || prev.state,
                    postal_code: loc.pincode || prev.postal_code,
                  }));
                }}
                required
              />

              <Input
                label="Address Line 1 (House / Flat / Building No., Street) *"
                value={newAddress.address_line1}
                onChange={(e) => {
                  setSelectedAddressId('new');
                  setNewAddress({ ...newAddress, address_line1: e.target.value });
                }}
                placeholder="Flat / House No., Floor, Building, Street Name"
              />
              <Input
                label="Address Line 2 (Landmark, Apartment)"
                value={newAddress.address_line2 ?? ''}
                onChange={(e) => {
                  setSelectedAddressId('new');
                  setNewAddress({ ...newAddress, address_line2: e.target.value });
                }}
                placeholder="Nearby landmark, apartment name (optional)"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Input
                  label="Tehsil"
                  value={newAddress.tehsil || ''}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, tehsil: e.target.value });
                  }}
                  placeholder="Tehsil (e.g. South Srinagar)"
                />
                <Input
                  label="District"
                  value={newAddress.district || ''}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, district: e.target.value });
                  }}
                  placeholder="District (e.g. Srinagar)"
                />
                <Input
                  label="City *"
                  value={newAddress.city}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, city: e.target.value });
                  }}
                  placeholder="City"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="State *"
                  value={newAddress.state}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, state: e.target.value });
                  }}
                  placeholder="State"
                />
                <Input
                  label="PIN Code *"
                  value={newAddress.postal_code}
                  onChange={(e) => {
                    setSelectedAddressId('new');
                    setNewAddress({ ...newAddress, postal_code: e.target.value });
                  }}
                  placeholder="PIN Code"
                />
              </div>

              {/* Serviceability Live Status Banner */}
              {newAddress.area && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    isAreaServiceable
                      ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                      : 'bg-red-50/80 border-red-200 dark:bg-red-950/30 dark:border-red-800 text-red-900 dark:text-red-100'
                  }`}
                >
                  {isAreaServiceable ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    {isAreaServiceable ? (
                      <div>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">
                          Delivery is available in {newAddress.area}!
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          {matchingArea?.estimated_delivery_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Estimated Delivery: {matchingArea.estimated_delivery_time}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> Delivery: {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                          </span>
                          {matchingArea && Number(matchingArea.minimum_order_amount) > 0 && (
                            <span className="flex items-center gap-1">
                              • Min. Order: ₹{Number(matchingArea.minimum_order_amount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {matchingArea && Number(matchingArea.minimum_order_amount) > 0 && subtotal < Number(matchingArea.minimum_order_amount) && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                              Minimum order amount for <strong>{matchingArea.area_name}</strong> is <strong>₹{Number(matchingArea.minimum_order_amount).toLocaleString('en-IN')}</strong>. Please add ₹{(Number(matchingArea.minimum_order_amount) - subtotal).toLocaleString('en-IN')} more to checkout.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-red-800 dark:text-red-300">
                          Delivery is currently unavailable in "{newAddress.area}".
                        </p>
                        <p className="text-red-700 dark:text-red-400 mt-0.5">
                          We do not deliver to this locality yet. Please choose or enter a serviceable delivery locality to complete your purchase.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payment Method
              </h2>
            </div>

            <div className="space-y-3">
               {settings.cod_enabled && (
<label
  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
    paymentMethod === "cod"
      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
  }`}
>
  <input
    type="radio"
    name="payment"
    checked={paymentMethod === "cod"}
    onChange={() => setPaymentMethod("cod")}
  />

  <div className="flex-1">
    <p className="font-medium text-gray-900 dark:text-white">
      Cash on Delivery
    </p>

    <p className="text-sm text-gray-500 dark:text-gray-400">
      Pay when you receive your order
    </p>
  </div>

  <Truck className="h-6 w-6 text-gray-400" />
</label>
)}

              <label
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === 'razorpay'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  disabled={!isRazorpayAvailable}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Online Payment
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Secure online payment gateway (UPI, Cards, NetBanking)
                    {!isRazorpayAvailable && ' (temporarily unavailable)'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-5 opacity-60" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-5 opacity-60" />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1 mt-8 lg:mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Summary
            </h2>

            {/* Items */}
            <div className="space-y-4 mb-6">
              {items.map((item) => {
                if (!item.product) return null;
                const price = item.product.is_flash_sale && item.product.flash_sale_price
                  ? item.product.flash_sale_price
                  : item.product.price;
                return (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.product.images?.[0] || 'https://via.placeholder.com/80'}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ₹{(price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Coupon Code */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
              {appliedCoupon ? (
                <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <div>
                      <span className="font-mono font-bold text-green-800 dark:text-green-300 text-xs block">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 block">
                        {appliedCoupon.type === 'percentage'
                          ? `${appliedCoupon.value}% OFF`
                          : `₹${appliedCoupon.value} OFF`}
                        {discount > 0 ? ` (-₹${discount.toLocaleString()})` : ''}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      removeCoupon();
                      toast.success('Coupon removed');
                    }}
                    className="text-red-600 hover:text-red-700 text-xs px-2 py-1 h-auto"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCheckoutApplyCoupon} className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
                    Have a coupon code?
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 text-xs"
                    />
                    <Button type="submit" variant="outline" size="sm" loading={applyingCoupon}>
                      Apply
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-3 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ₹{subtotal.toLocaleString()}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Discount ({appliedCoupon?.code})
                  </span>
                  <span>-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
Shipping
{shippingCost === 0 && (
<span className="text-green-600 ml-2">
(Free above ₹{settings.free_shipping_amount})
</span>
)}
</span>
                {shippingCost === 0 ? (
                  <span className="text-green-600 font-medium">FREE</span>
                ) : (
                  <span className="text-gray-900 dark:text-white font-medium">
                    ₹{shippingCost}
                  </span>
                )}
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                <span className="text-gray-900 dark:text-white font-semibold text-base">Total</span>
                <span className="text-gray-900 dark:text-white font-bold text-xl">
                  ₹{total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Place Order Button */}
            <Button
              size="lg"
              className="w-full mt-6 min-h-[48px] font-bold"
              onClick={handlePlaceOrder}
              loading={savingOrder}
              disabled={items.length === 0 || savingOrder}
              icon={<ShoppingBag className="h-5 w-5" />}
            >
              Place Order • ₹{total.toLocaleString()}
            </Button>

            {/* Terms */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              By placing your order with {settings.store_name}, you agree to our{' '}
              <a href="/terms" className="text-primary-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Order Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800/80 z-40 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Amount</span>
          <span className="text-lg font-extrabold text-gray-900 dark:text-white">
            ₹{total.toLocaleString()}
          </span>
        </div>
        <Button
          size="sm"
          className="font-bold min-h-[44px] px-6 py-2.5 shadow-lg shadow-primary-500/20"
          onClick={handlePlaceOrder}
          loading={savingOrder}
          disabled={items.length === 0 || savingOrder}
          icon={<ShoppingBag className="h-4 w-4" />}
        >
          Place Order
        </Button>
      </div>
    </div>
  );
}
export default CheckoutPage;

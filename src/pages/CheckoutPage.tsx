import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Truck, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { Button, Input, LoadingSpinner } from '../components/common';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { createRazorpayOrder, verifyRazorpayPayment, markRazorpayOrderFailed } from '../lib/payment';
import type { Address } from '../types/database';

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
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: settings.country || "India",
  });

  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      navigate('/cart');
      return;
    }
  }, [user, items, navigate]);

  useEffect(() => {
    const fetchAddresses = async () => {
  if (!user) return;

  setLoading(true);

  try {
    const { data, error } = await supabase
  .from("addresses")
  .select("*")
  .eq("user_id", user.id);

console.log("Current User:", user);
console.log("Fetched Addresses:", data);
console.log("Supabase Error:", error);

    if (error) throw error;

    const addressList = (data || []) as Address[];

    setAddresses(addressList);

    if (addressList.length > 0) {
      const defaultAddress =
        addressList.find((a) => a.is_default) || addressList[0];

      setSelectedAddress(defaultAddress.id);
    } else {
      setSelectedAddress(null);
    }
  } catch (error) {
    console.error("Address Error:", error);
    toast.error("Failed to load addresses");
  } finally {
    setLoading(false);
  }
};
    fetchAddresses();
  }, [user]);

  const shippingCost =
  subtotal >= settings.free_shipping_amount
    ? 0
    : settings.shipping_charge;
  const total = subtotal + shippingCost;


const sendOrderEmail = async (orderData: any) => {
  try {
    const response = await fetch("/.netlify/functions/send-order-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const text = await response.text();

    alert(
      `Status: ${response.status}\n\n${text || "(Empty response)"}`
    );

    return text;
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Email sending failed"
    );
  }
};

const handlePlaceOrder = async () => {
    if (!showNewAddressForm && addresses.length === 0) {
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user!.id);

  if (data && data.length > 0) {
    setAddresses(data as Address[]);
    setSelectedAddress(
      data.find(a => a.is_default)?.id ?? data[0].id
    );
  } else {
    toast.error("Please add a delivery address");
    setSavingOrder(false);
    return;
  }
}

if (
  addresses.length > 0 &&
  !selectedAddress &&
  !showNewAddressForm
) {
  const defaultAddress =
    addresses.find((a) => a.is_default) || addresses[0];

  setSelectedAddress(defaultAddress.id);

  toast.error("Please select a delivery address");

  return;
}

    if (showNewAddressForm) {
      if (!newAddress.full_name || !newAddress.phone || !newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.postal_code) {
        toast.error('Please fill all required fields');
        return;
      }
    }
    if (!user) return;

    setSavingOrder(true);

    try {
      let shippingAddressData: Address | null = null;

      if (showNewAddressForm) {

      const { data: savedAddress, error: addressError } = await supabase
  .from('addresses')
  .insert({
    user_id: user.id,
    type: 'shipping',
    is_default: addresses.length === 0,
    ...newAddress,
  })
  .select()
  .single();

if (addressError || !savedAddress) {
  toast.error(addressError?.message || "Failed to save address");
  setSavingOrder(false);
  return;
}

shippingAddressData = savedAddress as Address;

setAddresses(prev => [...prev, savedAddress as Address]);
setSelectedAddress(savedAddress.id);
setShowNewAddressForm(false);
      } else {
        shippingAddressData =
  addresses.find((a) => a.id === selectedAddress) ??
  addresses.find((a) => a.is_default) ??
  addresses[0] ??
  null;
      }

      if (!shippingAddressData) {
        toast.error('Please select a delivery address');
        setSavingOrder(false);
        return;
      }

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

      if (paymentMethod === 'razorpay') {
        const payload = {
          user_id: user.id,
          order_number: orderNumber,
          total,
          subtotal,
          discount: 0,
          shipping_cost: shippingCost,
          tax: 0,
          currency: settings.currency || 'INR',
          shipping_address: {
            full_name: shippingAddressData.full_name,
            phone: shippingAddressData.phone,
            address_line1: shippingAddressData.address_line1,
            address_line2: shippingAddressData.address_line2,
            city: shippingAddressData.city,
            state: shippingAddressData.state,
            postal_code: shippingAddressData.postal_code,
            country: shippingAddressData.country,
          },
          billing_address: {
            full_name: shippingAddressData.full_name,
            phone: shippingAddressData.phone,
            address_line1: shippingAddressData.address_line1,
            address_line2: shippingAddressData.address_line2,
            city: shippingAddressData.city,
            state: shippingAddressData.state,
            postal_code: shippingAddressData.postal_code,
            country: shippingAddressData.country,
          },
          items: razorpayItems,
          email: user.email ?? undefined,
          phone: shippingAddressData.phone,
          coupon_id: null,
          notes: null,
        };

        const response = await createRazorpayOrder(payload);
        if (response.error || !response.razorpayOrder || !response.order) {
          toast.error(response.error || 'Failed to create Razorpay order');
          setSavingOrder(false);
          return;
        }

        const razorpayOrder = response.razorpayOrder;
        const orderRecord = response.order;

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: settings.store_name,
          description: `Order ${orderNumber}`,
          order_id: razorpayOrder.id,
          prefill: {
            name: shippingAddressData.full_name,
            email: user.email ?? '',
            contact: shippingAddressData.phone,
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
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              };

              const verifyData = await verifyRazorpayPayment(verifyPayload);

              if (verifyData.error) {
                toast.error(verifyData.error);
                navigate(`/order-failure?order=${orderNumber}`);
                return;
              }

              console.log("=== EMAIL DEBUG ===");
console.log({
  customerEmail: user.email,
  customerName: shippingAddressData.full_name,
  orderNumber,
  items: razorpayItems,
  total,
});

await sendOrderEmail({
  customerEmail: user.email,
  customerName: shippingAddressData.full_name,
  orderNumber,
  items: razorpayItems,
  total,
});

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

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          const rzp = new (window as unknown as RazorpayWindow).Razorpay(options);
          rzp.open();
        };
        script.onerror = async () => {
          toast.error('Unable to load payment gateway. Please try again later.');
          await markRazorpayOrderFailed({ order_id: orderRecord.id, reason: 'gateway_load_failed' });
          navigate(`/order-failure?order=${orderNumber}`);
        };
        document.body.appendChild(script);
        return;
      }

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
          discount: 0,
          shipping_cost: shippingCost,
          tax: 0,
          total,
          shipping_address: {
            full_name: shippingAddressData.full_name,
            phone: shippingAddressData.phone,
            address_line1: shippingAddressData.address_line1,
            address_line2: shippingAddressData.address_line2,
            city: shippingAddressData.city,
            state: shippingAddressData.state,
            postal_code: shippingAddressData.postal_code,
            country: shippingAddressData.country,
          },
        })
        .select()
        .maybeSingle();

      if (orderError) {
  console.error(orderError);
  toast.error(orderError.message);
  return;
}

if (!orderResult) {
  toast.error("Order was not created.");
  return;
}

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

  await supabase
    .from("orders")
    .delete()
    .eq("id", orderResult.id);

  toast.error(itemsError.message);

  return;
}

      await Promise.all(
        items.map(async (item) => {
          if (!item.product) return;
          const { error } = await supabase.rpc('decrement_product_quantity', {
            p_id: item.product_id,
            qty: item.quantity,
          });
          if (error) {
            console.error('Inventory decrement failed for', item.product_id, error);
          }
        })
      );

      console.log("=== EMAIL DEBUG ===");
console.log({
  customerEmail: user.email,
  customerName: shippingAddressData.full_name,
  orderNumber,
  items: orderItems,
  total,
});

await sendOrderEmail({
  customerEmail: user.email,
  customerName: shippingAddressData.full_name,
  orderNumber,
  items: orderItems,
  total,
});

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delivery Address
              </h2>
            </div>

            {addresses.length > 0 && !showNewAddressForm ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddress === address.id
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress === address.id}
                        onChange={() => setSelectedAddress(address.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {address.full_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {address.address_line1}
                          {address.address_line2 && `, ${address.address_line2}`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {address.city}, {address.state} - {address.postal_code}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Phone: {address.phone}
                        </p>
                        {address.is_default && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
                <Button
  variant="outline"
  onClick={() => {
    setSelectedAddress(null);
    setShowNewAddressForm(true);
  }}
  className="w-full mt-4"
>
  Add New Address
</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    value={newAddress.full_name}
                    onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                  <Input
                    label="Phone Number *"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <Input
                  label="Address Line 1 *"
                  value={newAddress.address_line1}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                  placeholder="Street address"
                />
                <Input
                  label="Address Line 2"
                  value={newAddress.address_line2}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                  placeholder="Apartment, suite, etc. (optional)"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City *"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    placeholder="City"
                  />
                  <Input
                    label="State *"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    placeholder="State"
                  />
                  <Input
                    label="PIN Code *"
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    placeholder="PIN Code"
                  />
                </div>
                {addresses.length > 0 && (
                  <Button
  variant="ghost"
  onClick={() => {
    setShowNewAddressForm(false);

    if (addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.is_default);
      setSelectedAddress(defaultAddr ? defaultAddr.id : addresses[0].id);
    }
  }}
>
  Use Existing Address
</Button>
                )}
              </div>
            )}
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
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                  Online Payment
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Secure online payment gateway
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

            {/* Pricing */}
            <div className="space-y-3 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ₹{subtotal.toLocaleString()}
                </span>
              </div>
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
              className="w-full mt-6"
              onClick={handlePlaceOrder}
              loading={savingOrder}
              disabled={items.length === 0}
              icon={<ShoppingBag className="h-5 w-5" />}
            >
              Place Order at {settings.store_name}
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
    </div>
  );
}
export default CheckoutPage;

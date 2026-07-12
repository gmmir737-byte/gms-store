import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Truck, ShoppingBag, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button, Input, EmptyState, LoadingSpinner } from '../components/common';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Address } from '../types/database';

export function CheckoutPage() {
  const { user, profile } = useAuth();
  const { items, subtotal, clearCart } = useCart();
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
    country: 'India',
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
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'shipping');
      if (data && data.length > 0) {
        setAddresses(data as Address[]);
        const defaultAddr = data.find(a => a.is_default);
        setSelectedAddress(defaultAddr ? defaultAddr.id : data[0].id);
      }
      setLoading(false);
    };
    fetchAddresses();
  }, [user]);

  const shippingCost = subtotal >= 499 ? 0 : 49;
  const total = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    if (!selectedAddress && !showNewAddressForm) {
      toast.error('Please select or add a delivery address');
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
        const { data: savedAddress } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            type: 'shipping',
            is_default: addresses.length === 0,
            ...newAddress,
          })
          .select()
          .maybeSingle();
        if (savedAddress) {
          shippingAddressData = savedAddress as Address;
        }
      } else {
        shippingAddressData = addresses.find(a => a.id === selectedAddress) || null;
      }

      if (!shippingAddressData) {
        toast.error('Please select a delivery address');
        setSavingOrder(false);
        return;
      }

      const orderNumber = `GM${Date.now().toString().slice(-8)}`;

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          status: 'pending',
          payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
          payment_method: paymentMethod,
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

      if (orderError || !orderResult) {
        toast.error('Failed to create order');
        setSavingOrder(false);
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
        toast.error('Failed to add order items');
        setSavingOrder(false);
        return;
      }

      for (const item of items) {
        if (item.product) {
          const { error } = await supabase.rpc('decrement_product_quantity', {
  p_id: item.product_id,
  qty: item.quantity
});

if (error) {
  console.error(error);
}
        }
      }

      await clearCart();

      navigate(`/order-success?order=${orderNumber}`);
    } catch (err) {
      toast.error('Something went wrong');
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
        Checkout
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
                  onClick={() => setShowNewAddressForm(true)}
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
                    onClick={() => setShowNewAddressForm(false)}
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
              <label
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  paymentMethod === 'cod'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">Cash on Delivery</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pay when you receive your order
                  </p>
                </div>
                <Truck className="h-6 w-6 text-gray-400" />
              </label>

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
                    Razorpay (Coming Soon)
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pay securely with cards, UPI, wallets
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
                      src={item.product.images[0] || 'https://via.placeholder.com/80'}
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
                <span className="text-gray-600 dark:text-gray-400">Shipping</span>
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
              Place Order
            </Button>

            {/* Terms */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              By placing your order, you agree to our{' '}
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

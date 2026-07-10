import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, Heart, Tag, Shield, RotateCcw, Truck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { Button, QuantitySelector, Badge, EmptyState, Input } from '../components/common';
import toast from 'react-hot-toast';

export function CartPage() {
  const { items, loading, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const { addItem: addToWishlist } = useWishlist();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const shippingCost = subtotal >= 499 ? 0 : 49;
  const total = subtotal + shippingCost;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setApplyingCoupon(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.error('Invalid coupon code');
    setApplyingCoupon(false);
  };

  const handleMoveToWishlist = async (productId: string, itemId: string) => {
    await addToWishlist(productId);
    await removeItem(itemId);
    toast.success('Moved to wishlist');
  };

  if (items.length === 0 && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          icon={<ShoppingBag className="h-20 w-20" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Start shopping to fill it up!"
          action={
            <Link to="/shop">
              <Button icon={<ShoppingBag className="h-5 w-5" />}>Start Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-8">
        Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            if (!item.product) return null;
            const product = item.product;
            const displayPrice = product.is_flash_sale && product.flash_sale_price
              ? product.flash_sale_price
              : product.price;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex gap-4">
                  <Link to={`/product/${product.slug}`} className="flex-shrink-0">
                    <img
                      src={product.images[0] || 'https://via.placeholder.com/120'}
                      alt={product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${product.slug}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {product.category?.name}
                    </p>

                    <div className="flex items-center gap-4 mt-3">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(qty) => updateQuantity(item.id, qty)}
                        max={Math.min(product.quantity, 10)}
                        size="sm"
                      />
                      <button
                        onClick={() => handleMoveToWishlist(product.id, item.id)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <Heart className="h-4 w-4" />
                        Move to Wishlist
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      ₹{(displayPrice * item.quantity).toLocaleString()}
                    </p>
                    {product.compare_price && product.compare_price > displayPrice && (
                      <p className="text-sm text-gray-400 line-through">
                        ₹{(product.compare_price * item.quantity).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Clear Cart */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                clearCart();
                toast.success('Cart cleared');
              }}
              icon={<Trash2 className="h-4 w-4" />}
              className="text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Clear Cart
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1 mt-8 lg:mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Summary
            </h2>

            {/* Coupon Code */}
            <form onSubmit={handleApplyCoupon} className="mb-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Coupon Code
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="outline" loading={applyingCoupon}>
                  Apply
                </Button>
              </div>
            </form>

            {/* Pricing */}
            <div className="space-y-3 text-sm">
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
              {shippingCost > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Add ₹{(499 - subtotal).toLocaleString()} more for FREE shipping
                </p>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-900 dark:text-white font-semibold text-base">Total</span>
                  <span className="text-gray-900 dark:text-white font-bold text-xl">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Inclusive of all taxes
                </p>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full mt-6"
              onClick={() => navigate('/checkout')}
              disabled={items.length === 0}
              icon={<ArrowRight className="h-5 w-5" />}
              iconPosition="right"
            >
              Proceed to Checkout
            </Button>

            {/* Continue Shopping */}
            <Link
              to="/shop"
              className="block text-center text-primary-600 dark:text-primary-400 font-medium mt-4 hover:underline"
            >
              Continue Shopping
            </Link>

            {/* Trust Badges */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4" />
                <span>Secure checkout</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <RotateCcw className="h-4 w-4" />
                <span>7-day easy returns</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Truck className="h-4 w-4" />
                <span>Free shipping over ₹499</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

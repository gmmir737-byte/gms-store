import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { Badge } from '../common';
import type { Product } from '../../types/database';
import toast from 'react-hot-toast';
import { useInteractiveTilt } from '../../hooks/useInteractiveTilt';

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list';
}

export function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
  const { addItem: addToCart, items } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  const tilt = useInteractiveTilt({
    maxRotation: variant === 'list' ? 6 : 11,
    perspective: 1100,
    scaleOnHover: 1.025,
  });

  const inWishlist = isInWishlist(product.id);
  const inCart = items.some(i => i.product_id === product.id);
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  const displayPrice = product.is_flash_sale && product.flash_sale_price
    ? product.flash_sale_price
    : product.price;

  const flashDiscount = product.compare_price && product.flash_sale_price
    ? Math.round(((product.compare_price - product.flash_sale_price) / product.compare_price) * 100)
    : discount;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    const res = await addToCart(product.id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Added to cart!');
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      await removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      await addToWishlist(product.id);
      toast.success('Added to wishlist!');
    }
  };

  if (variant === 'list') {
    return (
      <Link
        to={`/product/${product.slug}`}
        ref={tilt.ref as any}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        onPointerCancel={tilt.onPointerCancel}
        style={tilt.style}
        className="motion-surface holo-surface group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 border border-gray-100 dark:border-gray-700/80 flex flex-col sm:flex-row gap-4 p-4 overflow-hidden"
      >
        <div className="relative w-full sm:w-36 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700/50 layer-pop">
          <img
            src={product.images[0] || 'https://via.placeholder.com/200'}
            alt={product.name}
            className="w-full h-full object-cover transform-gpu group-hover:scale-108 transition-transform duration-700 ease-out"
          />
          {product.is_flash_sale && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-primary-600 to-amber-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md shadow-primary-900/20">
              <Zap className="h-3 w-3 fill-current animate-pulse" />
              {flashDiscount}% OFF
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-medium text-primary-600 dark:text-primary-400 mb-1">
              {product.category?.name}
            </p>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {product.rating_avg.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({product.rating_count} reviews)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                ₹{displayPrice.toLocaleString()}
              </span>
              {product.compare_price && product.compare_price > displayPrice && (
                <span className="text-sm text-gray-400 line-through ml-2">
                  ₹{product.compare_price.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex gap-2 layer-pop">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleWishlistToggle}
                className={`p-2.5 rounded-xl transition-colors shadow-sm ${
                  inWishlist
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleAddToCart}
                disabled={product.quantity <= 0}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-sm ${
                  inCart
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ShoppingCart className="h-4 w-4" />
                {inCart ? 'In Cart' : 'Add'}
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      ref={tilt.ref as any}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      onPointerCancel={tilt.onPointerCancel}
      style={tilt.style}
      className="motion-surface holo-surface group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-2xl hover:shadow-primary-500/15 transition-all duration-500 border border-gray-100/80 dark:border-gray-700/80 overflow-hidden flex flex-col justify-between"
    >
      {/* Image Container with 3D Depth Layer */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
        <div className="w-full h-full layer-pop">
          <img
            src={product.images[0] || 'https://via.placeholder.com/400'}
            alt={product.name}
            className="w-full h-full object-cover transform-gpu group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        </div>

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 layer-float z-10">
          {product.is_flash_sale && product.flash_sale_price && (
            <Badge variant="error" size="sm" className="flex items-center gap-1 shadow-md bg-gradient-to-r from-red-600 to-amber-600 border-none text-white font-semibold">
              <Zap className="h-3 w-3 fill-current animate-pulse" />
              Flash {flashDiscount}% OFF
            </Badge>
          )}
          {!product.is_flash_sale && discount > 0 && (
            <Badge variant="success" size="sm" className="shadow-sm font-semibold">{discount}% OFF</Badge>
          )}
          {product.is_new && <Badge variant="info" size="sm" className="shadow-sm">New</Badge>}
          {product.is_bestseller && <Badge variant="warning" size="sm" className="shadow-sm">Bestseller</Badge>}
        </div>

        {/* Quick Wishlist Floating Action */}
        <div className="absolute top-3 right-3 layer-float z-10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            onClick={handleWishlistToggle}
            className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-colors ${
              inWishlist
                ? 'bg-red-500 text-white'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-red-500 hover:text-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
          </motion.button>
        </div>

        {/* Add to Cart Glass Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/80 via-gray-950/40 to-transparent p-3.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            disabled={product.quantity <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm shadow-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            {product.quantity <= 0 ? 'Out of Stock' : inCart ? 'In Cart' : 'Add to Cart'}
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">
            {product.category?.name || 'Uncategorized'}
          </p>
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-2 min-h-[2.5rem] leading-snug">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.round(product.rating_avg)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-200 dark:text-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 font-medium">
              ({product.rating_count})
            </span>
          </div>
        </div>

        <div>
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
              ₹{displayPrice.toLocaleString()}
            </span>
            {product.compare_price && product.compare_price > displayPrice && (
              <span className="text-xs text-gray-400 line-through">
                ₹{product.compare_price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Low Stock Warning */}
          {product.quantity <= 0 ? (
            <Badge variant="error" size="sm" className="mt-2">Out of Stock</Badge>
          ) : product.quantity <= 5 ? (
            <Badge variant="warning" size="sm" className="mt-2">Only {product.quantity} left</Badge>
          ) : null}

          {/* Mobile Quick Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.quantity <= 0}
            className={`sm:hidden w-full flex items-center justify-center gap-1.5 py-2 mt-2.5 rounded-xl font-bold text-xs shadow-sm transition-all min-h-[38px] ${
              inCart
                ? 'bg-emerald-600 text-white'
                : 'bg-primary-600 text-white active:bg-primary-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {product.quantity <= 0 ? 'Out of Stock' : inCart ? 'In Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  );
}


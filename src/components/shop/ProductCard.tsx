import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { Button, Badge } from '../common';
import type { Product } from '../../types/database';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list';
}

export function ProductCard({ product, variant = 'grid' }: ProductCardProps) {
  const { addItem: addToCart, items } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

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
    await addToCart(product.id);
    toast.success('Added to cart!');
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
        className="group bg-white dark:bg-gray-800 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100 dark:border-gray-700 flex gap-4 p-4"
      >
        <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={product.images[0] || 'https://via.placeholder.com/200'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.is_flash_sale && (
            <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {flashDiscount}% OFF
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{product.category?.name}</p>
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
              {product.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {product.rating_avg.toFixed(1)} ({product.rating_count})
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ₹{displayPrice.toLocaleString()}
              </span>
              {product.compare_price && product.compare_price > displayPrice && (
                <span className="text-sm text-gray-400 line-through ml-2">
                  ₹{product.compare_price.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleWishlistToggle}
                className={`p-2 rounded-lg transition-colors ${
                  inWishlist
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleAddToCart}
                disabled={product.quantity <= 0}
                className={`p-2 rounded-lg transition-colors ${
                  inCart
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <img
          src={product.images[0] || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_flash_sale && product.flash_sale_price && (
            <Badge variant="error" size="sm" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Flash {flashDiscount}% OFF
            </Badge>
          )}
          {!product.is_flash_sale && discount > 0 && (
            <Badge variant="success" size="sm">{discount}% OFF</Badge>
          )}
          {product.is_new && <Badge variant="info" size="sm">New</Badge>}
          {product.is_bestseller && <Badge variant="warning" size="sm">Bestseller</Badge>}
        </div>

        {/* Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleWishlistToggle}
            className={`p-2 rounded-full transition-colors shadow-md ${
              inWishlist
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-600 hover:bg-red-500 hover:text-white dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Add to Cart Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleAddToCart}
            disabled={product.quantity <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-5 w-5" />
            {product.quantity <= 0 ? 'Out of Stock' : inCart ? 'In Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          {product.category?.name || 'Uncategorized'}
        </p>
        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-2 min-h-[2.5rem]">
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
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({product.rating_count})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ₹{displayPrice.toLocaleString()}
          </span>
          {product.compare_price && product.compare_price > displayPrice && (
            <span className="text-sm text-gray-400 line-through">
              ₹{product.compare_price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock Status */}
        {product.quantity <= 0 ? (
          <Badge variant="error" size="sm" className="mt-2">Out of Stock</Badge>
        ) : product.quantity <= 5 ? (
          <Badge variant="warning" size="sm" className="mt-2">Only {product.quantity} left</Badge>
        ) : null}
      </div>
    </Link>
  );
}

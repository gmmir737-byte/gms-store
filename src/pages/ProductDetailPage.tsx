import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Check,
  ShoppingCart,
  Zap,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Award,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useSettings } from '../contexts/SettingsContext';
import { useDelivery } from '../contexts/DeliveryContext';
import { ProductGrid, WriteReviewModal } from '../components/shop';
import { ImageGallery, Button, Badge, QuantitySelector, Rating, EmptyState, LoadingSpinner } from '../components/common';
import type { Product, ProductVariant, Review } from '../types/database';
import toast from 'react-hot-toast';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem: addToCart, items } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { settings } = useSettings();
  const { selectedArea, openCheckerModal } = useDelivery();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'shipping' | 'reviews'>('description');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // Variant Selection State
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const inWishlist = product ? isInWishlist(product.id) : false;
  const inCart = product ? items.some(i => i.product_id === product.id) : false;

  const fetchProductAndReviews = useCallback(async () => {
    if (!slug) return;
    setLoading(true);

    const { data: productData, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !productData) {
      setLoading(false);
      return;
    }

    const fetchedProduct = productData as Product;
    setProduct(fetchedProduct);

    // Initialize variant states if available
    if (fetchedProduct.variants && fetchedProduct.variants.length > 0) {
      const firstVar = fetchedProduct.variants[0];
      setSelectedVariant(firstVar);
      if (firstVar.color) setSelectedColor(firstVar.color);
      if (firstVar.size) setSelectedSize(firstVar.size);
    } else {
      setSelectedVariant(null);
      if (fetchedProduct.color) setSelectedColor(fetchedProduct.color);
      if (fetchedProduct.size) setSelectedSize(fetchedProduct.size);
    }

    const relatedPromise = productData.category_id
      ? supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('category_id', productData.category_id)
          .neq('id', productData.id)
          .eq('status', 'active')
          .limit(4)
      : Promise.resolve({ data: [] as Product[] });

    const reviewsPromise = supabase
      .from('reviews')
      .select('*, user:profiles(full_name, avatar_url)')
      .eq('product_id', productData.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    const [relatedRes, reviewsRes] = await Promise.all([relatedPromise, reviewsPromise]);
    if (relatedRes.data) setRelatedProducts(relatedRes.data as Product[]);
    if (reviewsRes.data) setReviews(reviewsRes.data as Review[]);

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchProductAndReviews();
  }, [fetchProductAndReviews]);

  // Extract distinct variant dimensions
  const variantColors = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];
    const colors = new Set<string>();
    product.variants.forEach((v) => {
      if (v.color?.trim()) colors.add(v.color.trim());
    });
    return Array.from(colors);
  }, [product]);

  const variantSizes = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];
    const sizes = new Set<string>();
    product.variants.forEach((v) => {
      if (v.size?.trim()) sizes.add(v.size.trim());
    });
    return Array.from(sizes);
  }, [product]);

  // Handle color/size variant switching
  const handleVariantSwitch = (color?: string, size?: string) => {
    const c = color !== undefined ? color : selectedColor;
    const s = size !== undefined ? size : selectedSize;
    if (color !== undefined) setSelectedColor(c);
    if (size !== undefined) setSelectedSize(s);

    if (!product?.variants || product.variants.length === 0) return;

    const matched = product.variants.find((v) => {
      const matchC = !c || v.color?.toLowerCase() === c.toLowerCase();
      const matchS = !s || v.size?.toLowerCase() === s.toLowerCase();
      return matchC && matchS;
    });

    if (matched) {
      setSelectedVariant(matched);
    } else {
      // Fallback to variant matching color or size alone
      const partial = product.variants.find(
        (v) => (c && v.color?.toLowerCase() === c.toLowerCase()) || (s && v.size?.toLowerCase() === s.toLowerCase())
      );
      setSelectedVariant(partial || product.variants[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          title="Product not found"
          description="The product you're looking for doesn't exist or has been removed."
          action={<Link to="/shop"><Button>Browse Products</Button></Link>}
        />
      </div>
    );
  }

  // Authoritative dynamic pricing with variant overrides
  const currentBasePrice = selectedVariant?.price || product.price;
  const currentComparePrice = selectedVariant?.compare_price || product.compare_price;
  const currentStock = selectedVariant ? selectedVariant.quantity : product.quantity;

  const displayPrice = product.is_flash_sale && product.flash_sale_price
    ? product.flash_sale_price
    : currentBasePrice;

  const discount = currentComparePrice && currentComparePrice > displayPrice
    ? Math.round(((currentComparePrice - displayPrice) / currentComparePrice) * 100)
    : 0;

  // Image Gallery selection
  const activeImages = selectedVariant?.image_url
    ? [selectedVariant.image_url, ...product.images.filter(img => img !== selectedVariant.image_url)]
    : product.images;

  const handleAddToCart = async () => {
    if (currentStock <= 0) {
      toast.error('Product is currently out of stock');
      return;
    }
    const res = await addToCart(product.id, quantity);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(selectedVariant ? `Added ${selectedVariant.title} to cart!` : 'Added to cart!');
    }
  };

  const handleBuyNow = async () => {
    if (currentStock <= 0) {
      toast.error('Product is currently out of stock');
      return;
    }
    const res = await addToCart(product.id, quantity);
    if (res?.error) {
      toast.error(res.error);
    } else {
      navigate('/checkout');
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    if (inWishlist) {
      await removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      await addToWishlist(product.id);
      toast.success('Added to wishlist!');
    }
  };

  const handleOpenReviewModal = (rev?: Review) => {
    if (!user) {
      toast.error('Please sign in to write a review');
      navigate(`/login?redirect=/product/${slug}`);
      return;
    }
    setEditingReview(rev || null);
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) {
      toast.error('Failed to delete review');
    } else {
      toast.success('Review deleted');
      fetchProductAndReviews();
    }
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-6 overflow-x-auto whitespace-nowrap pb-1">
        <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-primary-600 transition-colors">Shop</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-primary-600 transition-colors">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        {product.subcategory && (
          <>
            <span className="text-gray-500">{product.subcategory}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Product Primary Details Section */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12">
        {/* Image Gallery */}
        <div>
          <ImageGallery images={activeImages} alt={product.name} />
        </div>

        {/* Product Information */}
        <div className="mt-8 lg:mt-0 space-y-5">
          {/* Brand & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className="text-xs uppercase tracking-wider font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2.5 py-1 rounded-md border border-primary-200 dark:border-primary-800/50">
                  {product.brand}
                </span>
              )}
              {product.is_flash_sale && (
                <Badge variant="error" className="flex items-center gap-1 font-bold">
                  Flash Sale {discount}% OFF
                </Badge>
              )}
              {!product.is_flash_sale && discount > 0 && (
                <Badge variant="success" className="font-bold">{discount}% OFF</Badge>
              )}
              {product.is_new && <Badge variant="info">New Arrival</Badge>}
              {product.is_bestseller && <Badge variant="warning">Bestseller</Badge>}
            </div>

            {product.sku && (
              <span className="text-xs text-gray-400 font-mono">
                SKU: {selectedVariant?.sku || product.sku}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white leading-tight">
            {product.name}
          </h1>

          {/* Rating & Review trigger */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Rating value={product.rating_avg} readonly showValue />
              <span className="text-gray-500 dark:text-gray-400">
                ({product.rating_count} reviews)
              </span>
            </div>
            <span>•</span>
            <button
              onClick={() => handleOpenReviewModal()}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline focus:outline-none"
            >
              Write a Review
            </button>
          </div>

          {/* Price Box */}
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                ₹{displayPrice.toLocaleString()}
              </span>
              {currentComparePrice && currentComparePrice > displayPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    M.R.P. ₹{currentComparePrice.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Save ₹{(currentComparePrice - displayPrice).toLocaleString()} ({discount}%)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Inclusive of all taxes {product.gst_rate ? `(${product.gst_rate}% GST included)` : ''}
            </p>
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {product.short_description}
            </p>
          )}

          {/* AMAZON-STYLE KEY BULLET POINTS */}
          {product.bullet_points && product.bullet_points.length > 0 && (
            <div className="space-y-2 pt-2 pb-1 border-y border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                About this item:
              </h3>
              <ul className="space-y-1.5 text-xs md:text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                {product.bullet_points.map((bp, i) => (
                  <li key={i} className="leading-snack">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{bp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* VARIANTS SELECTORS */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
              {/* Color Selector */}
              {variantColors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Colour:</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{selectedColor || 'Select Colour'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variantColors.map((colorName) => {
                      const isSel = selectedColor.toLowerCase() === colorName.toLowerCase();
                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => handleVariantSwitch(colorName, undefined)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            isSel
                              ? 'border-primary-600 bg-primary-50 text-primary-900 dark:bg-primary-950/60 dark:text-primary-300 ring-2 ring-primary-500/20'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {colorName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {variantSizes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Size:</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{selectedSize || 'Select Size'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variantSizes.map((sizeName) => {
                      const isSel = selectedSize.toLowerCase() === sizeName.toLowerCase();
                      return (
                        <button
                          key={sizeName}
                          type="button"
                          onClick={() => handleVariantSwitch(undefined, sizeName)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            isSel
                              ? 'border-primary-600 bg-primary-50 text-primary-900 dark:bg-primary-950/60 dark:text-primary-300 ring-2 ring-primary-500/20'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {sizeName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stock Status Indicator */}
          <div>
            {currentStock > 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                <Check className="h-4 w-4" />
                <span>In Stock</span>
                {currentStock <= (product.low_stock_threshold || 10) && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    (Only {currentStock} remaining — order soon)
                  </span>
                )}
              </div>
            ) : product.allow_backorder ? (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                <span>Available on Backorder (Ships soon)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-semibold">
                <span>Currently Out of Stock</span>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Quantity:</span>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              max={Math.min(currentStock || 10, 10)}
              disabled={currentStock <= 0 && !product.allow_backorder}
            />
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              className="flex-1 min-w-[150px]"
              onClick={handleAddToCart}
              disabled={currentStock <= 0 && !product.allow_backorder}
              icon={<ShoppingCart className="h-5 w-5" />}
            >
              {currentStock <= 0 && !product.allow_backorder
                ? 'Out of Stock'
                : inCart
                ? 'Add More'
                : 'Add to Cart'}
            </Button>

            <Button
              size="lg"
              variant="primary"
              className="flex-1 min-w-[150px] bg-amber-600 hover:bg-amber-700 text-white border-transparent shadow-md"
              onClick={handleBuyNow}
              disabled={currentStock <= 0 && !product.allow_backorder}
              icon={<Zap className="h-5 w-5" />}
            >
              Buy Now
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleWishlistToggle}
              icon={<Heart className={`h-5 w-5 ${inWishlist ? 'fill-current text-rose-500' : ''}`} />}
            >
              {inWishlist ? 'Saved' : 'Wishlist'}
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Product link copied to clipboard!');
                }
              }}
              icon={<Share2 className="h-5 w-5" />}
            >
              Share
            </Button>
          </div>

          {/* Delivery Locality Widget */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span className="text-xs font-bold text-gray-900 dark:text-white">Delivery Availability</span>
              </div>
              <button
                type="button"
                onClick={openCheckerModal}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                {selectedArea ? 'Change Area' : 'Check Locality'}
              </button>
            </div>

            {selectedArea ? (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Check className="h-3.5 w-3.5" />
                  <span>Delivery available to {selectedArea.area_name}, {selectedArea.city}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {product.estimated_delivery_text || selectedArea.estimated_delivery_time || '2 - 4 Business Days'}
                  </span>
                  <span>•</span>
                  <span>
                    Shipping:{' '}
                    {product.is_free_shipping || selectedArea.delivery_charge === 0 ? (
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</strong>
                    ) : (
                      <strong>₹{selectedArea.delivery_charge}</strong>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select your area to verify local delivery speed & charges
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs ml-2 h-7 px-2.5 flex-shrink-0"
                  onClick={openCheckerModal}
                >
                  Select Area
                </Button>
              </div>
            )}
          </div>

          {/* AMAZON-STYLE TRUST BADGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-center space-y-1">
              <Truck className="h-5 w-5 text-primary-600 mx-auto" />
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                {product.is_free_shipping ? 'Free Delivery' : 'Fast Delivery'}
              </p>
              <p className="text-[10px] text-gray-500">
                {product.is_free_shipping ? 'On this item' : `Over ₹${settings.free_shipping_amount}`}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-center space-y-1">
              <RotateCcw className="h-5 w-5 text-primary-600 mx-auto" />
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                {product.is_returnable ? `${product.return_window_days || 7} Days Return` : 'Non-Returnable'}
              </p>
              <p className="text-[10px] text-gray-500">
                {product.is_replaceable ? 'Replacement Available' : 'Easy Returns'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-center space-y-1">
              <Award className="h-5 w-5 text-primary-600 mx-auto" />
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                {product.has_warranty ? product.warranty_period || 'Warranty' : 'Genuine Product'}
              </p>
              <p className="text-[10px] text-gray-500">
                {product.has_warranty ? product.warranty_type || 'Brand Warranty' : '100% Authentic'}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-center space-y-1">
              <Shield className="h-5 w-5 text-primary-600 mx-auto" />
              <p className="text-xs font-bold text-gray-900 dark:text-white">Secure Checkout</p>
              <p className="text-[10px] text-gray-500">SSL & COD Protected</p>
            </div>
          </div>
        </div>
      </div>

      {/* EXTENDED DETAILS TABS */}
      <div className="mt-14">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'description'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Full Description
            </button>
            <button
              onClick={() => setActiveTab('specifications')}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'specifications'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'shipping'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Shipping, Warranty & Returns
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Customer Reviews ({reviews.length})
            </button>
          </div>
        </div>

        <div className="py-8">
          {/* 1. Description Tab */}
          {activeTab === 'description' && (
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm md:text-base">
                {product.description || 'No extended description available for this item.'}
              </p>
            </div>
          )}

          {/* 2. Specifications Tab */}
          {activeTab === 'specifications' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
                {product.brand && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Brand</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.brand}</span>
                  </div>
                )}
                {product.manufacturer && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Manufacturer</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.manufacturer}</span>
                  </div>
                )}
                {product.model_number && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Model Number</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.model_number}</span>
                  </div>
                )}
                {product.generic_name && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Generic Name</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.generic_name}</span>
                  </div>
                )}
                {product.country_of_origin && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Country of Origin</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.country_of_origin}</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Item Weight</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.weight} {product.unit || 'kg'}</span>
                  </div>
                )}
                {product.color && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Colour</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.color}</span>
                  </div>
                )}
                {product.size && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Size</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.size}</span>
                  </div>
                )}
                {product.material && (
                  <div className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">Material</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.material}</span>
                  </div>
                )}

                {/* Additional Dynamic Key-Values */}
                {product.specifications && Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="flex justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-gray-500 dark:text-gray-400">{k}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Shipping, Warranty & Returns Tab */}
          {activeTab === 'shipping' && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Shipping Box */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-primary-600">
                  <Truck className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Shipping Details</h3>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Estimated Dispatch: <strong>{product.estimated_delivery_text || 'Same Day / Next Day'}</strong></li>
                  <li>Shipping Class: <strong className="capitalize">{product.shipping_class || 'Standard Express'}</strong></li>
                  <li>Free Shipping: <strong>{product.is_free_shipping ? 'Eligible on this item' : `Orders over ₹${settings.free_shipping_amount}`}</strong></li>
                </ul>
              </div>

              {/* Returns Box */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-orange-600">
                  <RotateCcw className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Returns & Replacement</h3>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Return Window: <strong>{product.is_returnable ? `${product.return_window_days || 7} Days Returnable` : 'Non-Returnable'}</strong></li>
                  <li>Replacement: <strong>{product.is_replaceable ? 'Eligible for replacement' : 'Refund only'}</strong></li>
                  {product.return_conditions && (
                    <li className="pt-1 text-[11px] text-gray-500 italic">
                      Condition: {product.return_conditions}
                    </li>
                  )}
                </ul>
              </div>

              {/* Warranty Box */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Warranty Coverage</h3>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Status: <strong>{product.has_warranty ? 'Warranty Included' : 'Standard 7-Day Guarantee'}</strong></li>
                  {product.has_warranty && (
                    <>
                      <li>Period: <strong>{product.warranty_period || '1 Year'}</strong></li>
                      <li>Type: <strong>{product.warranty_type || 'Brand Warranty'}</strong></li>
                      {product.warranty_description && (
                        <li className="pt-1 text-[11px] text-gray-500 italic">
                          {product.warranty_description}
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* 4. Customer Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="text-center">
                  <p className="text-5xl font-bold text-gray-900 dark:text-white">
                    {product.rating_avg.toFixed(1)}
                  </p>
                  <Rating value={product.rating_avg} readonly size="lg" />
                  <p className="text-gray-500 dark:text-gray-400 mt-2 text-xs font-medium">
                    Based on {product.rating_count} verified reviews
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  {ratingDistribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-6 font-semibold">{rating} ★</span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review List */}
              <div className="space-y-6">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                            {review.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                {review.user?.full_name || 'Customer'}
                              </span>
                              {review.is_verified_purchase && (
                                <Badge variant="success" size="sm" className="flex items-center gap-1 text-[10px]">
                                  <Check className="h-3 w-3" />
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            {user && user.id === review.user_id && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenReviewModal(review)}
                                  className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1"
                                  title="Edit review"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(review.id)}
                                  className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1"
                                  title="Delete review"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Rating value={review.rating} readonly size="sm" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                              {review.title}
                            </h4>
                          )}
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">
                    No reviews yet. Be the first to share your experience!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">
            Similar Products You Might Like
          </h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <WriteReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          productId={product.id}
          existingReview={editingReview || undefined}
          onSuccess={() => {
            setIsReviewModalOpen(false);
            fetchProductAndReviews();
          }}
        />
      )}
    </div>
  );
}

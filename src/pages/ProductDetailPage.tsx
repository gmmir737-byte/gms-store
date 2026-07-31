import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Share2, Truck, Shield, RotateCcw, Check, ShoppingCart, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useSettings } from '../contexts/SettingsContext';
import { ProductGrid } from '../components/shop';
import { ImageGallery, Button, Badge, QuantitySelector, Rating, EmptyState, LoadingSpinner } from '../components/common';
import type { Product, Review } from '../types/database';
import toast from 'react-hot-toast';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
const { addItem: addToCart, items } = useCart();
const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
const { settings } = useSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');

  const inWishlist = product ? isInWishlist(product.id) : false;
  const inCart = product ? items.some(i => i.product_id === product.id) : false;

  useEffect(() => {
    const fetchProduct = async () => {
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

      setProduct(productData as Product);

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
    };

    fetchProduct();
  }, [slug]);

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

  const displayPrice = product.is_flash_sale && product.flash_sale_price
    ? product.flash_sale_price
    : product.price;

  const discount = product.compare_price
    ? Math.round(((product.compare_price - displayPrice) / product.compare_price) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (product.quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    const res = await addToCart(product.id, quantity);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Added to cart!');
    }
  };

  const handleWishlistToggle = async () => {
    if (inWishlist) {
      await removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      await addToWishlist(product.id);
      toast.success('Added to wishlist!');
    }
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-primary-600">Shop</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-primary-600">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white">{product.name}</span>
      </nav>

      {/* Product Details */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12">
        {/* Image Gallery */}
        <div>
          <ImageGallery images={product.images} alt={product.name} />
        </div>

        {/* Product Info */}
        <div className="mt-8 lg:mt-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {product.is_flash_sale && (
              <Badge variant="error" className="flex items-center gap-1">
                Flash Sale {discount}% OFF
              </Badge>
            )}
            {!product.is_flash_sale && discount > 0 && (
              <Badge variant="success">{discount}% OFF</Badge>
            )}
            {product.is_new && <Badge variant="info">New</Badge>}
            {product.is_bestseller && <Badge variant="warning">Bestseller</Badge>}
          </div>

          {/* Name */}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              <Rating value={product.rating_avg} readonly showValue />
              <span className="text-gray-500 dark:text-gray-400">
                ({product.rating_count} reviews)
              </span>
            </div>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline">
              Write a Review
            </button>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ₹{displayPrice.toLocaleString()}
              </span>
              {product.compare_price && product.compare_price > displayPrice && (
                <span className="text-xl text-gray-400 line-through">
                  ₹{product.compare_price.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Inclusive of all taxes
            </p>
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {product.short_description}
            </p>
          )}

          {/* Stock Status */}
          <div className="mb-6">
            {product.quantity > 0 ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-medium">In Stock</span>
                {product.quantity <= 10 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    - Only {product.quantity} items left
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="font-medium">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Quantity:</span>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                max={Math.min(product.quantity, 10)}
                disabled={product.quantity <= 0}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button
              size="lg"
              className="flex-1 min-w-[200px]"
              onClick={handleAddToCart}
              disabled={product.quantity <= 0}
              icon={<ShoppingCart className="h-5 w-5" />}
            >
              {product.quantity <= 0 ? 'Out of Stock' : inCart ? 'Add More to Cart' : 'Add to Cart'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleWishlistToggle}
              icon={<Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />}
            >
              {inWishlist ? 'Wishlisted' : 'Wishlist'}
            </Button>
            <Button variant="ghost" size="lg" icon={<Share2 className="h-5 w-5" />}>
              Share
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Truck className="h-6 w-6 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Free Delivery</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
  On orders over ₹{settings.free_shipping_amount}
</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <RotateCcw className="h-6 w-6 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
  7 Day Returns
</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Easy return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Shield className="h-6 w-6 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Secure Payment</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">100% secure checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Check className="h-6 w-6 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Genuine Product</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
  Sold by {settings.store_name}
</p>
              </div>
            </div>
          </div>

          {/* Brand & SKU */}
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            {product.brand && <p>Brand: <span className="text-gray-900 dark:text-white">{product.brand}</span></p>}
            {product.sku && <p>SKU: <span className="text-gray-900 dark:text-white">{product.sku}</span></p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'description'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('specifications')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'specifications'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Specifications
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Reviews ({reviews.length})
            </button>
          </div>
        </div>

        <div className="py-8">
          {activeTab === 'description' && (
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {product.description || 'No description available.'}
              </p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div>
              {Object.keys(product.specifications).length > 0 ? (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <dt className="text-gray-500 dark:text-gray-400">{key}</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No specifications available.</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              {/* Rating Summary */}
              <div className="flex flex-col md:flex-row gap-8 mb-8">
                <div className="text-center">
                  <p className="text-5xl font-bold text-gray-900 dark:text-white">
                    {product.rating_avg.toFixed(1)}
                  </p>
                  <Rating value={product.rating_avg} readonly size="lg" />
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {product.rating_count} reviews
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  {ratingDistribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-6">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{count}</span>
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
                          <span className="text-primary-600 dark:text-primary-400 font-medium">
                            {review.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {review.user?.full_name || 'Anonymous'}
                            </span>
                            {review.is_verified_purchase && (
                              <Badge variant="success" size="sm" className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Rating value={review.rating} readonly size="sm" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                              {review.title}
                            </h4>
                          )}
                          {review.comment && (
                            <p className="text-gray-600 dark:text-gray-400">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No reviews yet. Be the first to review this product!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">
            Related Products
          </h2>
          <ProductGrid products={relatedProducts} columns={4} />
        </section>
      )}
    </div>
  );
}
export default ProductDetailPage;

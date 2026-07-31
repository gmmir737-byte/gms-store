import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { ProductGrid } from '../components/shop';
import { Button, EmptyState } from '../components/common';
import toast from 'react-hot-toast';

export function WishlistPage() {
  const { items, removeItem } = useWishlist();
  const { addItem: addToCart } = useCart();

  const handleMoveToCart = async (productId: string, wishlistItemId: string) => {
    const res = await addToCart(productId);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    await removeItem(productId);
    toast.success('Moved to cart');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          icon={<Heart className="h-20 w-20" />}
          title="Your wishlist is empty"
          description="Save items you love by clicking the heart icon on any product."
          action={
            <Link to="/shop">
              <Button icon={<Heart className="h-5 w-5" />}>Browse Products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const products = items.map(item => item.product).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
            My Wishlist
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            for (const item of items) {
              if (item.product_id) {
                await removeItem(item.product_id);
              }
            }
            toast.success('Wishlist cleared');
          }}
        >
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          if (!product) return null;
          return (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-card border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <Link to={`/product/${product.slug}`}>
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <img
                    src={product.images[0] || 'https://via.placeholder.com/400'}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="p-4">
                <Link
                  to={`/product/${product.slug}`}
                  className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2"
                >
                  {product.name}
                </Link>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  ₹{product.price.toLocaleString()}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1"
                    onClick={() => handleMoveToCart(product.id, items.find(i => i.product_id === product.id)?.id || '')}
                    icon={<ShoppingCart className="h-4 w-4" />}
                    size="sm"
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => removeItem(product.id)}
                    icon={<Trash2 className="h-4 w-4" />}
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default WishlistPage;

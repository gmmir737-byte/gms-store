import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { WishlistContextType, WishlistItem, Product } from '../types/database';

const WishlistContext = createContext<WishlistContextType | null>(null);

const LOCAL_WISHLIST_KEY = 'gms_local_wishlist';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);

    if (!user) {
      const localWishlist = localStorage.getItem(LOCAL_WISHLIST_KEY);
      if (localWishlist) {
        const productIds: string[] = JSON.parse(localWishlist);
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .in('id', productIds)
            .eq('status', 'active');

          if (products) {
            const mappedItems: WishlistItem[] = products.map(product => ({
              id: `local-${product.id}`,
              user_id: 'local',
              product_id: product.id,
              created_at: new Date().toISOString(),
              product: product as Product,
            }));
            setItems(mappedItems);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('wishlists')
      .select('*, product:products(*, category:categories(*))')
      .eq('user_id', user.id);

    if (!error && data) {
      setItems(data as WishlistItem[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addItem = useCallback(async (productId: string) => {
    if (!user) {
      const localWishlist = localStorage.getItem(LOCAL_WISHLIST_KEY);
      let productIds: string[] = localWishlist ? JSON.parse(localWishlist) : [];

      if (!productIds.includes(productId)) {
        productIds.push(productId);
        localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(productIds));
        await fetchWishlist();
      }
      return;
    }

    const existing = items.find(i => i.product_id === productId);
    if (existing) return;

    await supabase.from('wishlists').insert({
      user_id: user.id,
      product_id: productId,
    });
    await fetchWishlist();
  }, [user, items, fetchWishlist]);

  const removeItem = useCallback(async (productId: string) => {
    if (!user) {
      const localWishlist = localStorage.getItem(LOCAL_WISHLIST_KEY);
      let productIds: string[] = localWishlist ? JSON.parse(localWishlist) : [];
      productIds = productIds.filter(id => id !== productId);
      localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(productIds));
      setItems(items.filter(i => i.product_id !== productId));
      return;
    }

    await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);
    await fetchWishlist();
  }, [user, items, fetchWishlist]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(i => i.product_id === productId);
  }, [items]);

  const itemCount = useMemo(() => items.length, [items]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        addItem,
        removeItem,
        isInWishlist,
        itemCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

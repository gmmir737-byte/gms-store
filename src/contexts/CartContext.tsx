import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { CartContextType, CartItem, Product } from '../types/database';

const CartContext = createContext<CartContextType | null>(null);

const LOCAL_CART_KEY = 'gms_local_cart';

interface LocalCartItem {
  product_id: string;
  quantity: number;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      const localCart = localStorage.getItem(LOCAL_CART_KEY);
      if (localCart) {
        const localItems: LocalCartItem[] = JSON.parse(localCart);
        if (localItems.length > 0) {
          setLoading(true);
          const { data: products } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .in('id', localItems.map(i => i.product_id))
            .eq('status', 'active');

          if (products) {
            const productMap = new Map((products as Product[]).map((product) => [product.id, product] as const));
            const mappedItems: CartItem[] = localItems
              .map(localItem => {
                const product = productMap.get(localItem.product_id);
                return product
                  ? {
                      id: `local-${localItem.product_id}`,
                      user_id: 'local',
                      product_id: localItem.product_id,
                      quantity: localItem.quantity,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      product,
                    }
                  : null;
              })
              .filter((item): item is CartItem => item !== null);
            setItems(mappedItems);
          }
        } else {
          setItems([]);
        }
        setLoading(false);
        setSynced(false);
        return;
      }
      setItems([]);
      setLoading(false);
      setSynced(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*, category:categories(*))')
      .eq('user_id', user.id);

    if (!error && data) {
      setItems(data as CartItem[]);
      setSynced(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const saveLocalCart = useCallback((localItems: LocalCartItem[]) => {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localItems));
  }, []);

  const addItem = useCallback(async (productId: string, quantity: number = 1) => {
    if (!user) {
      const localCart = localStorage.getItem(LOCAL_CART_KEY);
      let localItems: LocalCartItem[] = localCart ? JSON.parse(localCart) : [];
      const existing = localItems.find(i => i.product_id === productId);

      if (existing) {
        localItems = localItems.map(i =>
          i.product_id === productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        localItems.push({ product_id: productId, quantity });
      }

      saveLocalCart(localItems);
      await fetchCart();
      return { error: null };
    }

    const existing = items.find(i => i.product_id === productId);

    try {
      const quantityToSave = (existing?.quantity ?? 0) + quantity;
      const { error } = await supabase.from('cart_items').upsert(
        {
          user_id: user.id,
          product_id: productId,
          quantity: quantityToSave,
        },
        { onConflict: ['user_id', 'product_id'] }
      );
      if (error) return { error: error.message };
    } catch (err) {
      console.error('Add to cart error:', err);
      return { error: err instanceof Error ? err.message : String(err) };
    }

    await fetchCart();
    return { error: null };
  }, [user, items, fetchCart, saveLocalCart]);

  const removeItem = useCallback(async (itemId: string) => {
    if (itemId.startsWith('local-')) {
      const productId = itemId.replace('local-', '');
      const localCart = localStorage.getItem(LOCAL_CART_KEY);
      let localItems: LocalCartItem[] = localCart ? JSON.parse(localCart) : [];
      localItems = localItems.filter(i => i.product_id !== productId);
      saveLocalCart(localItems);
      await fetchCart();
      return;
    }

    await supabase.from('cart_items').delete().eq('id', itemId);
    await fetchCart();
  }, [fetchCart, saveLocalCart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId);
      return;
    }

    if (itemId.startsWith('local-')) {
      const productId = itemId.replace('local-', '');
      const localCart = localStorage.getItem(LOCAL_CART_KEY);
      let localItems: LocalCartItem[] = localCart ? JSON.parse(localCart) : [];
      localItems = localItems.map(i =>
        i.product_id === productId ? { ...i, quantity } : i
      );
      saveLocalCart(localItems);
      await fetchCart();
      return;
    }

    await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
    await fetchCart();
  }, [removeItem, fetchCart, saveLocalCart]);

  const clearCart = useCallback(async () => {
    if (!user) {
      localStorage.removeItem(LOCAL_CART_KEY);
      setItems([]);
      return;
    }

    await supabase.from('cart_items').delete().eq('user_id', user.id);
    await fetchCart();
  }, [user, fetchCart]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.product) return sum;
      const price = item.product.is_flash_sale && item.product.flash_sale_price
        ? item.product.flash_sale_price
        : item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        itemCount,
        synced,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { CartContextType, CartItem, Product } from '../types/database';

const CartContext = createContext<CartContextType | null>(null);

const LOCAL_CART_KEY = 'gms_local_cart';

interface LocalCartItem {
  product_id: string;
  quantity: number;
}

type CartItemWithProduct = CartItem & { product: Product };

function isLocalCartItem(item: unknown): item is LocalCartItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'product_id' in item &&
    'quantity' in item &&
    typeof (item as { product_id?: unknown }).product_id === 'string' &&
    typeof (item as { quantity?: unknown }).quantity === 'number'
  );
}

function parseLocalCart(raw: string | null): LocalCartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLocalCartItem);
  } catch (err) {
    console.error('Failed to parse local cart data:', err);
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getLocalCartItems = useCallback(() => {
    if (typeof window === 'undefined') return [] as LocalCartItem[];
    const localCart = localStorage.getItem(LOCAL_CART_KEY);
    return parseLocalCart(localCart);
  }, []);

  const saveLocalCart = useCallback((localItems: LocalCartItem[]) => {
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localItems));
    } catch (err) {
      console.error('Failed to save local cart:', err);
    }
  }, []);

  const clearLocalCart = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_CART_KEY);
    } catch (err) {
      console.error('Failed to clear local cart:', err);
    }
  }, []);

  interface ExistingCartQuantity {
    product_id: string;
    quantity: number | null;
  }

  const mergeLocalCartToServer = useCallback(async () => {
    if (!user) return;

    const localItems = getLocalCartItems();
    if (localItems.length === 0) return;

    try {
      const { data: existingItems, error: fetchError } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', user.id)
        .in('product_id', localItems.map((item) => item.product_id));

      if (fetchError) {
        console.error('Failed to fetch existing cart items for merge:', fetchError);
        return;
      }

      const quantityMap = new Map<string, number>();
      if (existingItems) {
        (existingItems as ExistingCartQuantity[]).forEach((item) => {
          if (item.product_id) {
            quantityMap.set(item.product_id, item.quantity ?? 0);
          }
        });
      }

      const upserts = localItems.map((localItem) => ({
        user_id: user.id,
        product_id: localItem.product_id,
        quantity: (quantityMap.get(localItem.product_id) ?? 0) + localItem.quantity,
      }));

      if (upserts.length > 0) {
        const { error: mergeError } = await supabase.from('cart_items').upsert(upserts, {
          onConflict: 'user_id,product_id',
        });

        if (mergeError) {
          console.error('Failed to merge local cart into server cart:', mergeError);
          return;
        }
      }

      clearLocalCart();
    } catch (err) {
      console.error('Local cart merge error:', err);
    }
  }, [clearLocalCart, getLocalCartItems, user]);

  const fetchCart = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);

    try {
      if (!user) {
        const localItems = getLocalCartItems();

        if (localItems.length > 0) {
          const { data: products, error } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .in('id', localItems.map(i => i.product_id))
            .eq('status', 'active');

          if (error) {
            console.error('Failed to load local cart products:', error);
            if (isMountedRef.current) {
              setItems([]);
              setSynced(false);
              setLoading(false);
            }
            return;
          }

          if (products) {
            const productMap = new Map((products as Product[]).map((product) => [product.id, product] as const));
            const mappedItems = localItems
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
              .filter((item): item is CartItemWithProduct => item !== null);

            if (isMountedRef.current) {
              setItems(mappedItems);
              setSynced(false);
              setLoading(false);
            }
            return;
          }

          if (isMountedRef.current) {
            setItems([]);
            setSynced(false);
            setLoading(false);
          }
          return;
        }

        if (isMountedRef.current) {
          setItems([]);
          setSynced(false);
          setLoading(false);
        }
        return;
      }

      await mergeLocalCartToServer();

      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*, category:categories(*))')
        .eq('user_id', user.id);

      if (isMountedRef.current) {
        if (!error && data) {
          const validItems = (data as CartItem[]).filter((item) => item.product);
          const staleItemIds = (data as CartItem[])
            .filter((item) => !item.product)
            .map((item) => item.id);

          if (staleItemIds.length > 0) {
            supabase.from('cart_items').delete().in('id', staleItemIds).then(({ error: staleError }: { error: unknown }) => {
              if (staleError) {
                console.error('Failed to remove stale cart items:', staleError);
              }
            });
          }

          setItems(validItems);
          setSynced(true);
        } else if (error) {
          console.error('Failed to fetch cart items:', error);
          setSynced(false);
          setItems([]);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Fetch cart error:', err);
      if (isMountedRef.current) {
        setLoading(false);
        setSynced(false);
      }
    }
  }, [user, getLocalCartItems, mergeLocalCartToServer]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(async (productId: string, quantity: number = 1) => {
    if (!user) {
      let localItems = getLocalCartItems();

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

    try {
      let quantityToSave = quantity;
      const { data: existingItem, error: existingError } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existingError) {
        console.error('Failed to load existing cart item quantity:', existingError);
      } else if (existingItem) {
        quantityToSave = (existingItem.quantity ?? 0) + quantity;
      }

      const { error } = await supabase.from('cart_items').upsert(
        {
          user_id: user.id,
          product_id: productId,
          quantity: quantityToSave,
        },
        { onConflict: 'user_id,product_id' }
      );
      if (error) return { error: error.message };
    } catch (err) {
      console.error('Add to cart error:', err);
      return { error: err instanceof Error ? err.message : String(err) };
    }

    await fetchCart();
    return { error: null };
  }, [user, fetchCart, saveLocalCart, getLocalCartItems]);

  const removeItem = useCallback(async (itemId: string) => {
    if (itemId.startsWith('local-')) {
      const productId = itemId.replace('local-', '');
      const localItems = getLocalCartItems();
      const updatedItems = localItems.filter(i => i.product_id !== productId);
      saveLocalCart(updatedItems);
    }

    await supabase.from('cart_items').delete().eq('id', itemId);
    await fetchCart();
  }, [fetchCart, saveLocalCart, getLocalCartItems]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId);
      return;
    }

    if (itemId.startsWith('local-')) {
      const productId = itemId.replace('local-', '');
      const localItems = getLocalCartItems();
      const updatedItems = localItems.map(i =>
        i.product_id === productId ? { ...i, quantity } : i
      );
      saveLocalCart(updatedItems);
      await fetchCart();
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) {
      console.error('Failed to update cart item quantity:', error);
    }
    await fetchCart();
  }, [removeItem, fetchCart, saveLocalCart, getLocalCartItems]);

  const clearCart = useCallback(async () => {
    if (!user) {
      localStorage.removeItem(LOCAL_CART_KEY);
      setItems([]);
      setSynced(false);
      return;
    }

    const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
    if (error) {
      console.error('Failed to clear user cart:', error);
    }
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

/* eslint-disable-next-line react-refresh/only-export-components */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

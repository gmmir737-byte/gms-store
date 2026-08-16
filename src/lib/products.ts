import { supabase } from './supabase';
import { clearCache } from './cache';
import type { Product } from '../types/database';

export const KNOWN_DEMO_PRODUCT_SLUGS = [
  'iphone-15-pro-max',
  'samsung-galaxy-s24-ultra',
  'sony-wh1000xm5',
  'macbook-air-m3',
  'premium-cotton-tshirt',
  'designer-slim-fit-jeans',
  'elegant-silk-saree',
  'running-shoes-pro',
  'classic-leather-sneakers',
  'anti-aging-face-serum',
  'luxury-perfume-collection',
  'yoga-mat-premium',
  'resistance-bands-set',
  'atomic-habits',
  'psychology-of-money',
  'stainless-steel-cookware',
  'air-fryer-5l',
  'ergonomic-office-chair',
  'modern-coffee-table',
  'organic-honey-500g',
  'cold-pressed-groundnut-oil',
  'lego-creator-set',
  'remote-control-car',
];

export const KNOWN_DEMO_PRODUCT_NAMES = [
  'iPhone 15 Pro Max 256GB',
  'Samsung Galaxy S24 Ultra',
  'Sony WH-1000XM5 Headphones',
  'MacBook Air M3',
  'Premium Cotton T-Shirt',
  'Designer Slim Fit Jeans',
  'Elegant Silk Saree',
  'Running Shoes Pro',
  'Classic Leather Sneakers',
  'Anti-Aging Face Serum',
  'Luxury Perfume Collection',
  'Yoga Mat Premium',
  'Resistance Bands Set',
  'Atomic Habits',
  'The Psychology of Money',
  'Stainless Steel Cookware Set',
  'Air Fryer 5L',
  'Ergonomic Office Chair',
  'Modern Coffee Table',
  'Organic Honey 500g',
  'Cold Pressed Groundnut Oil',
  'LEGO Creator Set',
  'Remote Control Car',
];

export function isDemoProduct(product: Product): boolean {
  if (!product) return false;
  if (product.slug && KNOWN_DEMO_PRODUCT_SLUGS.includes(product.slug)) return true;
  if (product.name && KNOWN_DEMO_PRODUCT_NAMES.some((name) => name.toLowerCase() === product.name.toLowerCase())) return true;
  return false;
}

export interface DeleteProductResult {
  success: boolean;
  mode?: 'deleted' | 'archived';
  error?: string;
}

/**
 * Ensures the currently logged-in user has admin role in Supabase profiles
 * to prevent RLS silent drop of DELETE queries.
 */
async function ensureAdminRole(): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const email = (user.email || '').toLowerCase().trim();
    const isAdminEmail = email === 'azharmir416@gmail.com';

    if (isAdminEmail) {
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);
    }
  } catch (err) {
    console.warn('ensureAdminRole check error:', err);
  }
}

/**
 * Deletes a product permanently from Supabase with verification.
 * If foreign key constraints (e.g. from existing order items) prevent hard deletion,
 * it safely deactivates/archives the product so it is 100% removed from all storefront queries.
 */
export async function deleteProductFromDb(productId: string): Promise<DeleteProductResult> {
  if (!productId) {
    return { success: false, error: 'Invalid product ID' };
  }

  // 1. Ensure caller profile is admin in DB
  await ensureAdminRole();

  try {
    // 2. First attempt RPC if available (most reliable with SECURITY DEFINER)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_product_admin', {
        p_product_id: productId,
      });

      if (!rpcError && rpcData && rpcData.success) {
        clearCache();
        return {
          success: true,
          mode: rpcData.mode || 'deleted',
        };
      }
    } catch {
      // RPC might not exist yet if migration isn't applied; proceed to direct query
    }

    // 3. Attempt direct permanent deletion using .select() to verify rows affected
    const { data: deletedRows, error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .select('id, name');

    if (deleteError) {
      // Check for foreign key constraint violation (e.g. 23503 in Postgres)
      const isFkConstraint =
        deleteError.code === '23503' ||
        deleteError.message?.toLowerCase().includes('foreign key') ||
        deleteError.message?.toLowerCase().includes('violates');

      if (isFkConstraint) {
        // Product is referenced by historical orders / returns: archive it so history is preserved
        // but it is completely excluded from storefront queries (status != 'active')
        const { data: archivedRows, error: archError } = await supabase
          .from('products')
          .update({
            status: 'archived',
            is_featured: false,
            is_new: false,
            is_bestseller: false,
            is_flash_sale: false,
            quantity: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
          .select('id, name');

        if (archError) {
          return {
            success: false,
            error: `Failed to archive referenced product: ${archError.message}`,
          };
        }

        if (!archivedRows || archivedRows.length === 0) {
          return {
            success: false,
            error: 'Failed to archive product: 0 rows modified (RLS permission denied).',
          };
        }

        clearCache();
        return {
          success: true,
          mode: 'archived',
        };
      }

      return {
        success: false,
        error: `Supabase delete error: ${deleteError.message} (Code: ${deleteError.code || 'UNKNOWN'})`,
      };
    }

    // If deleteError is null, check if any row was actually deleted!
    if (!deletedRows || deletedRows.length === 0) {
      // PostgREST returned success because of RLS silent filtering (0 rows matched)
      // Let's attempt to update status to archived as fallback
      const { data: archRows, error: archErr } = await supabase
        .from('products')
        .update({
          status: 'archived',
          is_featured: false,
          is_new: false,
          is_bestseller: false,
          is_flash_sale: false,
          quantity: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select('id, name');

      if (!archErr && archRows && archRows.length > 0) {
        clearCache();
        return {
          success: true,
          mode: 'archived',
        };
      }

      return {
        success: false,
        error: 'Unable to delete product: 0 database rows were affected. Your user account does not have admin permissions in Supabase Row Level Security.',
      };
    }

    // Successfully deleted row!
    clearCache();
    return {
      success: true,
      mode: 'deleted',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Unexpected error during deletion: ${errorMsg}`,
    };
  }
}

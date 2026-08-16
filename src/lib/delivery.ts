import { supabase } from './supabase';
import type { DeliveryArea } from '../types/database';

const LOCAL_DELIVERY_AREAS_KEY = 'koshur_custom_delivery_areas_v2';
const SCHEMA_TABLE_STATUS_KEY = 'koshur_delivery_areas_db_status';

// Default initial seed localities with District and Tehsil details
export const DEFAULT_DELIVERY_AREAS: DeliveryArea[] = [
  {
    id: 'seed-lal-chowk',
    area_name: 'Lal Chowk',
    tehsil: 'South Srinagar',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190001',
    is_active: true,
    delivery_charge: 40,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery (2-4 hrs)',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-dalgate',
    area_name: 'Dalgate',
    tehsil: 'Khanyar',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190001',
    is_active: true,
    delivery_charge: 50,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-karan-nagar',
    area_name: 'Karan Nagar',
    tehsil: 'Central Shalteng',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190010',
    is_active: true,
    delivery_charge: 40,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-hazratbal',
    area_name: 'Hazratbal',
    tehsil: 'North Srinagar',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190006',
    is_active: true,
    delivery_charge: 60,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Next Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-rajbagh',
    area_name: 'Rajbagh',
    tehsil: 'South Srinagar',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190008',
    is_active: false,
    delivery_charge: 50,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Temporarily Unavailable',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-bemina',
    area_name: 'Bemina',
    tehsil: 'Central Shalteng',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190018',
    is_active: false,
    delivery_charge: 50,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Temporarily Unavailable',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-batmaloo',
    area_name: 'Batmaloo',
    tehsil: 'Central Shalteng',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190009',
    is_active: true,
    delivery_charge: 45,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-sanat-nagar',
    area_name: 'Sanat Nagar',
    tehsil: 'Chanapora',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190005',
    is_active: true,
    delivery_charge: 50,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-soura',
    area_name: 'Soura',
    tehsil: 'Eidgah',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190011',
    is_active: true,
    delivery_charge: 60,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Next Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-hyderpora',
    area_name: 'Hyderpora',
    tehsil: 'Budgam',
    district: 'Budgam',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190014',
    is_active: true,
    delivery_charge: 50,
    minimum_order_amount: 0,
    estimated_delivery_time: 'Same Day Delivery',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-anantnag-town',
    area_name: 'Anantnag Town',
    tehsil: 'Anantnag',
    district: 'Anantnag',
    city: 'Anantnag',
    state: 'Jammu and Kashmir',
    pincode: '192101',
    is_active: true,
    delivery_charge: 60,
    minimum_order_amount: 0,
    estimated_delivery_time: '1-2 Business Days',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'seed-baramulla-main',
    area_name: 'Baramulla Main',
    tehsil: 'Baramulla',
    district: 'Baramulla',
    city: 'Baramulla',
    state: 'Jammu and Kashmir',
    pincode: '193101',
    is_active: true,
    delivery_charge: 60,
    minimum_order_amount: 0,
    estimated_delivery_time: '1-2 Business Days',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
];

/**
 * Helper to get locally saved areas fallback
 */
export function getLocalDeliveryAreas(): DeliveryArea[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELIVERY_AREAS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DELIVERY_AREAS_KEY, JSON.stringify(DEFAULT_DELIVERY_AREAS));
      return DEFAULT_DELIVERY_AREAS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_DELIVERY_AREAS;
  } catch (err) {
    console.warn('Error reading local delivery areas:', err);
    return DEFAULT_DELIVERY_AREAS;
  }
}

/**
 * Helper to save local delivery areas
 */
export function saveLocalDeliveryAreas(areas: DeliveryArea[]) {
  try {
    localStorage.setItem(LOCAL_DELIVERY_AREAS_KEY, JSON.stringify(areas));
  } catch (err) {
    console.warn('Error saving local delivery areas:', err);
  }
}

/**
 * Checks whether an error is due to missing Supabase table in schema cache
 */
function isSchemaCacheOrTableMissingError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error as { message?: string }).message || '';
  return (
    msg.includes('schema cache') ||
    msg.includes('relation "public.delivery_areas" does not exist') ||
    msg.includes('delivery_areas') && msg.includes('does not exist') ||
    msg.includes('PGRST205') ||
    msg.includes('404')
  );
}

/**
 * Fetch all active delivery areas for customer address selection and store-wide availability check.
 */
export async function fetchActiveDeliveryAreas(): Promise<DeliveryArea[]> {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('is_active', true)
      .order('city', { ascending: true })
      .order('area_name', { ascending: true });

    if (error) {
      if (isSchemaCacheOrTableMissingError(error)) {
        localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'missing');
      }
      const local = getLocalDeliveryAreas().filter((a) => a.is_active);
      return local;
    }

    localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'connected');
    const dbAreas = (data as DeliveryArea[]) || [];
    if (dbAreas.length > 0) {
      // Sync local cache
      const allLocal = getLocalDeliveryAreas();
      const merged = [...dbAreas];
      // Keep any local-only areas if not present in DB
      allLocal.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id || (m.area_name.toLowerCase() === loc.area_name.toLowerCase() && m.city.toLowerCase() === loc.city.toLowerCase()))) {
          merged.push(loc);
        }
      });
      saveLocalDeliveryAreas(merged);
      return dbAreas;
    }

    return getLocalDeliveryAreas().filter((a) => a.is_active);
  } catch (err) {
    console.warn('Exception fetching active delivery areas, falling back to local store:', err);
    return getLocalDeliveryAreas().filter((a) => a.is_active);
  }
}

/**
 * Fetch all delivery areas (active & inactive) for Admin Management.
 */
export async function fetchAllDeliveryAreas(): Promise<DeliveryArea[]> {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*')
      .order('city', { ascending: true })
      .order('area_name', { ascending: true });

    if (error) {
      if (isSchemaCacheOrTableMissingError(error)) {
        localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'missing');
      }
      return getLocalDeliveryAreas();
    }

    localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'connected');
    const dbAreas = (data as DeliveryArea[]) || [];
    if (dbAreas.length > 0) {
      saveLocalDeliveryAreas(dbAreas);
      return dbAreas;
    }

    return getLocalDeliveryAreas();
  } catch (err) {
    console.warn('Exception fetching all delivery areas, using local store:', err);
    return getLocalDeliveryAreas();
  }
}

/**
 * Check if the Supabase table exists in schema cache
 */
export function getDeliveryAreaStorageStatus(): 'connected' | 'local_fallback' {
  const status = localStorage.getItem(SCHEMA_TABLE_STATUS_KEY);
  return status === 'missing' ? 'local_fallback' : 'connected';
}

/**
 * Check if a specific Area/Locality + District + Tehsil + City + State is active and serviceable.
 * Validates using Area/Locality + District + Tehsil + City + State (and optionally Pincode).
 */
export async function checkDeliveryServiceability(
  areaName: string,
  city?: string,
  state?: string,
  pincode?: string,
  district?: string,
  tehsil?: string
): Promise<{
  isAvailable: boolean;
  area: DeliveryArea | null;
  message: string;
}> {
  const trimmedArea = areaName?.trim();
  if (!trimmedArea) {
    return {
      isAvailable: false,
      area: null,
      message: 'Please select your delivery area to continue.',
    };
  }

  try {
    // 1. Try Supabase query first
    let query = supabase
      .from('delivery_areas')
      .select('*')
      .ilike('area_name', trimmedArea);

    if (tehsil?.trim()) {
      query = query.ilike('tehsil', tehsil.trim());
    }

    if (district?.trim()) {
      query = query.ilike('district', district.trim());
    }

    if (city?.trim()) {
      query = query.ilike('city', city.trim());
    }

    if (state?.trim()) {
      query = query.ilike('state', state.trim());
    }

    if (pincode?.trim()) {
      query = query.or(`pincode.is.null,pincode.eq.${pincode.trim()}`);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const matchedArea = data[0] as DeliveryArea;
      if (!matchedArea.is_active) {
        return {
          isAvailable: false,
          area: matchedArea,
          message: `Sorry, delivery to ${matchedArea.area_name} is currently inactive.`,
        };
      }
      return {
        isAvailable: true,
        area: matchedArea,
        message: '✓ Delivery available to your area',
      };
    }

    // If Supabase returned error or no match, check local cache fallback
    const localAreas = getLocalDeliveryAreas();
    const localMatch = localAreas.find((item) => {
      const nameMatch = item.area_name.toLowerCase().trim() === trimmedArea.toLowerCase();
      const cityMatch = !city?.trim() || item.city.toLowerCase().trim() === city.toLowerCase().trim();
      const distMatch = !district?.trim() || !item.district || item.district.toLowerCase().trim() === district.toLowerCase().trim();
      const tehsilMatch = !tehsil?.trim() || !item.tehsil || item.tehsil.toLowerCase().trim() === tehsil.toLowerCase().trim();
      return nameMatch && (cityMatch || distMatch || tehsilMatch);
    });

    if (localMatch) {
      if (!localMatch.is_active) {
        return {
          isAvailable: false,
          area: localMatch,
          message: `Sorry, delivery to ${localMatch.area_name} is currently inactive.`,
        };
      }
      return {
        isAvailable: true,
        area: localMatch,
        message: '✓ Delivery available to your area',
      };
    }

    return {
      isAvailable: false,
      area: null,
      message: `Sorry, we currently don't deliver to ${trimmedArea}.`,
    };
  } catch (err) {
    console.warn('Exception checking delivery serviceability:', err);
    const localAreas = getLocalDeliveryAreas();
    const localMatch = localAreas.find(
      (item) => item.area_name.toLowerCase().trim() === trimmedArea.toLowerCase()
    );

    if (localMatch && localMatch.is_active) {
      return {
        isAvailable: true,
        area: localMatch,
        message: '✓ Delivery available to your area',
      };
    }

    return {
      isAvailable: false,
      area: null,
      message: "Sorry, we couldn't verify delivery to this area.",
    };
  }
}

/**
 * Calculates the applicable delivery charge for an order given the selected area and order subtotal.
 */
export function calculateDeliveryFee(
  area: DeliveryArea | null,
  subtotal: number,
  settings: { free_shipping_amount: number; shipping_charge: number }
): {
  deliveryCharge: number;
  isFree: boolean;
  estimatedTime: string;
} {
  const freeThreshold = Number(settings.free_shipping_amount) || 0;
  const defaultCharge = Number(settings.shipping_charge) || 0;

  if (freeThreshold > 0 && subtotal >= freeThreshold) {
    return {
      deliveryCharge: 0,
      isFree: true,
      estimatedTime: area?.estimated_delivery_time || '1-2 Business Days',
    };
  }

  const areaCharge =
    area && typeof area.delivery_charge === 'number'
      ? Number(area.delivery_charge)
      : defaultCharge;

  return {
    deliveryCharge: areaCharge,
    isFree: areaCharge === 0,
    estimatedTime: area?.estimated_delivery_time || '1-2 Business Days',
  };
}

/**
 * Validates if the order subtotal satisfies the minimum order amount for the specified delivery area.
 */
export function validateAreaMinimumOrder(
  area: DeliveryArea | null,
  subtotal: number
): {
  isValid: boolean;
  minAmount: number;
  message?: string;
} {
  if (!area) {
    return { isValid: true, minAmount: 0 };
  }
  const minAmount = Number(area.minimum_order_amount) || 0;
  if (minAmount <= 0) {
    return { isValid: true, minAmount: 0 };
  }
  if (subtotal < minAmount) {
    return {
      isValid: false,
      minAmount,
      message: `Minimum order amount for ${area.area_name} is ₹${minAmount.toLocaleString('en-IN')}.`,
    };
  }
  return { isValid: true, minAmount };
}

/**
 * Admin Action: Create new delivery area
 */
export async function createDeliveryArea(
  data: Omit<DeliveryArea, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: DeliveryArea | null; error: string | null; isFallback?: boolean }> {
  const newId = 'area-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const newRecord: DeliveryArea = {
    id: newId,
    area_name: data.area_name.trim(),
    tehsil: data.tehsil?.trim() || null,
    district: data.district?.trim() || null,
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode?.trim() || null,
    is_active: data.is_active ?? true,
    delivery_charge: Number(data.delivery_charge) || 0,
    minimum_order_amount: Number(data.minimum_order_amount) || 0,
    estimated_delivery_time: data.estimated_delivery_time?.trim() || '1-2 Business Days',
    created_at: now,
    updated_at: now,
  };

  try {
    // Try inserting into Supabase
    const { data: inserted, error } = await supabase
      .from('delivery_areas')
      .insert([
        {
          area_name: newRecord.area_name,
          tehsil: newRecord.tehsil,
          district: newRecord.district,
          city: newRecord.city,
          state: newRecord.state,
          pincode: newRecord.pincode,
          is_active: newRecord.is_active,
          delivery_charge: newRecord.delivery_charge,
          minimum_order_amount: newRecord.minimum_order_amount,
          estimated_delivery_time: newRecord.estimated_delivery_time,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert failed, saving to resilient local store:', error.message);
      if (isSchemaCacheOrTableMissingError(error)) {
        localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'missing');
      }

      // Persist in local storage
      const current = getLocalDeliveryAreas();
      const updated = [newRecord, ...current];
      saveLocalDeliveryAreas(updated);

      return { data: newRecord, error: null, isFallback: true };
    }

    localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'connected');
    const created = inserted as DeliveryArea;
    const current = getLocalDeliveryAreas();
    saveLocalDeliveryAreas([created, ...current.filter((a) => a.id !== created.id)]);

    return { data: created, error: null, isFallback: false };
  } catch (err) {
    console.warn('Exception during createDeliveryArea, using local storage:', err);
    const current = getLocalDeliveryAreas();
    const updated = [newRecord, ...current];
    saveLocalDeliveryAreas(updated);

    return { data: newRecord, error: null, isFallback: true };
  }
}

/**
 * Admin Action: Update delivery area
 */
export async function updateDeliveryArea(
  id: string,
  data: Partial<DeliveryArea>
): Promise<{ data: DeliveryArea | null; error: string | null }> {
  const now = new Date().toISOString();

  // Always update local cache first
  const current = getLocalDeliveryAreas();
  let updatedArea: DeliveryArea | null = null;
  const updatedList = current.map((item) => {
    if (item.id === id) {
      updatedArea = {
        ...item,
        ...data,
        updated_at: now,
      };
      return updatedArea;
    }
    return item;
  });
  saveLocalDeliveryAreas(updatedList);

  try {
    const payload: Record<string, unknown> = {
      updated_at: now,
    };

    if (data.area_name !== undefined) payload.area_name = data.area_name.trim();
    if (data.tehsil !== undefined) payload.tehsil = data.tehsil ? data.tehsil.trim() : null;
    if (data.district !== undefined) payload.district = data.district ? data.district.trim() : null;
    if (data.city !== undefined) payload.city = data.city.trim();
    if (data.state !== undefined) payload.state = data.state.trim();
    if (data.pincode !== undefined) payload.pincode = data.pincode ? data.pincode.trim() : null;
    if (data.is_active !== undefined) payload.is_active = data.is_active;
    if (data.delivery_charge !== undefined) payload.delivery_charge = Number(data.delivery_charge) || 0;
    if (data.minimum_order_amount !== undefined) payload.minimum_order_amount = Number(data.minimum_order_amount) || 0;
    if (data.estimated_delivery_time !== undefined) payload.estimated_delivery_time = data.estimated_delivery_time?.trim() || null;

    const { data: updated, error } = await supabase
      .from('delivery_areas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isSchemaCacheOrTableMissingError(error)) {
        localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'missing');
      }
      return { data: updatedArea, error: null };
    }

    localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'connected');
    return { data: updated as DeliveryArea, error: null };
  } catch {
    return { data: updatedArea, error: null };
  }
}

/**
 * Admin Action: Toggle status (Active / Inactive)
 */
export async function toggleDeliveryAreaStatus(
  id: string,
  is_active: boolean
): Promise<{ error: string | null }> {
  // Update local cache
  const current = getLocalDeliveryAreas();
  const updatedList = current.map((item) =>
    item.id === id ? { ...item, is_active, updated_at: new Date().toISOString() } : item
  );
  saveLocalDeliveryAreas(updatedList);

  try {
    const { error } = await supabase
      .from('delivery_areas')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error && isSchemaCacheOrTableMissingError(error)) {
      localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'missing');
      return { error: null };
    }

    return { error: null };
  } catch {
    return { error: null };
  }
}

/**
 * Admin Action: Delete delivery area
 */
export async function deleteDeliveryArea(id: string): Promise<{ error: string | null }> {
  // Update local cache
  const current = getLocalDeliveryAreas();
  const updatedList = current.filter((item) => item.id !== id);
  saveLocalDeliveryAreas(updatedList);

  try {
    const { error } = await supabase
      .from('delivery_areas')
      .delete()
      .eq('id', id);

    if (error && isSchemaCacheOrTableMissingError(error)) {
      localStorage.setItem(SCHEMA_TABLE_STATUS_KEY, 'missing');
      return { error: null };
    }

    return { error: null };
  } catch {
    return { error: null };
  }
}

/**
 * SQL migration string ready to copy into Supabase SQL Editor
 */
export const DELIVERY_AREAS_SQL_MIGRATION = `-- Delivery Areas Table and Policies Migration
CREATE TABLE IF NOT EXISTS delivery_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name text NOT NULL,
  tehsil text,
  district text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text,
  is_active boolean DEFAULT true NOT NULL,
  delivery_charge decimal(10,2) DEFAULT 0.00 NOT NULL,
  minimum_order_amount decimal(10,2) DEFAULT 0.00 NOT NULL,
  estimated_delivery_time text DEFAULT '1-2 Business Days',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS tehsil text;
ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS tehsil text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS district text;

CREATE INDEX IF NOT EXISTS idx_delivery_areas_lookup 
ON delivery_areas (lower(area_name), lower(COALESCE(tehsil, '')), lower(COALESCE(district, '')), lower(city), lower(state));

CREATE INDEX IF NOT EXISTS idx_delivery_areas_active 
ON delivery_areas (is_active);

ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active delivery areas" ON delivery_areas;
CREATE POLICY "Public can view active delivery areas"
ON delivery_areas FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all delivery areas" ON delivery_areas;
CREATE POLICY "Admins can view all delivery areas"
ON delivery_areas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert delivery areas" ON delivery_areas;
CREATE POLICY "Admins can insert delivery areas"
ON delivery_areas FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update delivery areas" ON delivery_areas;
CREATE POLICY "Admins can update delivery areas"
ON delivery_areas FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete delivery areas" ON delivery_areas;
CREATE POLICY "Admins can delete delivery areas"
ON delivery_areas FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
`;

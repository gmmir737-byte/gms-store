-- Migration: Add Amazon-style extended product fields, variants, shipping, return, warranty & admin metadata
-- File: /supabase/migrations/20260709220000_012_extended_product_fields.sql

-- 1. Extend products table with structured Amazon-style fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS product_type TEXT,
  ADD COLUMN IF NOT EXISTS model_number TEXT,
  ADD COLUMN IF NOT EXISTS bullet_points TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS country_of_origin TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS generic_name TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_weight NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS package_dimensions JSONB DEFAULT '{"length": 0, "width": 0, "height": 0}',
  ADD COLUMN IF NOT EXISTS shipping_class TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS custom_shipping_charge NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_delivery_text TEXT,
  ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS return_window_days INT DEFAULT 7,
  ADD COLUMN IF NOT EXISTS return_conditions TEXT,
  ADD COLUMN IF NOT EXISTS is_replaceable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_period TEXT,
  ADD COLUMN IF NOT EXISTS warranty_type TEXT,
  ADD COLUMN IF NOT EXISTS warranty_description TEXT,
  ADD COLUMN IF NOT EXISTS search_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS supplier_info TEXT,
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';

-- 2. Index search keywords and model numbers for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model_number);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

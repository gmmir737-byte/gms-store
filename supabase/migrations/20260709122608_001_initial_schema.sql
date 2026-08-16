/*
# GM's Store - Initial E-commerce Schema

This migration creates the complete database schema for the GM's Store e-commerce platform.

## New Tables

1. **categories** - Product categories
   - id (uuid, primary key)
   - name (text, unique) - Category name
   - slug (text, unique) - URL-friendly identifier
   - description (text) - Category description
   - image_url (text) - Category image
   - parent_id (uuid) - For subcategories
   - created_at (timestamp)

2. **products** - Product catalog
   - id (uuid, primary key)
   - name (text) - Product name
   - slug (text, unique) - URL-friendly identifier
   - description (text) - Full product description
   - short_description (text) - Brief product summary
   - price (decimal) - Current selling price
   - compare_price (decimal) - Original/compare price
   - cost_price (decimal) - Cost for profit calculation
   - sku (text, unique) - Stock keeping unit
   - barcode (text) - Product barcode
   - quantity (integer) - Stock quantity
   - category_id (uuid, FK) - Category reference
   - brand (text) - Brand name
   - images (jsonb) - Array of image URLs
   - specifications (jsonb) - Product specs as key-value pairs
   - tags (text[]) - Searchable tags
   - weight (decimal) - Product weight
   - dimensions (jsonb) - Length, width, height
   - is_featured (boolean) - Show on homepage
   - is_new (boolean) - New arrival flag
   - is_bestseller (boolean) - Best seller flag
   - is_flash_sale (boolean) - Flash sale item
   - flash_sale_price (decimal) - Flash sale price
   - flash_sale_ends (timestamp) - Flash sale end time
   - rating_avg (decimal) - Average rating
   - rating_count (integer) - Total ratings
   - status (text) - active/draft/archived
   - created_at (timestamp)
   - updated_at (timestamp)

3. **profiles** - Extended user profiles
   - id (uuid, primary key, references auth.users)
   - email (text) - User email
   - full_name (text) - Full name
   - phone (text) - Phone number
   - avatar_url (text) - Profile picture
   - role (text) - customer/admin
   - created_at (timestamp)
   - updated_at (timestamp)

4. **addresses** - User shipping/billing addresses
   - id (uuid, primary key)
   - user_id (uuid, FK to profiles)
   - type (text) - shipping/billing
   - is_default (boolean) - Default address flag
   - full_name (text) - Recipient name
   - phone (text) - Contact phone
   - address_line1 (text) - Street address
   - address_line2 (text) - Apartment, suite, etc.
   - city (text) - City
   - state (text) - State/province
   - postal_code (text) - ZIP/postal code
   - country (text) - Country
   - created_at (timestamp)

5. **wishlists** - User wishlist items
   - id (uuid, primary key)
   - user_id (uuid, FK to profiles)
   - product_id (uuid, FK to products)
   - created_at (timestamp)

6. **cart_items** - Shopping cart
   - id (uuid, primary key)
   - user_id (uuid, FK to profiles)
   - product_id (uuid, FK to products)
   - quantity (integer) - Item quantity
   - created_at (timestamp)
   - updated_at (timestamp)

7. **coupons** - Discount coupons
   - id (uuid, primary key)
   - code (text, unique) - Coupon code
   - type (text) - percentage/fixed
   - value (decimal) - Discount value
   - min_order_amount (decimal) - Minimum order value
   - max_discount (decimal) - Maximum discount amount
   - usage_limit (integer) - Total usage limit
   - used_count (integer) - Times used
   - valid_from (timestamp) - Validity start
   - valid_until (timestamp) - Validity end
   - is_active (boolean) - Active status
   - created_at (timestamp)

8. **orders** - Customer orders
   - id (uuid, primary key)
   - order_number (text, unique) - Human-readable order ID
   - user_id (uuid, FK to profiles)
   - status (text) - pending/processing/shipped/delivered/cancelled
   - payment_status (text) - pending/paid/failed/refunded
   - payment_method (text) - cod/razorpay
   - payment_id (text) - Payment gateway transaction ID
   - subtotal (decimal) - Items subtotal
   - discount (decimal) - Discount amount
   - shipping_cost (decimal) - Shipping charges
   - tax (decimal) - Tax amount
   - total (decimal) - Final total
   - coupon_id (uuid, FK to coupons)
   - shipping_address (jsonb) - Shipping address snapshot
   - billing_address (jsonb) - Billing address snapshot
   - notes (text) - Order notes
   - created_at (timestamp)
   - updated_at (timestamp)

9. **order_items** - Order line items
   - id (uuid, primary key)
   - order_id (uuid, FK to orders)
   - product_id (uuid, FK to products)
   - product_name (text) - Product name at order time
   - product_image (text) - Product image at order time
   - quantity (integer) - Quantity ordered
   - price (decimal) - Unit price at order time
   - total (decimal) - Line total
   - created_at (timestamp)

10. **reviews** - Product reviews
    - id (uuid, primary key)
    - product_id (uuid, FK to products)
    - user_id (uuid, FK to profiles)
    - rating (integer) - 1-5 star rating
    - title (text) - Review title
    - comment (text) - Review content
    - is_verified_purchase (boolean) - Verified buyer flag
    - is_approved (boolean) - Moderation status
    - created_at (timestamp)
    - updated_at (timestamp)

## Security
- RLS enabled on all tables
- Owner-scoped policies for user data (profiles, addresses, wishlist, cart, orders)
- Public read for products, categories, reviews (anon + authenticated)
- Admin-only write access for products, categories, coupons
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  price decimal(10,2) NOT NULL,
  compare_price decimal(10,2),
  cost_price decimal(10,2),
  sku text UNIQUE,
  barcode text,
  quantity integer DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand text,
  images jsonb DEFAULT '[]',
  specifications jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  weight decimal(8,3),
  dimensions jsonb DEFAULT '{"length": 0, "width": 0, "height": 0}',
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_bestseller boolean DEFAULT false,
  is_flash_sale boolean DEFAULT false,
  flash_sale_price decimal(10,2),
  flash_sale_ends timestamptz,
  rating_avg decimal(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  is_default boolean DEFAULT false,
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'India',
  created_at timestamptz DEFAULT now()
);

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value decimal(10,2) NOT NULL,
  min_order_amount decimal(10,2) DEFAULT 0,
  max_discount decimal(10,2),
  usage_limit integer,
  used_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text CHECK (payment_method IN ('cod', 'razorpay')),
  payment_id text,
  subtotal decimal(10,2) NOT NULL,
  discount decimal(10,2) DEFAULT 0,
  shipping_cost decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  total decimal(10,2) NOT NULL,
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  shipping_address jsonb NOT NULL,
  billing_address jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, admin write)
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON categories;
CREATE POLICY "categories_admin_write" ON categories FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Products policies (public read, admin write)
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT
  TO anon, authenticated USING (status = 'active');

DROP POLICY IF EXISTS "products_admin_write" ON products;
CREATE POLICY "products_admin_write" ON products FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles policies (users manage own profile, admin has full access)
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Prevent non-admin users from changing the `role` column on their profile
-- This trigger raises an exception if a non-admin attempts to modify `role`.
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Role change not permitted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_profiles_role_change ON profiles;
CREATE TRIGGER prevent_profiles_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- Addresses policies (users manage own addresses)
DROP POLICY IF EXISTS "addresses_user_manage" ON addresses;
CREATE POLICY "addresses_user_manage" ON addresses FOR ALL
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Wishlists policies (users manage own wishlist)
DROP POLICY IF EXISTS "wishlist_user_select" ON wishlists;
CREATE POLICY "wishlist_user_select" ON wishlists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_user_insert" ON wishlists;
CREATE POLICY "wishlist_user_insert" ON wishlists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_user_delete" ON wishlists;
CREATE POLICY "wishlist_user_delete" ON wishlists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Cart items policies (users manage own cart)
DROP POLICY IF EXISTS "cart_user_manage" ON cart_items;
CREATE POLICY "cart_user_manage" ON cart_items FOR ALL
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Coupons policies (public read active coupons, admin full access)
DROP POLICY IF EXISTS "coupons_read_active" ON coupons;
CREATE POLICY "coupons_read_active" ON coupons FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "coupons_admin_manage" ON coupons;
CREATE POLICY "coupons_admin_manage" ON coupons FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Orders policies (users manage own orders)
DROP POLICY IF EXISTS "orders_user_select" ON orders;
CREATE POLICY "orders_user_select" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "orders_user_insert" ON orders;
CREATE POLICY "orders_user_insert" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Order items policies (users view own order items)
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Reviews policies (public read, users write own reviews)
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT
  TO anon, authenticated USING (is_approved = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_user_insert" ON reviews;
CREATE POLICY "reviews_user_insert" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_user_update" ON reviews;
CREATE POLICY "reviews_user_update" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_admin_moderate" ON reviews;
CREATE POLICY "reviews_admin_moderate" ON reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_bestseller ON products(is_bestseller) WHERE is_bestseller = true;
CREATE INDEX IF NOT EXISTS idx_products_new ON products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_flash_sale ON products(is_flash_sale) WHERE is_flash_sale = true;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  prefix text := 'GM';
  date_part text := to_char(now(), 'YYMMDD');
  seq_num text;
BEGIN
  seq_num := lpad(nextval('order_number_seq')::text, 5, '0');
  RETURN prefix || date_part || seq_num;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10000;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

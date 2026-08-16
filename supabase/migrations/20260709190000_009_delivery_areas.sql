-- Delivery Areas Table and Policies Migration
-- Adds area/locality-based delivery availability system with district and tehsil support

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

-- Ensure tehsil and district columns exist if table was already created
ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS tehsil text;
ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS district text;

-- Index for speedy lookups by locality, tehsil, district, city, and state
CREATE INDEX IF NOT EXISTS idx_delivery_areas_lookup 
ON delivery_areas (lower(area_name), lower(COALESCE(tehsil, '')), lower(COALESCE(district, '')), lower(city), lower(state));

CREATE INDEX IF NOT EXISTS idx_delivery_areas_active 
ON delivery_areas (is_active);

-- Add area, tehsil, and district columns to addresses table if not present
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS tehsil text;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS district text;

-- Enable RLS
ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (including anonymous and customers) can view active delivery areas
DROP POLICY IF EXISTS "Public can view active delivery areas" ON delivery_areas;
CREATE POLICY "Public can view active delivery areas"
ON delivery_areas FOR SELECT
USING (is_active = true);

-- 2. Admins can view all delivery areas (active and inactive)
DROP POLICY IF EXISTS "Admins can view all delivery areas" ON delivery_areas;
CREATE POLICY "Admins can view all delivery areas"
ON delivery_areas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. Admins can insert delivery areas
DROP POLICY IF EXISTS "Admins can insert delivery areas" ON delivery_areas;
CREATE POLICY "Admins can insert delivery areas"
ON delivery_areas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. Admins can update delivery areas
DROP POLICY IF EXISTS "Admins can update delivery areas" ON delivery_areas;
CREATE POLICY "Admins can update delivery areas"
ON delivery_areas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 5. Admins can delete delivery areas
DROP POLICY IF EXISTS "Admins can delete delivery areas" ON delivery_areas;
CREATE POLICY "Admins can delete delivery areas"
ON delivery_areas FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Seed initial delivery areas for immediate operational readiness
INSERT INTO delivery_areas (area_name, tehsil, district, city, state, pincode, is_active, delivery_charge, minimum_order_amount, estimated_delivery_time)
VALUES
  ('Lal Chowk', 'South Srinagar', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190001', true, 40.00, 0.00, 'Same Day Delivery'),
  ('Dalgate', 'Khanyar', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190001', true, 50.00, 0.00, 'Same Day Delivery'),
  ('Karan Nagar', 'Central Shalteng', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190010', true, 40.00, 0.00, 'Same Day Delivery'),
  ('Hazratbal', 'North Srinagar', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190006', true, 60.00, 0.00, 'Next Day Delivery'),
  ('Rajbagh', 'South Srinagar', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190008', false, 50.00, 0.00, 'Currently Unavailable'),
  ('Bemina', 'Central Shalteng', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190018', false, 50.00, 0.00, 'Currently Unavailable'),
  ('Batmaloo', 'Central Shalteng', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190009', true, 45.00, 0.00, 'Same Day Delivery'),
  ('Sanat Nagar', 'Chanapora', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190005', true, 50.00, 0.00, 'Same Day Delivery'),
  ('Soura', 'Eidgah', 'Srinagar', 'Srinagar', 'Jammu and Kashmir', '190011', true, 60.00, 0.00, 'Next Day Delivery'),
  ('Hyderpora', 'Budgam', 'Budgam', 'Srinagar', 'Jammu and Kashmir', '190014', true, 50.00, 0.00, 'Same Day Delivery'),
  ('Anantnag Town', 'Anantnag', 'Anantnag', 'Anantnag', 'Jammu and Kashmir', '192101', true, 60.00, 0.00, '1-2 Business Days'),
  ('Baramulla Main', 'Baramulla', 'Baramulla', 'Baramulla', 'Jammu and Kashmir', '193101', true, 60.00, 0.00, '1-2 Business Days')
ON CONFLICT DO NOTHING;

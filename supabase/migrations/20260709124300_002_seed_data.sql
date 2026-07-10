/*
# GM's Store - Sample Data Seed

This migration populates the database with sample data:
- 10 product categories
- 24 sample products
- 3 discount coupons
*/

-- Insert Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  (gen_random_uuid(), 'Electronics', 'electronics', 'Latest gadgets, smartphones, laptops, and electronics accessories', 1),
  (gen_random_uuid(), 'Fashion', 'fashion', 'Trendy clothing, accessories, and fashion items for all occasions', 2),
  (gen_random_uuid(), 'Shoes', 'shoes', 'Stylish footwear for men, women, and kids', 3),
  (gen_random_uuid(), 'Beauty', 'beauty', 'Skincare, makeup, and beauty products from top brands', 4),
  (gen_random_uuid(), 'Sports', 'sports', 'Sports equipment, fitness gear, and activewear', 5),
  (gen_random_uuid(), 'Books', 'books', 'Wide collection of books across all genres', 6),
  (gen_random_uuid(), 'Home & Kitchen', 'home-kitchen', 'Home appliances, kitchen essentials, and decor items', 7),
  (gen_random_uuid(), 'Furniture', 'furniture', 'Modern and classic furniture for home and office', 8),
  (gen_random_uuid(), 'Groceries', 'groceries', 'Fresh groceries, pantry essentials, and daily needs', 9),
  (gen_random_uuid(), 'Toys', 'toys', 'Toys, games, and fun items for kids of all ages', 10)
ON CONFLICT (slug) DO NOTHING;

-- Insert Coupons
INSERT INTO coupons (code, type, value, min_order_amount, max_discount, usage_limit, is_active) VALUES
  ('WELCOME10', 'percentage', 10, 500, 500, null, true),
  ('SAVE20', 'percentage', 20, 2000, 1000, 100, true),
  ('FLAT500', 'fixed', 500, 3000, null, 50, true)
ON CONFLICT (code) DO NOTHING;

-- Insert Products using a PL/pgSQL block
DO $$
DECLARE
  electronics_id uuid;
  fashion_id uuid;
  shoes_id uuid;
  beauty_id uuid;
  sports_id uuid;
  books_id uuid;
  home_kitchen_id uuid;
  furniture_id uuid;
  groceries_id uuid;
  toys_id uuid;
BEGIN
  SELECT id INTO electronics_id FROM categories WHERE slug = 'electronics';
  SELECT id INTO fashion_id FROM categories WHERE slug = 'fashion';
  SELECT id INTO shoes_id FROM categories WHERE slug = 'shoes';
  SELECT id INTO beauty_id FROM categories WHERE slug = 'beauty';
  SELECT id INTO sports_id FROM categories WHERE slug = 'sports';
  SELECT id INTO books_id FROM categories WHERE slug = 'books';
  SELECT id INTO home_kitchen_id FROM categories WHERE slug = 'home-kitchen';
  SELECT id INTO furniture_id FROM categories WHERE slug = 'furniture';
  SELECT id INTO groceries_id FROM categories WHERE slug = 'groceries';
  SELECT id INTO toys_id FROM categories WHERE slug = 'toys';

  -- Electronics Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('iPhone 15 Pro Max 256GB', 'iphone-15-pro-max', 'Experience the ultimate iPhone with titanium design, A17 Pro chip, and advanced camera system.', 'Premium iPhone with titanium design', 134900, 149900, 25, electronics_id, 'Apple', '["https://images.pexels.com/photos/54283/pexels-photo-54283.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Display": "6.7 inch Super Retina XDR", "Storage": "256GB", "Chip": "A17 Pro"}', '{iphone,apple,smartphone}', true, true, true, true, 124900, 'active'),
  ('Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Galaxy S24 Ultra with Galaxy AI, S Pen, and 200MP camera.', 'Samsung flagship with AI features', 119999, 134999, 30, electronics_id, 'Samsung', '["https://images.pexels.com/photos/609392/pexels-photo-609392.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Display": "6.8 inch Dynamic AMOLED", "Storage": "256GB", "Camera": "200MP"}', '{samsung,galaxy,android}', true, true, false, false, null, 'active'),
  ('Sony WH-1000XM5 Headphones', 'sony-wh1000xm5', 'Industry-leading noise cancellation with exceptional sound quality.', 'Premium wireless headphones', 24990, 29990, 100, electronics_id, 'Sony', '["https://images.pexels.com/photos/3394662/pexels-photo-3394662.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Driver": "30mm", "Battery": "30 hours", "Type": "Over-ear"}', '{sony,headphones,audio}', true, false, true, false, null, 'active'),
  ('MacBook Air M3', 'macbook-air-m3', 'The new MacBook Air with M3 chip. Featuring a 15 inch Liquid Retina display.', 'Powerful and lightweight laptop', 129900, 144900, 15, electronics_id, 'Apple', '["https://images.pexels.com/photos/1810522/pexels-photo-1810522.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Display": "15.3 inch Liquid Retina", "Chip": "Apple M3", "RAM": "8GB"}', '{macbook,apple,laptop}', false, true, true, false, null, 'active');

  -- Fashion Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Premium Cotton T-Shirt', 'premium-cotton-tshirt', 'Ultra-soft 100% organic cotton t-shirt. Perfect for everyday wear.', 'Classic organic cotton tee', 999, 1499, 200, fashion_id, 'GM Basics', '["https://images.pexels.com/photos/837352/pexels-photo-837352.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Material": "100% Cotton", "Fit": "Regular"}', '{tshirt,cotton,fashion}', true, false, false, false, null, 'active'),
  ('Designer Slim Fit Jeans', 'designer-slim-fit-jeans', 'Premium denim jeans with stretch comfort. Modern slim fit design.', 'Stylish slim-fit jeans', 1999, 2999, 150, fashion_id, 'GM Denim', '["https://images.pexels.com/photos/2385284/pexels-photo-2385284.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Material": "98% Cotton", "Fit": "Slim"}', '{jeans,denim,fashion}', true, false, false, true, 1499, 'active'),
  ('Elegant Silk Saree', 'elegant-silk-saree', 'Handwoven Banarasi silk saree with intricate zari work.', 'Traditional Banarasi silk saree', 8999, 12999, 50, fashion_id, 'GM Ethnic', '["https://images.pexels.com/photos/1096966/pexels-photo-1096966.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Fabric": "Pure Silk", "Work": "Zari Embroidered"}', '{saree,silk,ethnic}', false, true, false, false, null, 'active');

  -- Shoes Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Running Shoes Pro', 'running-shoes-pro', 'Lightweight running shoes with responsive cushioning.', 'Professional running shoes', 4999, 6999, 75, shoes_id, 'GM Sports', '["https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Upper": "Mesh", "Sole": "EVA Foam"}', '{running,shoes,sports}', true, false, true, false, null, 'active'),
  ('Classic Leather Sneakers', 'classic-leather-sneakers', 'Timeless leather sneakers with premium craftsmanship.', 'Premium leather sneakers', 3499, 4999, 120, shoes_id, 'GM Footwear', '["https://images.pexels.com/photos/2388665/pexels-photo-2388665.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Upper": "Leather", "Sole": "Rubber"}', '{sneakers,leather,casual}', false, false, false, false, null, 'active');

  -- Beauty Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Anti-Aging Face Serum', 'anti-aging-face-serum', 'Advanced retinol serum with hyaluronic acid.', 'Powerful anti-aging serum', 1299, 1999, 200, beauty_id, 'GM Beauty', '["https://images.pexels.com/photos/3641056/pexels-photo-3641056.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Key": "Retinol", "Size": "30ml"}', '{serum,skincare,beauty}', true, true, true, false, null, 'active'),
  ('Luxury Perfume Collection', 'luxury-perfume-collection', 'Exclusive 100ml Eau de Parfum with lasting fragrance.', 'Premium designer fragrance', 2999, 4999, 80, beauty_id, 'GM Fragrance', '["https://images.pexels.com/photos/932589/pexels-photo-932589.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Size": "100ml", "Type": "Eau de Parfum"}', '{perfume,fragrance,luxury}', true, false, false, true, 1999, 'active');

  -- Sports Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Yoga Mat Premium', 'yoga-mat-premium', 'Non-slip eco-friendly yoga mat with alignment markings.', 'Premium non-slip yoga mat', 799, 1299, 300, sports_id, 'GM Yoga', '["https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Material": "TPE", "Thickness": "6mm"}', '{yoga,mat,fitness}', false, false, false, false, null, 'active'),
  ('Resistance Bands Set', 'resistance-bands-set', 'Complete 5-band resistance band set for home workouts.', 'Full resistance band workout set', 599, 999, 500, sports_id, 'GM Fitness', '["https://images.pexels.com/photos/4162491/pexels-photo-4162491.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Bands": "5 pieces", "Resistance": "5-50 lbs"}', '{resistance,fitness,bands}', true, false, true, false, null, 'active');

  -- Books Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Atomic Habits', 'atomic-habits', 'Tiny changes, remarkable results. James Clear reveals how small habits lead to big transformations.', 'Bestselling self-help book', 449, 599, 500, books_id, 'James Clear', '["https://images.pexels.com/photos/4226256/pexels-photo-4226256.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Format": "Paperback", "Pages": "320"}', '{book,self-help,bestseller}', true, false, true, false, null, 'active'),
  ('The Psychology of Money', 'psychology-of-money', 'Timeless lessons on wealth, greed, and happiness.', 'Personal finance essentials', 349, 499, 400, books_id, 'Morgan Housel', '["https://images.pexels.com/photos/4226256/pexels-photo-4226256.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Format": "Paperback", "Pages": "256"}', '{book,finance,investing}', false, false, false, false, null, 'active');

  -- Home & Kitchen Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Stainless Steel Cookware Set', 'stainless-steel-cookware', 'Premium 10-piece stainless steel cookware set.', 'Professional quality cookware', 3999, 5999, 100, home_kitchen_id, 'GM Kitchen', '["https://images.pexels.com/photos/4228441/pexels-photo-4228441.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Material": "Stainless Steel", "Pieces": "10"}', '{cookware,kitchen}', true, false, false, false, null, 'active'),
  ('Air Fryer 5L', 'air-fryer-5l', 'Digital air fryer with rapid air circulation technology.', 'Digital air fryer', 2999, 4499, 150, home_kitchen_id, 'GM Appliances', '["https://images.pexels.com/photos/4228441/pexels-photo-4228441.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Capacity": "5 Liters", "Power": "1500W"}', '{air-fryer,kitchen,appliance}', true, true, true, true, 2499, 'active');

  -- Furniture Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Ergonomic Office Chair', 'ergonomic-office-chair', 'Premium ergonomic chair with lumbar support and adjustable armrests.', 'Professional ergonomic chair', 8999, 12999, 40, furniture_id, 'GM Furniture', '["https://images.pexels.com/photos/2087905/pexels-photo-2087905.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Material": "Mesh", "Capacity": "150kg"}', '{chair,office,ergonomic}', true, false, false, false, null, 'active'),
  ('Modern Coffee Table', 'modern-coffee-table', 'Sleek solid wood coffee table with metal legs.', 'Stylish coffee table', 3999, 5999, 60, furniture_id, 'GM Living', '["https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Material": "Sheesham Wood", "Finish": "Walnut"}', '{table,furniture,living-room}', false, true, false, false, null, 'active');

  -- Groceries Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('Organic Honey 500g', 'organic-honey-500g', 'Pure organic honey from the Himalayas.', 'Pure organic Himalayan honey', 349, 499, 1000, groceries_id, 'GM Natural', '["https://images.pexels.com/photos/41143/honey-pouring-golden-liquid-41143.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Weight": "500g", "Type": "Organic"}', '{honey,organic,groceries}', false, false, false, false, null, 'active'),
  ('Cold Pressed Groundnut Oil', 'cold-pressed-groundnut-oil', 'Traditional cold-pressed groundnut oil.', 'Traditional cold-pressed oil', 199, 299, 800, groceries_id, 'GM Foods', '["https://images.pexels.com/photos/4228441/pexels-photo-4228441.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Volume": "1 Liter", "Method": "Cold Pressed"}', '{oil,groceries,organic}', true, false, true, false, null, 'active');

  -- Toys Products
  INSERT INTO products (name, slug, description, short_description, price, compare_price, quantity, category_id, brand, images, specifications, tags, is_featured, is_new, is_bestseller, is_flash_sale, flash_sale_price, status) VALUES
  ('LEGO Creator Set', 'lego-creator-set', 'Creative building set with 3-in-1 possibilities.', 'Creative 3-in-1 LEGO set', 1999, 2499, 100, toys_id, 'LEGO', '["https://images.pexels.com/photos/3612622/pexels-photo-3612622.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Pieces": "500+", "Age": "8+"}', '{lego,toys,building}', true, true, true, false, null, 'active'),
  ('Remote Control Car', 'remote-control-car', 'High-speed RC car with 4WD and realistic design.', '4WD remote control racing car', 999, 1499, 150, toys_id, 'GM Toys', '["https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800"]', '{"Scale": "1:14", "Speed": "20 km/h"}', '{rc-car,toys,remote-control}', false, false, false, false, null, 'active');
END $$;

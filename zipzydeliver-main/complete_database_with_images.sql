-- Complete Zipzy Delivery App Database Setup with Custom 3D Product Images
-- This file contains the complete database structure, data, and custom image mappings

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed (for fresh setup)
-- DROP TABLE IF EXISTS order_deliveries, order_tracking, messages, conversations, order_items, orders, cart_items, products, categories, delivery_partners, sessions, users CASCADE;

-- Session storage table - required for Replit Auth
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- User storage table - required for Replit Auth  
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  college_id VARCHAR,
  student_id VARCHAR,
  department VARCHAR,
  hostel_address TEXT,
  phone VARCHAR,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6366F1',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  image_url VARCHAR,
  category_id UUID REFERENCES categories(id),
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  delivery_time INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  order_number VARCHAR UNIQUE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'placed',
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 20,
  delivery_address TEXT NOT NULL,
  phone VARCHAR NOT NULL,
  payment_method VARCHAR NOT NULL,
  payment_status VARCHAR DEFAULT 'pending',
  estimated_delivery_time INTEGER DEFAULT 30,
  notes TEXT,
  order_qr_code TEXT,
  payment_qr_code TEXT,
  zpoints_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Delivery partners table
CREATE TABLE IF NOT EXISTS delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR UNIQUE,
  phone VARCHAR NOT NULL,
  vehicle_type VARCHAR NOT NULL,
  vehicle_number VARCHAR,
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  current_location JSONB,
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  profile_image_url VARCHAR,
  zpoints_balance INTEGER DEFAULT 200,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order tracking table for status updates
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL,
  message TEXT,
  location JSONB,
  delivery_partner_id UUID REFERENCES delivery_partners(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table for inbox system
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL DEFAULT 'support',
  status VARCHAR DEFAULT 'active',
  title VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table (Order-based Inbox System)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sender_id VARCHAR,
  receiver_id VARCHAR,
  sender_type VARCHAR NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text',
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order delivery assignments
CREATE TABLE IF NOT EXISTS order_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES delivery_partners(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  status VARCHAR DEFAULT 'assigned',
  estimated_delivery_time INTEGER DEFAULT 30,
  actual_delivery_time INTEGER,
  delivery_notes TEXT,
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert Categories with Emojis and Colors
INSERT INTO categories (name, description, icon, color) VALUES
('Food', 'Delicious meals and snacks', '🍔', '#FF6B6B'),
('Beverages', 'Refreshing drinks and juices', '🥤', '#4ECDC4'),
('Groceries', 'Daily essentials and groceries', '🛒', '#45B7D1'),
('Stationery', 'School and office supplies', '📚', '#96CEB4'),
('Personal Care', 'Health and hygiene products', '🧴', '#FFEAA7'),
('Electronics', 'Tech accessories and gadgets', '📱', '#DDA0DD'),
('Snacks', 'Quick bites and munchies', '🍿', '#F39C12')
ON CONFLICT (name) DO NOTHING;

-- Insert Products with Custom 3D Images
-- FOOD PRODUCTS
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, and basil', 299.00, 349.00, '@assets/generated_images/Margherita_pizza_3D_c52eadee.png', (SELECT id FROM categories WHERE name = 'Food'), 4.5, 120, TRUE, 25),
('Chicken Biryani', 'Aromatic basmati rice with tender chicken and spices', 249.00, 279.00, '@assets/generated_images/Chicken_biryani_bowl_3D_441a1a37.png', (SELECT id FROM categories WHERE name = 'Food'), 4.7, 89, TRUE, 30),
('Masala Dosa', 'Crispy South Indian crepe with spiced potato filling', 129.00, 149.00, '@assets/generated_images/Masala_dosa_plate_3D_37f8cf83.png', (SELECT id FROM categories WHERE name = 'Food'), 4.3, 76, FALSE, 20),
('Vegetarian Burger', 'Delicious veggie patty with fresh vegetables', 189.00, 219.00, '@assets/generated_images/Vegetarian_burger_3D_79678194.png', (SELECT id FROM categories WHERE name = 'Food'), 4.2, 94, FALSE, 15),
('Paneer Butter Masala', 'Creamy paneer curry with rich tomato gravy', 199.00, 229.00, '@assets/generated_images/Paneer_butter_masala_3D_3198cabf.png', (SELECT id FROM categories WHERE name = 'Food'), 4.4, 156, TRUE, 25),
('Chicken Tikka', 'Grilled chicken pieces marinated in spices', 219.00, 249.00, '@assets/generated_images/Chicken_tikka_skewers_3D_8bbb3d4e.png', (SELECT id FROM categories WHERE name = 'Food'), 4.6, 98, FALSE, 20),
('Veg Fried Rice', 'Stir-fried rice with mixed vegetables and sauces', 149.00, 169.00, '@assets/generated_images/Veg_fried_rice_3D_623e1b00.png', (SELECT id FROM categories WHERE name = 'Food'), 4.1, 203, FALSE, 18),
('Chicken Wrap', 'Soft wrap filled with grilled chicken and vegetables', 159.00, 179.00, '@assets/generated_images/Chicken_wrap_halved_3D_ccdd72d7.png', (SELECT id FROM categories WHERE name = 'Food'), 4.3, 87, TRUE, 12),
('Fish Curry', 'Traditional fish curry with coconut milk', 229.00, 259.00, '@assets/generated_images/Chicken_biryani_bowl_3D_441a1a37.png', (SELECT id FROM categories WHERE name = 'Food'), 4.5, 124, FALSE, 30),
('Cheese Sandwich', 'Grilled sandwich with melted cheese', 89.00, 99.00, '@assets/generated_images/Vegetarian_burger_3D_79678194.png', (SELECT id FROM categories WHERE name = 'Food'), 4.0, 178, FALSE, 10)
ON CONFLICT DO NOTHING;

-- BEVERAGE PRODUCTS  
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Cold Coffee', 'Chilled coffee with milk and ice cream', 89.00, 99.00, '@assets/generated_images/Cold_coffee_glass_3D_6edc5772.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.1, 203, TRUE, 10),
('Fresh Orange Juice', 'Freshly squeezed orange juice', 79.00, 89.00, '@assets/generated_images/Orange_juice_glass_3D_506e022c.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.3, 145, FALSE, 8),
('Mango Smoothie', 'Creamy mango smoothie with yogurt', 99.00, 109.00, '@assets/generated_images/Mango_smoothie_glass_3D_74760f4e.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.4, 167, TRUE, 10),
('Chocolate Milkshake', 'Rich chocolate shake with whipped cream', 109.00, 119.00, '@assets/generated_images/Chocolate_milkshake_glass_3D_90dece7b.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.5, 234, TRUE, 12),
('Apple Juice', 'Pure apple juice without preservatives', 69.00, 79.00, '@assets/generated_images/Orange_juice_glass_3D_506e022c.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.2, 123, FALSE, 8),
('Green Tea', 'Healthy green tea with antioxidants', 45.00, 55.00, '@assets/generated_images/Cold_coffee_glass_3D_6edc5772.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.2, 89, FALSE, 5),
('Lemon Soda', 'Refreshing lemon flavored soda', 39.00, 49.00, '@assets/generated_images/Cold_coffee_glass_3D_6edc5772.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.0, 156, FALSE, 5),
('Cappuccino', 'Italian coffee with steamed milk foam', 85.00, 95.00, '@assets/generated_images/Cold_coffee_glass_3D_6edc5772.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.4, 198, FALSE, 8)
ON CONFLICT DO NOTHING;

-- GROCERY PRODUCTS
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Fresh Milk', 'Pure and fresh dairy milk - 1 liter', 65.00, 70.00, '@assets/generated_images/Fresh_milk_bottle_3D_1426faed.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.6, 145, FALSE, 15),
('Basmati Rice', 'Premium quality basmati rice - 1kg', 180.00, 200.00, '@assets/generated_images/Basmati_rice_bag_3D_16898cc6.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.4, 67, FALSE, 20),
('Fresh Eggs', 'Farm fresh eggs - 12 pieces', 84.00, 90.00, '@assets/generated_images/Fresh_eggs_carton_3D_4f97b5d1.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.5, 189, TRUE, 15),
('Cooking Oil', 'Refined cooking oil - 1 liter', 145.00, 160.00, '@assets/generated_images/Cooking_oil_bottle_3D_bde43972.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.2, 98, FALSE, 15),
('Wheat Bread', 'Fresh whole wheat bread loaf', 35.00, 40.00, '@assets/generated_images/Wheat_bread_loaf_3D_35d9d9fa.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.0, 234, FALSE, 10),
('Onions', 'Fresh red onions - 1kg', 45.00, 55.00, '@assets/generated_images/Red_onions_fresh_3D_2fc8e1f4.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.1, 198, TRUE, 15),
('Potatoes', 'Fresh potatoes - 1kg', 35.00, 45.00, '@assets/generated_images/Fresh_potatoes_brown_3D_9b7bc78b.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.2, 156, FALSE, 15),
('Sugar', 'Pure white crystal sugar - 1kg', 55.00, 65.00, '@assets/generated_images/Basmati_rice_bag_3D_16898cc6.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.3, 123, FALSE, 15)
ON CONFLICT DO NOTHING;

-- STATIONERY PRODUCTS
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Notebook Set', 'Set of 5 ruled notebooks for students', 125.00, 140.00, '@assets/generated_images/Notebook_set_stack_3D_504a6548.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.3, 156, FALSE, 15),
('Ballpoint Pens', 'Pack of 10 blue ballpoint pens', 45.00, 55.00, '@assets/generated_images/Ballpoint_pens_pack_3D_ab4ef8e3.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.1, 287, TRUE, 10),
('Highlighter Set', 'Set of 6 colored highlighters', 78.00, 85.00, '@assets/generated_images/Highlighter_set_colorful_3D_047f6011.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.2, 142, FALSE, 10),
('Geometry Box', 'Complete geometry set with compass and scale', 95.00, 110.00, '@assets/generated_images/Geometry_box_complete_3D_3451204c.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.4, 89, FALSE, 15),
('A4 Paper', 'Premium white A4 sheets - 500 pages', 299.00, 329.00, '@assets/generated_images/Notebook_set_stack_3D_504a6548.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.3, 123, TRUE, 20),
('Pencil Set', 'Set of 12 HB pencils with eraser', 65.00, 75.00, '@assets/generated_images/Ballpoint_pens_pack_3D_ab4ef8e3.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.2, 234, FALSE, 10)
ON CONFLICT DO NOTHING;

-- PERSONAL CARE PRODUCTS
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Shampoo Bottle', 'Herbal shampoo for all hair types - 200ml', 189.00, 220.00, '@assets/generated_images/Shampoo_bottle_purple_3D_42a5da47.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.3, 134, FALSE, 15),
('Soap Bar', 'Natural soap bar with moisturizing properties', 45.00, 55.00, '@assets/generated_images/Soap_bar_white_3D_535ac7e1.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.2, 267, TRUE, 10),
('Toothpaste Tube', 'Fluoride toothpaste for strong teeth - 100g', 89.00, 95.00, '@assets/generated_images/Toothpaste_tube_white_3D_9e095e9b.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.5, 198, TRUE, 10),
('Hand Sanitizer', 'Alcohol-based hand sanitizer - 500ml', 125.00, 140.00, '@assets/generated_images/Hand_sanitizer_pump_3D_bfb23cc2.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.4, 176, FALSE, 10),
('Face Wash', 'Gentle face wash for daily cleansing', 149.00, 169.00, '@assets/generated_images/Shampoo_bottle_purple_3D_42a5da47.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.2, 234, TRUE, 12),
('Body Lotion', 'Moisturizing body lotion - 200ml', 199.00, 229.00, '@assets/generated_images/Hand_sanitizer_pump_3D_bfb23cc2.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.4, 156, FALSE, 15)
ON CONFLICT DO NOTHING;

-- ELECTRONICS PRODUCTS
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Digital Thermometer', 'Digital fever thermometer with LCD display', 189.00, 220.00, '@assets/generated_images/Digital_thermometer_medical_3D_d4653a47.png', (SELECT id FROM categories WHERE name = 'Electronics'), 4.6, 98, FALSE, 20),
('Power Bank', 'Portable 10000mAh power bank', 999.00, 1199.00, '@assets/generated_images/Power_bank_black_3D_c180205c.png', (SELECT id FROM categories WHERE name = 'Electronics'), 4.4, 156, TRUE, 15),
('Phone Charger Cable', 'USB-C fast charging cable - 1m', 149.00, 179.00, '@assets/generated_images/Power_bank_black_3D_c180205c.png', (SELECT id FROM categories WHERE name = 'Electronics'), 4.2, 234, TRUE, 10),
('Bluetooth Earphones', 'Wireless Bluetooth earphones', 1299.00, 1499.00, '@assets/generated_images/Power_bank_black_3D_c180205c.png', (SELECT id FROM categories WHERE name = 'Electronics'), 4.3, 189, TRUE, 20),
('USB Flash Drive', '32GB high-speed USB 3.0 drive', 499.00, 599.00, '@assets/generated_images/Power_bank_black_3D_c180205c.png', (SELECT id FROM categories WHERE name = 'Electronics'), 4.5, 123, FALSE, 15)
ON CONFLICT DO NOTHING;

-- SNACKS PRODUCTS
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Potato Chips', 'Crispy salted potato chips - 50g pack', 25.00, 30.00, '@assets/generated_images/Potato_chips_bag_3D_769fb315.png', (SELECT id FROM categories WHERE name = 'Snacks'), 4.1, 234, TRUE, 8),
('Chocolate Bar', 'Milk chocolate bar - 40g', 35.00, 45.00, '@assets/generated_images/Potato_chips_bag_3D_769fb315.png', (SELECT id FROM categories WHERE name = 'Snacks'), 4.4, 198, TRUE, 5),
('Biscuit Pack', 'Cream biscuits pack - 100g', 45.00, 55.00, '@assets/generated_images/Potato_chips_bag_3D_769fb315.png', (SELECT id FROM categories WHERE name = 'Snacks'), 4.2, 167, FALSE, 8),
('Namkeen Mix', 'Spicy Indian snack mix - 200g', 65.00, 75.00, '@assets/generated_images/Potato_chips_bag_3D_769fb315.png', (SELECT id FROM categories WHERE name = 'Snacks'), 4.3, 145, TRUE, 10),
('Granola Bar', 'Healthy oats and nuts bar', 89.00, 99.00, '@assets/generated_images/Potato_chips_bag_3D_769fb315.png', (SELECT id FROM categories WHERE name = 'Snacks'), 4.5, 178, FALSE, 8),
('Ice Cream Cup', 'Vanilla ice cream cup - 100ml', 69.00, 79.00, '@assets/generated_images/Potato_chips_bag_3D_769fb315.png', (SELECT id FROM categories WHERE name = 'Snacks'), 4.4, 223, TRUE, 12)
ON CONFLICT DO NOTHING;

-- Insert sample delivery partners
INSERT INTO delivery_partners (name, email, phone, vehicle_type, vehicle_number, rating, total_deliveries, zpoints_balance) VALUES
('Rahul Kumar', 'rahul@zipzy.com', '+91-9876543210', 'bike', 'DL-01-AB-1234', 4.8, 156, 180),
('Priya Sharma', 'priya@zipzy.com', '+91-8765432109', 'scooter', 'HR-02-CD-5678', 4.6, 89, 220),
('Amit Singh', 'amit@zipzy.com', '+91-7654321098', 'bicycle', '', 4.7, 234, 195),
('Sneha Patel', 'sneha@zipzy.com', '+91-6543210987', 'bike', 'MH-03-EF-9012', 4.9, 298, 175),
('Rajesh Gupta', 'rajesh@zipzy.com', '+91-5432109876', 'scooter', 'UP-04-GH-3456', 4.5, 123, 210)
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ZPY' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number = generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Inbox System: Auto-close chats when order is delivered
CREATE OR REPLACE FUNCTION close_chat_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE conversations 
        SET status = 'closed', updated_at = NOW()
        WHERE id IN (
            SELECT conversation_id 
            FROM order_deliveries 
            WHERE order_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_close_chat_on_delivery ON orders;
CREATE TRIGGER trigger_close_chat_on_delivery
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION close_chat_on_delivery();
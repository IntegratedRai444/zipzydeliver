-- Zipzy Delivery App - Complete Database Setup
-- This file contains all tables, initial data, and inbox system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  delivery_time INTEGER DEFAULT 15, -- in minutes
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
  status VARCHAR NOT NULL DEFAULT 'placed', -- placed, accepted, preparing, out_for_delivery, delivered, cancelled
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 20,
  delivery_address TEXT NOT NULL,
  phone VARCHAR NOT NULL,
  payment_method VARCHAR NOT NULL, -- upi, card, net_banking, cod, zpoints
  payment_status VARCHAR DEFAULT 'pending', -- pending, paid, failed
  estimated_delivery_time INTEGER DEFAULT 30, -- in minutes
  notes TEXT,
  order_qr_code TEXT, -- QR code data for order tracking
  payment_qr_code TEXT, -- QR code data for payment
  zpoints_used INTEGER DEFAULT 0, -- ZPoints used by partner
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
  vehicle_type VARCHAR NOT NULL, -- bike, bicycle, scooter
  vehicle_number VARCHAR,
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  current_location JSONB, -- {lat, lng, address}
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  profile_image_url VARCHAR,
  zpoints_balance INTEGER DEFAULT 200, -- Partner wallet with 200 ZPoints
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order tracking table for status updates
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL,
  message TEXT,
  location JSONB, -- {lat, lng, address}
  delivery_partner_id UUID REFERENCES delivery_partners(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chatbot conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL DEFAULT 'support', -- support, order_help, general
  status VARCHAR DEFAULT 'active', -- active, closed
  title VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table (Inbox System)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE, -- For order-specific chat
  sender_id VARCHAR, -- userId or 'bot' or deliveryPartnerId
  receiver_id VARCHAR, -- userId or deliveryPartnerId
  sender_type VARCHAR NOT NULL, -- user, bot, delivery_partner
  content TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text', -- text, image, location, order_update
  metadata JSONB, -- additional data like order info, location, etc
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
  status VARCHAR DEFAULT 'assigned', -- assigned, picked_up, out_for_delivery, delivered
  estimated_delivery_time INTEGER DEFAULT 30,
  actual_delivery_time INTEGER,
  delivery_notes TEXT,
  conversation_id UUID REFERENCES conversations(id), -- chat between user and delivery partner
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample categories
INSERT INTO categories (name, description, icon, color) VALUES
('Food', 'Delicious meals and snacks', '🍔', '#FF6B6B'),
('Beverages', 'Refreshing drinks and juices', '🥤', '#4ECDC4'),
('Groceries', 'Daily essentials and groceries', '🛒', '#45B7D1'),
('Stationery', 'School and office supplies', '📚', '#96CEB4'),
('Personal Care', 'Health and hygiene products', '🧴', '#FFEAA7'),
('Electronics', 'Tech accessories and gadgets', '📱', '#DDA0DD'),
('Snacks', 'Quick bites and munchies', '🍿', '#F39C12')
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, is_popular, delivery_time) VALUES
('Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, and basil', 299.00, 349.00, '/client/src/assets/Margherita_pizza_icon_b22e0f47.png', (SELECT id FROM categories WHERE name = 'Food'), 4.5, 120, TRUE, 25),
('Chicken Biryani', 'Aromatic basmati rice with tender chicken and spices', 249.00, 279.00, '/client/src/assets/Chicken_biryani_dish_icon_1f76e2bc.png', (SELECT id FROM categories WHERE name = 'Food'), 4.7, 89, TRUE, 30),
('Masala Dosa', 'Crispy South Indian crepe with spiced potato filling', 129.00, 149.00, '/client/src/assets/Masala_dosa_food_icon_a8a27e73.png', (SELECT id FROM categories WHERE name = 'Food'), 4.3, 76, FALSE, 20),
('Vegetarian Burger', 'Delicious veggie patty with fresh vegetables', 189.00, 219.00, '/client/src/assets/Vegetarian_burger_icon_80f630fb.png', (SELECT id FROM categories WHERE name = 'Food'), 4.2, 94, FALSE, 15),
('Cold Coffee', 'Chilled coffee with milk and ice cream', 89.00, 99.00, '/client/src/assets/Cold_coffee_drink_icon_9debec89.png', (SELECT id FROM categories WHERE name = 'Beverages'), 4.1, 203, TRUE, 10),
('Fresh Milk', 'Pure and fresh dairy milk - 1 liter', 65.00, 70.00, '/client/src/assets/Fresh_milk_bottle_icon_8e2663d4.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.6, 145, FALSE, 15),
('Basmati Rice', 'Premium quality basmati rice - 1kg', 180.00, 200.00, '/client/src/assets/Basmati_rice_bag_icon_a8d8398c.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.4, 67, FALSE, 20),
('Fresh Eggs', 'Farm fresh eggs - 12 pieces', 84.00, 90.00, '/client/src/assets/Fresh_eggs_carton_icon_66cd4679.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.5, 189, TRUE, 15),
('Cooking Oil', 'Refined cooking oil - 1 liter', 145.00, 160.00, '/client/src/assets/Cooking_oil_bottle_icon_e819d1e3.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.2, 98, FALSE, 15),
('Wheat Bread', 'Fresh whole wheat bread loaf', 35.00, 40.00, '/client/src/assets/Wheat_bread_loaf_icon_be85eff9.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.0, 234, FALSE, 10),
('Notebook Set', 'Set of 5 ruled notebooks for students', 125.00, 140.00, '/client/src/assets/Notebook_set_icon_81886216.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.3, 156, FALSE, 15),
('Ballpoint Pens', 'Pack of 10 blue ballpoint pens', 45.00, 55.00, '/client/src/assets/Ballpoint_pens_icon_65c631ba.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.1, 287, TRUE, 10),
('Highlighter Set', 'Set of 6 colored highlighters', 78.00, 85.00, '/client/src/assets/Highlighter_set_icon_dece768c.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.2, 142, FALSE, 10),
('Geometry Box', 'Complete geometry set with compass and scale', 95.00, 110.00, '/client/src/assets/Geometry_box_icon_089f1370.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.4, 89, FALSE, 15),
('Sticky Notes', 'Colorful sticky notes for reminders', 32.00, 40.00, '/client/src/assets/Sticky_notes_icon_1861c2ca.png', (SELECT id FROM categories WHERE name = 'Stationery'), 4.0, 198, FALSE, 10),
('Shampoo Bottle', 'Herbal shampoo for all hair types - 200ml', 189.00, 220.00, '/client/src/assets/Shampoo_bottle_icon_7fe9fe54.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.3, 134, FALSE, 15),
('Soap Bar', 'Natural soap bar with moisturizing properties', 45.00, 55.00, '/client/src/assets/Soap_bar_icon_a83f2b7c.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.2, 267, TRUE, 10),
('Toothpaste Tube', 'Fluoride toothpaste for strong teeth - 100g', 89.00, 95.00, '/client/src/assets/Toothpaste_tube_icon_53366017.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.5, 198, TRUE, 10),
('Hand Sanitizer', 'Alcohol-based hand sanitizer - 500ml', 125.00, 140.00, '/client/src/assets/Hand_sanitizer_bottle_icon_cef38fee.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.4, 176, FALSE, 10),
('Antiseptic Liquid', 'Antiseptic liquid for cuts and wounds - 100ml', 78.00, 85.00, '/client/src/assets/Antiseptic_liquid_bottle_icon_0cd96992.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.1, 123, FALSE, 15),
('Band-aid Pack', 'Waterproof adhesive bandages - 20 pieces', 45.00, 55.00, '/client/src/assets/Band-aid_pack_icon_0716bc1e.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.3, 145, FALSE, 10),
('Medicine Tablets', 'Common pain relief tablets - 10 pieces', 25.00, 30.00, '/client/src/assets/Medicine_tablets_icon_c85c69ea.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.0, 89, FALSE, 10),
('Vitamin C Bottle', 'Vitamin C supplements - 30 tablets', 299.00, 350.00, '/client/src/assets/Vitamin_C_bottle_icon_f5613c39.png', (SELECT id FROM categories WHERE name = 'Personal Care'), 4.5, 67, FALSE, 15),
('Digital Thermometer', 'Digital fever thermometer with LCD display', 189.00, 220.00, '/client/src/assets/Digital_thermometer_icon_2b6e3022.png', (SELECT id FROM categories WHERE name = 'Electronics'), 4.6, 98, FALSE, 20),
('Laundry Detergent', 'Powerful laundry detergent powder - 1kg', 245.00, 280.00, '/client/src/assets/Laundry_detergent_box_icon_5ab376f5.png', (SELECT id FROM categories WHERE name = 'Groceries'), 4.4, 156, FALSE, 20)
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

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ZPY' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers
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

-- Function to auto-close chats when order is delivered
CREATE OR REPLACE FUNCTION close_chat_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Update conversation status to closed
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

-- Insert sample admin user (you can modify this)
INSERT INTO users (id, email, first_name, last_name, is_admin) VALUES
('admin-user-id', 'admin@zipzy.com', 'Admin', 'User', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Sample orders and conversations (for testing)
INSERT INTO orders (user_id, order_number, status, total_amount, delivery_address, phone, payment_method, payment_status) VALUES
('admin-user-id', 'ZPY202501270001', 'preparing', 348.00, 'Room 201, Hostel Block A, University Campus', '+91-9876543210', 'upi', 'paid'),
('admin-user-id', 'ZPY202501270002', 'delivered', 189.00, 'Room 305, Hostel Block B, University Campus', '+91-9876543210', 'cod', 'paid')
ON CONFLICT (order_number) DO NOTHING;

-- Sample conversations
INSERT INTO conversations (user_id, type, title, status) VALUES
('admin-user-id', 'order_help', 'Order ZPY202501270001 Chat', 'active'),
('admin-user-id', 'order_help', 'Order ZPY202501270002 Chat', 'closed')
ON CONFLICT DO NOTHING;

-- Sample messages
INSERT INTO messages (conversation_id, order_id, sender_id, receiver_id, sender_type, content, message_type) VALUES
((SELECT id FROM conversations WHERE title LIKE '%ZPY202501270001%' LIMIT 1), (SELECT id FROM orders WHERE order_number = 'ZPY202501270001'), 'admin-user-id', 'bot', 'user', 'Hi, I want to track my order', 'text'),
((SELECT id FROM conversations WHERE title LIKE '%ZPY202501270001%' LIMIT 1), (SELECT id FROM orders WHERE order_number = 'ZPY202501270001'), 'bot', 'admin-user-id', 'Your order ZPY202501270001 is currently being prepared. Estimated delivery time is 25 minutes.', 'text')
ON CONFLICT DO NOTHING;

-- QuickShop Database Seed Data

-- Insert sample users
INSERT INTO users (name, email, password, role, is_verified, created_at, updated_at) VALUES
('Admin User', 'admin@quickshop.echelonxventures.org', '$2b$10$8KtbFv4Uy0p2y7v1xqQ5QOp3s0p4Y5w4Y5w4Y5w4Y5w4Y5w4Y5w4Y', 'admin', 1, NOW(), NOW()),
('John Doe', 'john.doe@example.com', '$2b$10$8KtbFv4Uy0p2y7v1xqQ5QOp3s0p4Y5w4Y5w4Y5w4Y5w4Y5w4Y5w4Y', 'customer', 1, NOW(), NOW()),
('Jane Smith', 'jane.smith@example.com', '$2b$10$8KtbFv4Uy0p2y7v1xqQ5QOp3s0p4Y5w4Y5w4Y5w4Y5w4Y5w4Y5w4Y', 'customer', 1, NOW(), NOW()),
('Seller Bob', 'bob.seller@example.com', '$2b$10$8KtbFv4Uy0p2y7v1xqQ5QOp3s0p4Y5w4Y5w4Y5w4Y5w4Y5w4Y5w4Y', 'seller', 1, NOW(), NOW()),
('Support Agent', 'support.agent@example.com', '$2b$10$8KtbFv4Uy0p2y7v1xqQ5QOp3s0p4Y5w4Y5w4Y5w4Y5w4Y5w4Y5w4Y', 'support_agent', 1, NOW(), NOW());

-- Insert sample companies (for sellers)
INSERT INTO companies (name, email, phone, description, address_line_1, city, state, postal_code, country, status, created_at, updated_at) VALUES
('Tech Store Inc.', 'contact@techstore.com', '+1234567890', 'Technology products and gadgets', '123 Tech Street', 'San Francisco', 'CA', '94107', 'USA', 'approved', NOW(), NOW()),
('Fashion House', 'info@fashionhouse.com', '+1234567891', 'Fashion clothing and accessories', '456 Fashion Ave', 'New York', 'NY', '10001', 'USA', 'approved', NOW(), NOW());

-- Update seller users with company associations
UPDATE users SET company_id = 1 WHERE id = 4; -- Assign seller Bob to Tech Store

-- Insert sample addresses
INSERT INTO addresses (user_id, first_name, last_name, address_line_1, city, state, postal_code, country, phone, is_default) VALUES
(2, 'John', 'Doe', '789 Sample Street', 'Chicago', 'IL', '60601', 'USA', '+1234567890', 1),
(3, 'Jane', 'Smith', '101 Sample Avenue', 'Los Angeles', 'CA', '90001', 'USA', '+1234567891', 1);

-- Insert sample brands
INSERT INTO brands (name, slug, description, website, is_active) VALUES
('Apple', 'apple', 'Apple Inc. technology products', 'https://apple.com', 1),
('Nike', 'nike', 'Nike sportswear', 'https://nike.com', 1),
('Samsung', 'samsung', 'Samsung electronic devices', 'https://samsung.com', 1),
('Adidas', 'adidas', 'Adidas sportswear', 'https://adidas.com', 1),
('Sony', 'sony', 'Sony electronics and entertainment', 'https://sony.com', 1);

-- Insert sample products
INSERT INTO products (name, slug, description, short_description, price, sale_price, sku, category_id, brand_id, stock_quantity, seller_id, is_active, is_featured, created_by, `condition`) VALUES
('iPhone 14 Pro Max', 'iphone-14-pro-max', 'Latest iPhone 14 Pro Max with A16 Bionic chip', 'Latest iPhone with advanced features', 1099.99, 1049.99, 'IPH-001', 1, 1, 50, 4, 1, 1, 4, 'new'),
('AirPods Pro 2nd Gen', 'airpods-pro', 'Apple AirPods Pro with Active Noise Cancellation', 'Premium wireless earbuds', 249.99, 229.99, 'AIR-001', 1, 1, 100, 4, 1, 1, 4, 'new'),
('Nike Air Max 270', 'nike-air-max', 'Nike Air Max 270 running shoes', 'Comfortable running shoes', 149.99, NULL, 'NIK-001', 2, 2, 200, 4, 1, 0, 4, 'new'),
('Adidas Ultraboost 22', 'adidas-ultraboost', 'Adidas Ultraboost 22 running shoes', 'Premium running shoes', 189.99, 169.99, 'ADI-001', 2, 4, 150, 4, 1, 0, 4, 'new'),
('Samsung Galaxy S23 Ultra', 'galaxy-s23-ultra', 'Samsung Galaxy S23 Ultra flagship smartphone', 'Flagship Android phone', 1199.99, 1149.99, 'SAM-001', 1, 3, 30, 4, 1, 1, 4, 'new'),
('Sony WH-1000XM5', 'sony-wh1000xm5', 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', 'Premium noise cancelling headphones', 399.99, 379.99, 'SON-001', 1, 5, 80, 4, 1, 0, 4, 'new');

-- Insert product images
INSERT INTO product_images (product_id, image_url, alt_text, is_primary) VALUES
(1, 'https://via.placeholder.com/800x800/0000FF/808080?text=iPhone+14+Pro+Max', 'iPhone 14 Pro Max image', 1),
(2, 'https://via.placeholder.com/800x800/FF0000/FFFFFF?text=AirPods+Pro', 'Apple AirPods Pro image', 1),
(3, 'https://via.placeholder.com/800x800/00FF00/000000?text=Nike+Air+Max', 'Nike Air Max 270 image', 1),
(4, 'https://via.placeholder.com/800x800/FFFF00/000000?text=Adidas+Ultra', 'Adidas Ultraboost 22 image', 1),
(5, 'https://via.placeholder.com/800x800/FF00FF/FFFFFF?text=Galaxy+S23', 'Samsung Galaxy S23 Ultra image', 1),
(6, 'https://via.placeholder.com/800x800/00FFFF/000000?text=Sony+Headphones', 'Sony WH-1000XM5 image', 1);

-- Insert sample product specifications
INSERT INTO product_specifications (product_id, specification_name, specification_value, group_name) VALUES
(1, 'Screen Size', '6.7 inches', 'Display'),
(1, 'Processor', 'A16 Bionic', 'Hardware'),
(1, 'Storage', '256GB', 'Storage'),
(1, 'Camera', '48MP Triple Camera', 'Camera'),
(2, 'Battery Life', '6 hours', 'Audio'),
(2, 'Noise Cancellation', 'Active Noise Cancellation', 'Audio'),
(3, 'Material', 'Synthetic Leather Upper', 'Construction'),
(3, 'Color', 'Black', 'Appearance');

-- Insert sample shipping methods
INSERT INTO shipping_methods (name, description, type, cost, estimated_delivery_days, is_active, is_default) VALUES
('Standard Shipping', 'Standard delivery within 5-7 business days', 'flat_rate', 5.99, 7, 1, 1),
('Express Shipping', 'Express delivery within 2-3 business days', 'flat_rate', 12.99, 3, 1, 0),
('Free Shipping', 'Free shipping on orders over $50', 'free_shipping', 0.00, 10, 1, 0);

-- Insert sample coupons
INSERT INTO coupons (code, name, description, type, value, min_order_amount, usage_limit, expires_at, is_active, created_by) VALUES
('WELCOME10', 'Welcome 10% Off', '10% discount for new customers', 'percentage', 10.00, 0.00, 1000, DATE_ADD(NOW(), INTERVAL 6 MONTH), 1, 1),
('SAVE20', 'Save $20 Today', '$20 discount on your order', 'fixed_amount', 20.00, 50.00, 500, DATE_ADD(NOW(), INTERVAL 3 MONTH), 1, 1),
('FREESHIP', 'Free Shipping', 'Free shipping on your order', 'free_shipping', 0.00, 0.00, 1000, DATE_ADD(NOW(), INTERVAL 1 MONTH), 1, 1);

-- Insert sample user preferences
INSERT INTO user_preferences (user_id, language, currency, timezone) VALUES
(2, 'en', 'USD', 'America/Chicago'),
(3, 'en', 'USD', 'America/Los_Angeles');

-- Insert default system configurations
INSERT INTO system_config (config_key, config_value, config_type, description, category, is_public) VALUES
('site_name', 'QuickShop', 'string', 'Name of the site', 'site', TRUE),
('site_slogan', 'Your shopping destination', 'string', 'Site slogan', 'site', TRUE),
('site_description', 'Buy and sell anything online with QuickShop', 'string', 'Meta description for the site', 'seo', TRUE),
('site_keywords', 'shopping, ecommerce, online store, buy, sell', 'string', 'Meta keywords for the site', 'seo', TRUE),
('site_logo', '/assets/logo.png', 'string', 'URL to the site logo', 'site', TRUE),
('site_favicon', '/favicon.ico', 'string', 'URL to the site favicon', 'site', FALSE),
('site_currency', 'USD', 'string', 'Default currency for the site', 'payment', TRUE),
('site_timezone', 'UTC', 'string', 'Default timezone for the site', 'site', FALSE),
('site_language', 'en', 'string', 'Default language for the site', 'site', TRUE),
('contact_email', 'contact@quickshop.echelonxventures.org', 'string', 'Contact email for the site', 'contact', TRUE),
('support_email', 'support@quickshop.echelonxventures.org', 'string', 'Support email for the site', 'contact', TRUE),
('from_email', 'noreply@quickshop.echelonxventures.org', 'string', 'From email for site communications', 'email', FALSE),
('maintenance_mode', '0', 'boolean', 'Whether the site is in maintenance mode', 'site', TRUE),
('registration_enabled', '1', 'boolean', 'Whether user registration is enabled', 'user', TRUE),
('guest_checkout_enabled', '1', 'boolean', 'Whether guest checkout is enabled', 'checkout', TRUE),
('terms_and_conditions_url', '/pages/terms-and-conditions', 'string', 'URL to the terms and conditions page', 'site', TRUE),
('privacy_policy_url', '/pages/privacy-policy', 'string', 'URL to the privacy policy page', 'site', TRUE),
('return_policy_url', '/pages/return-policy', 'string', 'URL to the return policy page', 'site', TRUE),
('shipping_policy_url', '/pages/shipping-policy', 'string', 'URL to the shipping policy page', 'site', TRUE),
('tax_enabled', '1', 'boolean', 'Whether tax calculation is enabled', 'payment', FALSE),
('tax_rate', '8.5', 'number', 'Default tax rate percentage', 'payment', FALSE),
('tax_country', 'US', 'string', 'Country for tax calculation', 'payment', FALSE),
('tax_state', '', 'string', 'State for tax calculation', 'payment', FALSE),
('shipping_enabled', '1', 'boolean', 'Whether shipping calculation is enabled', 'shipping', TRUE),
('free_shipping_threshold', '50.00', 'number', 'Threshold for free shipping', 'shipping', TRUE),
('default_shipping_method', 'standard', 'string', 'Default shipping method', 'shipping', FALSE),
('order_confirmation_email', '1', 'boolean', 'Whether to send order confirmation email', 'email', FALSE),
('shipment_notification_email', '1', 'boolean', 'Whether to send shipment notification email', 'email', FALSE),
('newsletter_subscription_enabled', '1', 'boolean', 'Whether newsletter subscription is enabled', 'user', TRUE),
('affiliate_program_enabled', '1', 'boolean', 'Whether affiliate program is enabled', 'affiliate', TRUE),
('social_login_enabled', '1', 'boolean', 'Whether social login is enabled', 'authentication', TRUE),
('two_factor_auth_enabled', '0', 'boolean', 'Whether two-factor authentication is enabled', 'authentication', FALSE),
('email_verification_required', '1', 'boolean', 'Whether email verification is required', 'authentication', FALSE),
('password_minimum_length', '8', 'number', 'Minimum password length', 'authentication', FALSE),
('max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', 'authentication', FALSE),
('lockout_duration_minutes', '30', 'number', 'Duration of account lockout in minutes', 'authentication', FALSE);

-- Insert sample categories
INSERT INTO categories (name, slug, description, is_active, sort_order) VALUES
('Electronics', 'electronics', 'Electronic devices and accessories', 1, 1),
('Fashion', 'fashion', 'Clothing, shoes, and accessories', 1, 2),
('Home & Garden', 'home-garden', 'Furniture, home decor, and garden supplies', 1, 3),
('Books', 'books', 'Books, magazines, and educational materials', 1, 4),
('Sports & Outdoors', 'sports-outdoors', 'Sports equipment and outdoor gear', 1, 5),
('Toys & Games', 'toys-games', 'Toys, games, and entertainment', 1, 6),
('Beauty & Personal Care', 'beauty-personal-care', 'Cosmetics, skincare, and personal care', 1, 7),
('Automotive', 'automotive', 'Car parts, accessories, and tools', 1, 8),
('Food & Grocery', 'food-grocery', 'Food products and grocery items', 1, 9),
('Pet Supplies', 'pet-supplies', 'Pet food, toys, and accessories', 1, 10);

COMMIT;
-- QuickShop E-Commerce Database Seed Data
-- Sample data for initial setup

START TRANSACTION;

-- Insert sample users
INSERT INTO users (name, email, password, role, is_verified, is_active) VALUES
('Admin User', 'admin@quickshop.echelonxventures.org', '$2b$12$zH55fC0dQw8Y2YyQ9k8e7e7Y8zH55fC0dQw8Y2YyQ9k8e7e7Y8zH5', 'admin', 1, 1),
('John Doe', 'john.doe@example.com', '$2b$12$zH55fC0dQw8Y2YyQ9k8e7e7Y8zH55fC0dQw8Y2YyQ9k8e7e7Y8zH5', 'customer', 1, 1),
('Jane Smith', 'jane.smith@example.com', '$2b$12$zH55fC0dQw8Y2YyQ9k8e7e7Y8zH55fC0dQw8Y2YyQ9k8e7e7Y8zH5', 'seller', 1, 1);

-- Insert sample companies
INSERT INTO companies (name, email, description, status, approved_at) VALUES
('QuickShop Seller', 'seller@quickshop.echelonxventures.org', 'Sample seller company', 'approved', NOW()),
('Electronics Store', 'electronics@example.com', 'Electronics retail company', 'approved', NOW());

-- Insert sample brands
INSERT INTO brands (name, slug, description, is_active, sort_order) VALUES
('Sony', 'sony', 'Japanese multinational conglomerate', 1, 1),
('Apple', 'apple', 'American multinational technology company', 1, 2),
('Nike', 'nike', 'American multinational corporation', 1, 3),
('Samsung', 'samsung', 'South Korean multinational electronics company', 1, 4),
('LG', 'lg', 'South Korean multinational electronics company', 1, 5);

-- Insert sample categories using INSERT IGNORE to prevent duplicate key errors
INSERT IGNORE INTO categories (name, slug, description, is_active, sort_order) VALUES
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

-- Insert sample products
INSERT INTO products (name, slug, description, price, category_id, brand_id, seller_id, created_by, is_active, stock_quantity) VALUES
('iPhone 13 Pro', 'iphone-13-pro', 'The latest iPhone with Pro camera system', 999.99, 1, 2, 3, 3, 1, 50),
('Samsung Galaxy S21', 'samsung-galaxy-s21', 'Flagship Android smartphone', 799.99, 1, 4, 3, 3, 1, 75),
('Nike Air Max', 'nike-air-max', 'Comfortable athletic shoes', 129.99, 2, 3, 3, 3, 1, 200),
('Sony WH-1000XM4 Headphones', 'sony-wh-1000xm4-headphones', 'Industry-leading noise canceling headphones', 349.99, 1, 1, 3, 3, 1, 30),
('Apple Watch Series 7', 'apple-watch-series-7', 'The most advanced Apple Watch yet', 399.99, 1, 2, 3, 3, 1, 40);

-- Insert sample coupons
INSERT INTO coupons (code, name, type, value, usage_limit, starts_at, expires_at, is_active, created_by) VALUES
('FREESHIP', 'Free Shipping', 'free_shipping', 0.00, 1000, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 1, 1);

-- Insert sample user preferences
INSERT INTO user_preferences (user_id, language, currency, timezone) VALUES
(2, 'en', 'USD', 'America/Chicago'),
(3, 'en', 'USD', 'America/Los_Angeles');

-- Insert default system configurations using INSERT ... ON DUPLICATE KEY UPDATE
-- This handles the case where configs already exist, preventing duplicate key errors
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
('lockout_duration_minutes', '30', 'number', 'Duration of account lockout in minutes', 'authentication', FALSE)
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_type = VALUES(config_type),
    description = VALUES(description),
    category = VALUES(category),
    is_public = VALUES(is_public),
    updated_at = NOW();

COMMIT;
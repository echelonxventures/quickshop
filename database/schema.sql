-- QuickShop E-Commerce Database Schema
-- Generated schema with all necessary tables for the e-commerce platform

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables (if any)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS shipping_methods CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS product_questions CASCADE;
DROP TABLE IF EXISTS product_specifications CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS inventory_logs CASCADE;
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS sellers CASCADE;
DROP TABLE IF EXISTS seller_commissions CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS support_replies CASCADE;
DROP TABLE IF EXISTS chatbot_conversations CASCADE;
DROP TABLE IF EXISTS chatbot_messages CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS affiliates CASCADE;
DROP TABLE IF EXISTS affiliate_commissions CASCADE;
DROP TABLE IF EXISTS seller_payouts CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS user_payments CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS user_referrals CASCADE;
DROP TABLE IF EXISTS returns_refunds CASCADE;
DROP TABLE IF EXISTS product_comparisons CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(500),
  role ENUM('admin', 'seller', 'customer', 'support_agent', 'affiliate', 'supplier') DEFAULT 'customer',
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  company_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  login_count INT DEFAULT 0,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  paypal_customer_id VARCHAR(255),
  INDEX idx_email (email),
  INDEX idx_company (company_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Companies table
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  logo VARCHAR(500),
  cover_image VARCHAR(500),
  description TEXT,
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  tax_id VARCHAR(100),
  business_type ENUM('individual', 'company', 'partnership', 'non_profit') DEFAULT 'individual',
  registration_number VARCHAR(100),
  bank_name VARCHAR(255),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(100),
  bank_routing_number VARCHAR(100),
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  status ENUM('pending', 'approved', 'suspended', 'rejected') DEFAULT 'pending',
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_sales DECIMAL(12,2) DEFAULT 0.00,
  total_orders INT DEFAULT 0,
  product_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  suspended_at TIMESTAMP NULL,
  INDEX idx_status (status)
);

-- User preferences table
CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(10) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(10) DEFAULT '12h',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  marketing_communications BOOLEAN DEFAULT FALSE,
  newsletter_subscribed BOOLEAN DEFAULT FALSE,
  product_recommendations BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_preference (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Addresses table
CREATE TABLE addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('billing', 'shipping', 'both') DEFAULT 'both',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(255),
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_default (is_default),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  parent_id INT NULL,
  image VARCHAR(500),
  icon VARCHAR(100),
  banner_image VARCHAR(500),
  seo_title VARCHAR(255),
  seo_description TEXT,
  meta_keywords TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  product_count INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  level INT DEFAULT 0,
  path VARCHAR(1000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Brands table
CREATE TABLE brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo VARCHAR(500),
  banner_image VARCHAR(500),
  website VARCHAR(255),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  tax_id VARCHAR(100),
  contact_person VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description TEXT,
  meta_keywords TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  product_count INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active)
);

-- Products table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  compare_price DECIMAL(10,2),
  cost_per_item DECIMAL(10,2),
  category_id INT NOT NULL,
  brand_id INT NULL,
  seller_id INT NULL,
  vendor_id INT NULL,
  stock_quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  sold_quantity INT DEFAULT 0,
  weight DECIMAL(8,2),
  dimensions VARCHAR(100), -- Format: "length,width,height"
  shipping_class VARCHAR(100), -- "standard", "oversized", "fragile", etc.
  images JSON, -- JSON array of image URLs
  featured_image VARCHAR(500),
  video_url VARCHAR(500),
  specifications JSON, -- JSON object of product specifications
  attributes JSON, -- JSON object of product attributes
  tags JSON, -- JSON array of tags
  seo_title VARCHAR(255),
  seo_description TEXT,
  meta_keywords TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_on_sale BOOLEAN DEFAULT FALSE,
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_class VARCHAR(50) DEFAULT 'standard',
  rating DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  wishlist_count INT DEFAULT 0,
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0,
  min_quantity INT DEFAULT 1,
  max_quantity INT DEFAULT NULL,
  backorder_policy ENUM('no', 'yes', 'notify') DEFAULT 'no',
  `condition` ENUM('new', 'used', 'refurbished', 'open_box') DEFAULT 'new', -- Use backticks to escape MySQL reserved word
  age_group ENUM('newborn', 'infant', 'toddler', 'kids', 'adult') DEFAULT 'adult',
  gender ENUM('male', 'female', 'unisex') DEFAULT 'unisex',
  material VARCHAR(255),
  manufacturer VARCHAR(255),
  warranty_period INT, -- in months
  return_policy_days INT DEFAULT 30,
  shipping_disabled BOOLEAN DEFAULT FALSE,
  shipping_free BOOLEAN DEFAULT FALSE,
  shipping_fixed_rate DECIMAL(10,2),
  created_by INT NOT NULL, -- User/seller who created the product
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL,
  scheduled_at TIMESTAMP NULL,
  discontinued_at TIMESTAMP NULL,
  INDEX idx_category (category_id),
  INDEX idx_brand (brand_id),
  INDEX idx_seller (seller_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_created_by (created_by),
  INDEX idx_slug (slug),
  INDEX idx_sku (sku),
  INDEX idx_is_active (is_active),
  INDEX idx_is_featured (is_featured),
  INDEX idx_is_on_sale (is_on_sale),
  INDEX idx_created_at (created_at),
  INDEX idx_sold_quantity (sold_quantity),
  INDEX idx_rating (rating),
  FULLTEXT idx_name_desc (name, description, short_description),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (vendor_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Product images table
CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_sort_order (sort_order),
  INDEX idx_is_primary (is_primary),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product variants table
CREATE TABLE product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  name VARCHAR(255) NOT NULL, -- e.g., "Red - Large"
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  compare_price DECIMAL(10,2),
  stock_quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  sold_quantity INT DEFAULT 0,
  weight DECIMAL(8,2),
  dimensions VARCHAR(100),
  attributes JSON, -- Specific attributes for this variant
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_sku (sku),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Cart table
CREATE TABLE cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL, -- For products with variants
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL, -- Price at the time of adding to cart
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_product (user_id, product_id),
  INDEX idx_variant (variant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_product_variant (user_id, product_id, variant_id)
);

-- Wishlist table
CREATE TABLE wishlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_product (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Orders table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_gateway VARCHAR(50),
  payment_transaction_id VARCHAR(255),
  payment_details JSON, -- Additional payment gateway specific data
  customer_notes TEXT,
  admin_notes TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_details JSON, -- Details about discounts applied
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_details JSON, -- Details about taxes applied
  shipping_amount DECIMAL(10,2) DEFAULT 0.00,
  shipping_method VARCHAR(255),
  shipping_details JSON, -- Additional shipping information
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
  base_currency_amount DECIMAL(10,2), -- Amount in base currency (if different from order currency)
  shipping_address_id INT,
  billing_address_id INT,
  tracking_number VARCHAR(100),
  tracking_carrier VARCHAR(100),
  tracking_url VARCHAR(500),
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_by INT NULL, -- User who cancelled the order
  cancelled_reason TEXT,
  refunded_at TIMESTAMP NULL,
  refunded_reason TEXT,
  affiliate_code VARCHAR(100), -- Affiliate code used
  affiliate_commission DECIMAL(10,2) DEFAULT 0.00, -- Commission earned by affiliate
  coupon_code VARCHAR(50), -- Coupon code used
  coupon_discount DECIMAL(10,2) DEFAULT 0.00, -- Discount amount from coupon
  gift_wrapping BOOLEAN DEFAULT FALSE,
  gift_message TEXT,
  is_gift BOOLEAN DEFAULT FALSE,
  gift_recipient_name VARCHAR(255),
  gift_recipient_email VARCHAR(255),
  gift_recipient_phone VARCHAR(20),
  gift_recipient_address_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_order_number (order_number),
  INDEX idx_created_at (created_at),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_coupon_code (coupon_code),
  INDEX idx_affiliate_code (affiliate_code),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
  FOREIGN KEY (billing_address_id) REFERENCES addresses(id),
  FOREIGN KEY (gift_recipient_address_id) REFERENCES addresses(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

-- Order items table
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL, -- For products with variants
  seller_id INT NULL, -- Seller who sold the item
  name VARCHAR(255) NOT NULL, -- Product name at the time of purchase
  sku VARCHAR(100), -- Product SKU at the time of purchase
  price DECIMAL(10,2) NOT NULL, -- Price at the time of purchase
  sale_price DECIMAL(10,2), -- Sale price at the time of purchase (if applicable)
  compare_price DECIMAL(10,2), -- Compare price at the time of purchase
  tax_amount DECIMAL(10,2) DEFAULT 0.00, -- Tax amount for this item
  tax_rate DECIMAL(5,4) DEFAULT 0.0000, -- Tax rate for this item
  quantity INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL, -- Total price before tax/discounts
  total DECIMAL(10,2) NOT NULL, -- Total price after tax
  commission_rate DECIMAL(5,2) DEFAULT 0.00, -- Commission rate for seller
  commission_amount DECIMAL(10,2) DEFAULT 0.00, -- Commission amount for seller
  affiliate_commission_rate DECIMAL(5,2) DEFAULT 0.00, -- Commission rate for affiliate
  affiliate_commission_amount DECIMAL(10,2) DEFAULT 0.00, -- Commission amount for affiliate
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id),
  INDEX idx_variant (variant_id),
  INDEX idx_seller (seller_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- Payments table
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  gateway VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'razorpay', 'cod', 'bank_transfer', etc.
  transaction_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled') DEFAULT 'pending',
  method VARCHAR(50), -- 'credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cod', etc.
  payment_data JSON, -- Additional payment gateway specific data
  response_data JSON, -- Raw response from payment gateway
  error_message TEXT, -- Error message if payment failed
  captured BOOLEAN DEFAULT FALSE, -- Whether payment was captured (for gateways that support authorization+capture)
  refunded BOOLEAN DEFAULT FALSE, -- Whether payment was refunded
  refunded_amount DECIMAL(10,2) DEFAULT 0.00,
  refund_transaction_id VARCHAR(255),
  refund_reason TEXT,
  captured_at TIMESTAMP NULL,
  refunded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_gateway (gateway),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Coupons table
CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('percentage', 'fixed_amount', 'free_shipping') NOT NULL,
  value DECIMAL(10,2), -- Discount value (percentage or fixed amount)
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2), -- Maximum discount allowed
  usage_limit INT, -- Total usage limit
  usage_limit_per_user INT DEFAULT 1, -- Usage limit per user
  used_count INT DEFAULT 0,
  starts_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  applies_to ENUM('all_products', 'specific_products', 'specific_categories', 'specific_brands') DEFAULT 'all_products',
  applies_to_ids JSON, -- IDs of products/categories/brands the coupon applies to
  restrict_to_customer_ids JSON, -- Specific customer IDs the coupon is for
  exclude_sale_items BOOLEAN DEFAULT FALSE,
  exclude_specified_products BOOLEAN DEFAULT FALSE,
  exclude_specified_categories BOOLEAN DEFAULT FALSE,
  exclude_specified_brands BOOLEAN DEFAULT FALSE,
  excluded_product_ids JSON, -- IDs of products the coupon does not apply to
  excluded_category_ids JSON, -- IDs of categories the coupon does not apply to
  excluded_brand_ids JSON, -- IDs of brands the coupon does not apply to
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL, -- User who created the coupon
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_expires_at (expires_at),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Coupon usage table
CREATE TABLE coupon_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coupon_user (coupon_id, user_id),
  INDEX idx_order (order_id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Shipping methods table
CREATE TABLE shipping_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('flat_rate', 'free_shipping', 'local_pickup', 'calculated') DEFAULT 'flat_rate',
  cost DECIMAL(10,2) DEFAULT 0.00,
  cost_calculation JSON, -- Configuration for calculated shipping
  estimated_delivery_days INT,
  estimated_delivery_time VARCHAR(100), -- e.g., "3-5 business days"
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_is_default (is_default)
);

-- Product reviews table
CREATE TABLE product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id INT NULL, -- Order that generated this review
  rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review TEXT NOT NULL,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT FALSE, -- Whether reviewer actually purchased the product
  is_approved BOOLEAN DEFAULT FALSE, -- Whether review is approved by admin
  is_featured BOOLEAN DEFAULT FALSE, -- Whether review is featured
  admin_response TEXT, -- Admin response to the review
  admin_responded_by INT NULL, -- Admin who responded
  admin_responded_at TIMESTAMP NULL,
  status ENUM('pending', 'approved', 'rejected', 'hidden') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_user (user_id),
  INDEX idx_order (order_id),
  INDEX idx_rating (rating),
  INDEX idx_is_approved (is_approved),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (admin_responded_by) REFERENCES users(id)
);

-- Product questions table
CREATE TABLE product_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by INT NULL, -- Admin who answered the question
  is_answered BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE, -- Whether question is visible to all users
  is_approved BOOLEAN DEFAULT FALSE, -- Whether question is approved by admin
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  answered_at TIMESTAMP NULL,
  INDEX idx_product (product_id),
  INDEX idx_user (user_id),
  INDEX idx_is_answered (is_answered),
  INDEX idx_is_approved (is_approved),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (answered_by) REFERENCES users(id)
);

-- Inventory table
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT NULL, -- For multi-warehouse setups
  stock_quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  available_quantity INT GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,
  min_stock_level INT DEFAULT 0,
  max_stock_level INT DEFAULT NULL,
  reorder_point INT DEFAULT 10,
  reorder_quantity INT DEFAULT 100,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_available_quantity (available_quantity),
  INDEX idx_last_updated (last_updated),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Inventory logs table
CREATE TABLE inventory_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  action ENUM('add', 'remove', 'adjust', 'sale', 'return', 'damage', 'transfer') NOT NULL,
  quantity_change INT NOT NULL, -- Positive for additions, negative for removals
  reason VARCHAR(255), -- Reason for the inventory change
  reference_id INT, -- Reference to order, return, etc. that caused this change
  reference_type VARCHAR(50), -- Type of reference (e.g., 'order', 'return')
  user_id INT NULL, -- User who performed the action
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_reference (reference_id, reference_type),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Inventory alerts table
CREATE TABLE inventory_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  alert_type ENUM('low_stock', 'out_of_stock', 'over_stock') NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by INT NULL, -- User who resolved the alert
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_alert_type (alert_type),
  INDEX idx_is_resolved (is_resolved),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Sellers table
CREATE TABLE sellers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_id INT NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  status ENUM('pending', 'approved', 'suspended', 'rejected') DEFAULT 'pending',
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_sales DECIMAL(12,2) DEFAULT 0.00,
  total_orders INT DEFAULT 0,
  product_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  suspended_at TIMESTAMP NULL,
  suspended_reason TEXT,
  INDEX idx_user (user_id),
  INDEX idx_company (company_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_user_company (user_id, company_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Seller commissions table
CREATE TABLE seller_commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  order_item_id INT NOT NULL,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_seller (seller_id),
  INDEX idx_order (order_id),
  INDEX idx_order_item (order_item_id),
  INDEX idx_product (product_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (seller_id) REFERENCES sellers(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Support tickets table
CREATE TABLE support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category ENUM('technical', 'billing', 'account', 'product', 'refund', 'other') DEFAULT 'other',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  status ENUM('open', 'in_progress', 'resolved', 'closed', 'spam') DEFAULT 'open',
  assigned_to INT NULL, -- Support agent assigned to the ticket
  closed_by INT NULL, -- User who closed the ticket
  closed_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_status (status),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- Support replies table
CREATE TABLE support_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL, -- User who made the reply (customer or agent)
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Whether this is an internal note
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id),
  INDEX idx_user (user_id),
  INDEX idx_is_internal (is_internal),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Chatbot conversations table
CREATE TABLE chatbot_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL, -- NULL for guest users
  session_id VARCHAR(255) NOT NULL, -- Unique session identifier
  title VARCHAR(255), -- Auto-generated title from first message
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Chatbot messages table
CREATE TABLE chatbot_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_type ENUM('user', 'bot') NOT NULL,
  message TEXT NOT NULL,
  intent VARCHAR(100), -- NLU intent
  entities JSON, -- Extracted entities from the message
  confidence DECIMAL(3,2), -- Confidence score of the intent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_type),
  INDEX idx_intent (intent),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE
);

-- Analytics table
CREATE TABLE analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_id VARCHAR(255),
  page_url VARCHAR(500),
  referrer_url VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  event_type ENUM('page_view', 'click', 'scroll', 'form_submit', 'purchase', 'custom') NOT NULL,
  event_name VARCHAR(255), -- For custom events
  event_data JSON, -- Additional data about the event
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_event_type (event_type),
  INDEX idx_event_name (event_name),
  INDEX idx_page_url (page_url(255)),
  INDEX idx_created_at (created_at),
  INDEX idx_ip_address (ip_address),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Promotions table
CREATE TABLE promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('discount', 'bogo', 'free_gift', 'rebate', 'loyalty') NOT NULL,
  discount_type ENUM('percentage', 'fixed_amount') NULL, -- For discount type promotions
  discount_value DECIMAL(10,2) NULL, -- Value of the discount
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  usage_limit INT, -- Total usage limit
  usage_limit_per_user INT DEFAULT 1, -- Usage limit per user
  used_count INT DEFAULT 0,
  applies_to ENUM('all_products', 'specific_products', 'specific_categories', 'specific_brands') DEFAULT 'all_products',
  applies_to_ids JSON, -- IDs of products/categories/brands the promotion applies to
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL, -- User who created the promotion
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_is_active (is_active),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Affiliates table
CREATE TABLE affiliates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- Affiliate code
  commission_rate DECIMAL(5,2) NOT NULL, -- Commission rate percentage
  status ENUM('pending', 'active', 'suspended', 'rejected') DEFAULT 'pending',
  total_commissions DECIMAL(10,2) DEFAULT 0.00,
  paid_commissions DECIMAL(10,2) DEFAULT 0.00,
  unpaid_commissions DECIMAL(10,2) DEFAULT 0.00,
  total_referrals INT DEFAULT 0,
  total_sales DECIMAL(12,2) DEFAULT 0.00,
  join_date DATE NOT NULL,
  approved_at TIMESTAMP NULL,
  suspended_at TIMESTAMP NULL,
  suspended_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_join_date (join_date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Affiliate commissions table
CREATE TABLE affiliate_commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  customer_id INT NOT NULL, -- The customer who made the purchase
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'paid', 'cancelled') DEFAULT 'pending',
  confirmed_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_affiliate (affiliate_id),
  INDEX idx_order (order_id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- Seller payouts table
CREATE TABLE seller_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  method VARCHAR(50), -- Payout method (e.g., 'paypal', 'bank_transfer')
  details JSON, -- Payout method details
  reference_number VARCHAR(100), -- Payout reference number from payment provider
  initiated_by INT NOT NULL, -- Admin user who initiated the payout
  processed_by INT NULL, -- Admin user who processed the payout
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  failed_at TIMESTAMP NULL,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_seller (seller_id),
  INDEX idx_status (status),
  INDEX idx_initiated_by (initiated_by),
  INDEX idx_processed_by (processed_by),
  INDEX idx_initiated_at (initiated_at),
  INDEX idx_completed_at (completed_at),
  FOREIGN KEY (seller_id) REFERENCES sellers(id),
  FOREIGN KEY (initiated_by) REFERENCES users(id),
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- System config table
CREATE TABLE system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL, -- Configuration key (e.g., 'site_name', 'email_verification_required')
  config_value TEXT, -- Configuration value
  config_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
  description TEXT,
  category VARCHAR(100), -- Category for grouping configs (e.g., 'email', 'payment', 'shipping')
  is_public BOOLEAN DEFAULT FALSE, -- Whether this config can be accessed by frontend
  is_encrypted BOOLEAN DEFAULT FALSE, -- Whether the value is encrypted
  validation_rules JSON, -- Validation rules for the config value
  options JSON, -- Available options for selection (for dropdowns, checkboxes, etc.)
  sort_order INT DEFAULT 10, -- Sort order for display
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key),
  INDEX idx_category (category),
  INDEX idx_is_public (is_public)
);

-- User notifications table
CREATE TABLE user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, -- User who receives the notification
  type VARCHAR(50) NOT NULL, -- Type of notification ('order_status', 'shipment', 'promotional', 'system', 'support', etc.)
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500), -- URL to navigate to when notification is clicked
  icon VARCHAR(100), -- Icon for the notification
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  is_read BOOLEAN DEFAULT FALSE,
  is_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  seen_at TIMESTAMP NULL,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_priority (priority),
  INDEX idx_is_read (is_read),
  INDEX idx_is_seen (is_seen),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions table
CREATE TABLE user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL, -- Unique session token
  refresh_token VARCHAR(255) NOT NULL, -- Refresh token for extending session
  device_info TEXT, -- Information about the device
  ip_address VARCHAR(45), -- IP address of the user
  user_agent TEXT, -- User agent string
  logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- When the session expires
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_refresh_token (refresh_token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User addresses table (separate from the addresses table)
CREATE TABLE user_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address_id INT NOT NULL,
  is_default_billing BOOLEAN DEFAULT FALSE,
  is_default_shipping BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_address (address_id),
  INDEX idx_is_default_billing (is_default_billing),
  INDEX idx_is_default_shipping (is_default_shipping),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_address (user_id, address_id)
);

-- User payments table
CREATE TABLE user_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- Payment method type (e.g., 'credit_card', 'paypal')
  provider VARCHAR(50) NOT NULL, -- Payment provider (e.g., 'stripe', 'paypal', 'razorpay')
  provider_customer_id VARCHAR(255) NOT NULL, -- Customer ID at the payment provider
  billing_details JSON, -- Billing details (card number, expiry, etc. - should be encrypted)
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_provider (provider),
  INDEX idx_is_default (is_default),
  INDEX idx_is_active (is_active),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User referrals table
CREATE TABLE user_referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL, -- User who referred
  referred_user_id INT NOT NULL, -- User who was referred
  referral_code VARCHAR(50), -- Referral code used
  reward_earned DECIMAL(10,2) DEFAULT 0.00, -- Reward earned by referrer
  reward_currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_referrer (referrer_id),
  INDEX idx_referred_user (referred_user_id),
  INDEX idx_referral_code (referral_code),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

-- Returns and refunds table
CREATE TABLE returns_refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  user_id INT NOT NULL,
  return_reason VARCHAR(255),
  return_description TEXT,
  return_quantity INT DEFAULT 1,
  return_shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_reason VARCHAR(255),
  status ENUM('requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled') DEFAULT 'requested',
  shipping_label_url VARCHAR(500), -- URL for the return shipping label
  tracking_number VARCHAR(100),
  tracking_carrier VARCHAR(100),
  tracking_url VARCHAR(500),
  received_at TIMESTAMP NULL,
  refunded_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  rejected_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_order_item (order_item_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Product comparisons table
CREATE TABLE product_comparisons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_ids JSON, -- JSON array of product IDs being compared
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Wishlist items table with notes and priority
CREATE TABLE wishlist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  note TEXT, -- Personal note about the product
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_product (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY unique_user_product (user_id, product_id)
);

SET FOREIGN_KEY_CHECKS = 1;
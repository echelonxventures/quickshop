#!/bin/bash
# Script to fix the duplicate entry issue in QuickShop database

echo "Fixing QuickShop database seed data duplicate entry issue..."

# First, connect to MySQL and clear the system_config table (the one causing issues)
echo "Clearing existing system_config data..."
mysql -h 10.0.1.23 -u admin -p -e "
SET FOREIGN_KEY_CHECKS = 0;
USE quickshop;
DELETE FROM system_config;
DELETE FROM categories WHERE name IN ('Electronics', 'Fashion', 'Home & Garden', 'Books', 'Sports & Outdoors', 'Toys & Games', 'Beauty & Personal Care', 'Automotive', 'Food & Grocery', 'Pet Supplies');
SET FOREIGN_KEY_CHECKS = 1;
"

echo "Importing schema (this ensures a clean setup)..."
mysql -h 10.0.1.23 -u admin -p quickshop < database/schema.sql

echo "Importing corrected seed data..."
mysql -h 10.0.1.23 -u admin -p quickshop < database/seed_data_fixed.sql

echo "Database setup completed successfully!"
echo "If you still see errors, you may need to reset the database completely with:"
echo "mysql -h 10.0.1.23 -u admin -p -e \"DROP DATABASE quickshop; CREATE DATABASE quickshop;\""
echo "Then run this script again."
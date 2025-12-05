#!/bin/bash
# Script to fix the duplicate entry issue in QuickShop database

echo "Fixing QuickShop database seed data duplicate entry issue..."

# Drop and recreate the database to ensure a clean slate
echo "Dropping and recreating the database..."
mysql -h 10.0.1.23 -u admin -p -e "DROP DATABASE IF EXISTS quickshop; CREATE DATABASE quickshop;"

echo "Importing schema (fresh setup)..."
mysql -h 10.0.1.23 -u admin -p quickshop < database/schema.sql

echo "Importing corrected seed data..."
mysql -h 10.0.1.23 -u admin -p quickshop < database/seed_data.sql

echo "Database setup completed successfully!"
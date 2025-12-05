#!/bin/bash
# Initialize QuickShop database

echo "Initializing QuickShop database..."

# Check if MySQL connection is available
if ! command -v mysql &> /dev/null; then
    echo "MySQL client is not installed. Please install it first."
    exit 1
fi

# Database connection variables
DB_HOST=${DB_HOST:-"10.0.1.23"}
DB_USER=${DB_USER:-"admin"}
DB_PASSWORD=${DB_PASSWORD:-"your_mysql_password"}
DB_NAME=${DB_NAME:-"quickshop"}

echo "Connecting to MySQL at $DB_HOST as $DB_USER..."

# Create database if it doesn't exist
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -eq 0 ]; then
    echo "Database $DB_NAME created successfully (or already existed)."
else
    echo "Error creating database. Please check your credentials and connection."
    exit 1
fi

# Import schema
echo "Importing database schema..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < ../database/schema.sql

if [ $? -eq 0 ]; then
    echo "Schema imported successfully."
else
    echo "Error importing schema."
    exit 1
fi

# Ask if user wants to import seed data
read -p "Do you want to import seed data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Importing seed data..."
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < ../database/seed_data.sql
    
    if [ $? -eq 0 ]; then
        echo "Seed data imported successfully."
    else
        echo "Error importing seed data."
        exit 1
    fi
fi

echo " "
echo "Database initialization completed successfully!"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
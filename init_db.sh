#!/bin/bash

# QuickShop Initialization Script

echo "Starting QuickShop e-commerce platform initialization..."

# Check if MySQL is available
echo "Checking MySQL connection..."
until mysql -h 10.0.1.23 -u admin -pyour_mysql_password -e "SHOW DATABASES;" 2>/dev/null; do
    echo "Waiting for MySQL to start..."
    sleep 5
done

echo "MySQL is available!"

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
mysql -h 10.0.1.23 -u admin -pyour_mysql_password -e "CREATE DATABASE IF NOT EXISTS quickshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
echo "Importing database schema..."
mysql -h 10.0.1.23 -u admin -pyour_mysql_password quickshop < /home/ubuntu/quickshop/database/schema.sql

# Import seed data
echo "Importing seed data..."
mysql -h 10.0.1.23 -u admin -pyour_mysql_password quickshop < /home/ubuntu/quickshop/database/seed_data.sql

echo "Database initialized successfully!"

# Start the application
echo "Starting application services..."
cd /home/ubuntu/quickshop
docker-compose up -d

echo "QuickShop platform is now running!"
echo "Access the platform at: http://quickshop.echelonxventures.org"
echo "Admin portal: http://quickshop.echelonxventures.org/admin"
echo "Support portal: http://quickshop.echelonxventures.org/support"
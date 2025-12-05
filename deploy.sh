#!/bin/bash
# QuickShop Full Deployment Script
# This script will set up the entire QuickShop application on a fresh server

set -e  # Exit on any error

echo "==========================================="
echo "QuickShop Full Deployment Script"
echo "==========================================="

# Configuration variables
DOMAIN="quickshop.echelonxventures.org"
DB_HOST="10.0.1.23"
DB_USER="admin"
DB_PASSWORD="your_db_password_here"

echo " "
echo "This script will deploy QuickShop with the following configuration:"
echo "Domain: $DOMAIN"
echo "Database Host: $DB_HOST"
echo " "
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo " "
echo "1. Installing system dependencies..."
sudo apt update
sudo apt install -y curl git build-essential libtool-bin autoconf automake pkg-config libssl-dev nginx certbot python3-certbot-nginx

echo " "
echo "2. Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

echo " "
echo "3. Installing PM2 globally..."
sudo npm install -g pm2

echo " "
echo "4. Cloning QuickShop repository..."
if [ -d "quickshop" ]; then
    echo "QuickShop directory already exists, updating instead..."
    cd quickshop
    git pull origin main
    cd ..
else
    git clone https://github.com/echelonxventures/quickshop.git
fi

echo " "
echo "5. Setting up backend..."
cd ~/quickshop/backend
npm install

echo " "
echo "6. Setting up webhook..."
cd ~/quickshop/webhook
npm init -y
npm install express crypto child_process

echo " "
echo "7. Creating upload directories..."
mkdir -p ~/quickshop/backend/uploads
mkdir -p ~/quickshop/backend/logs

echo " "
echo "8. Setting up ecosystem configuration..."
cd ~/quickshop

echo " "
echo "9. Starting services with PM2..."
pm2 start ecosystem.config.js

echo " "
echo "10. Setting up firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow 9000  # For webhook
sudo ufw --force enable

echo " "
echo "11. Setting up NGINX configuration..."
sudo tee /etc/nginx/sites-available/quickshop > /dev/null <<EOF
# Upstream definition for backend API
upstream backend {
    server localhost:5000;
    keepalive 32;
}

# Main server configuration
server {
    listen 80;
    server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Client max body size for file uploads
    client_max_body_size 10M;

    # Gzip compression for better performance
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Main frontend application (customer-facing)
    location / {
        alias /home/ubuntu/quickshop/frontend/build/;
        try_files $uri $uri/ @fallback;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback for Single Page Application routing
    location @fallback {
        alias /home/ubuntu/quickshop/frontend/build/index.html;
    }

    # API proxy to backend
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Additional headers for proper proxying
        proxy_redirect off;
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Additional locations for other portals
    location /admin {
        alias /home/ubuntu/quickshop/admin_portal/build/;
        try_files $uri $uri/ @admin_fallback;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location @admin_fallback {
        alias /home/ubuntu/quickshop/admin_portal/build/index.html;
    }

    location /seller {
        alias /home/ubuntu/quickshop/seller_portal/build/;
        try_files $uri $uri/ @seller_fallback;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location @seller_fallback {
        alias /home/ubuntu/quickshop/seller_portal/build/index.html;
    }

    location /support {
        alias /home/ubuntu/quickshop/support_portal/build/;
        try_files $uri $uri/ @support_fallback;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location @support_fallback {
        alias /home/ubuntu/quickshop/support_portal/build/index.html;
    }

    location /analytics {
        alias /home/ubuntu/quickshop/analytics_portal/build/;
        try_files $uri $uri/ @analytics_fallback;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location @analytics_fallback {
        alias /home/ubuntu/quickshop/analytics_portal/build/index.html;
    }

    # Static assets optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security: Hide nginx version
    server_tokens off;

    # Logging
    access_log /var/log/nginx/quickshop_access.log;
    error_log /var/log/nginx/quickshop_error.log;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/quickshop /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site

echo " "
echo "12. Testing and restarting NGINX..."
sudo nginx -t
sudo systemctl restart nginx

echo " "
echo "13. Setting up PM2 startup..."
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

echo " "
echo "==========================================="
echo "Deployment Completed!"
echo "==========================================="
echo "Services Status:"
pm2 status
echo " "
echo "Important Notes:"
echo "- Update the .env file with your actual database credentials"
echo "- Run 'sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN' to get SSL certificate"
echo "- Configure your domain DNS to point to this server's IP address"
echo " "
echo "To check application status: pm2 status"
echo "To view backend logs: pm2 logs quickshop-backend"
echo "To view webhook logs: pm2 logs quickshop-webhook"
echo "To restart services: pm2 restart all"
echo " "
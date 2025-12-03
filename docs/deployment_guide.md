# QuickShop Deployment Guide

## 🚀 Production Deployment

This guide will walk you through deploying QuickShop to production using Oracle Cloud Infrastructure (OCI) Always Free Tier and Hostinger.

## Prerequisites

- Domain: `quickshop.echelonxventures.org` (configured on Hostinger)
- Oracle Cloud Infrastructure account with Always Free Tier
- Hostinger hosting account
- Git installed locally
- Docker and Docker Compose installed

## 1. Domain Configuration (Hostinger)

### 1.1. Point Domain to OCI Server

1. Log in to your Hostinger control panel
2. Go to DNS management for `quickshop.echelonxventures.org`
3. Update the A record to point to your OCI server IP address:
   ```
   Type: A
   Name: @
   Value: [YOUR_OCI_SERVER_IP]
   TTL: 14400
   ```
4. Update the A record for www:
   ```
   Type: A
   Name: www
   Value: [YOUR_OCI_SERVER_IP]
   TTL: 14400
   ```

### 1.2. SSL Certificate (Let's Encrypt)

We'll use Certbot to obtain SSL certificates:

```bash
# On your OCI server
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d quickshop.echelonxventures.org -d www.quickshop.echelonxventures.org
```

## 2. OCI Server Setup (Always Free Tier)

### 2.1. Create Oracle Cloud VM Instance

1. Log in to Oracle Cloud Console
2. Navigate to "Compute" → "Instances"
3. Click "Create Instance"
4. Select "Always Free" tier
5. Choose Ubuntu 22.04 LTS image
6. Configure security rules to allow ports 22, 80, 443, 3000, 5000
7. Download SSH key and save it securely

### 2.2. Connect to Server

```bash
ssh -i your_ssh_key opc@[YOUR_SERVER_IP]
```

### 2.3. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL client
sudo apt install mysql-client -y

# Install Nginx
sudo apt install nginx -y
```

### 2.4. Clone Repository

```bash
cd /home/opc
git clone https://github.com/[your-username]/quickshop.git
cd quickshop
```

## 3. Database Setup (OCI MySQL Always Free)

### 3.1. Create MySQL Database

1. In Oracle Cloud Console, go to "MySQL Database"
2. Create a new MySQL instance (Always Free tier)
3. Note down the connection details

### 3.2. Connect to MySQL and Create Database

```bash
# Connect to MySQL using the connection details from OCI
mysql -h [MYSQL_CONNECTION_STRING] -u admin -p

# Create database
CREATE DATABASE quickshop;
USE quickshop;

# Import schema
# First, update your schema.sql with proper connection details
mysql -h [MYSQL_CONNECTION_STRING] -u admin -p quickshop < /home/opc/quickshop/database/schema.sql

# Import seed data
mysql -h [MYSQL_CONNECTION_STRING] -u admin -p quickshop < /home/opc/quickshop/database/seed_data.sql
```

## 4. Environment Configuration

### 4.1. Update Environment Files

Update the environment files with your production values:

```bash
# Backend environment
cd /home/opc/quickshop/backend
cp .env.example .env

# Edit .env with your actual values:
nano .env
```

Example production `.env` file:
```
# Database Configuration
DB_HOST=your-mysql-connection-string.mysql.database.azure.com
DB_USER=admin
DB_PASSWORD=your_mysql_password
DB_NAME=quickshop
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_production_jwt_secret_key
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# Redis Configuration (if using Redis on OCI)
REDIS_URL=redis://localhost:6379

# Payment Gateway Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Application Configuration
APP_NAME=QuickShop
APP_URL=https://quickshop.echelonxventures.org
ADMIN_EMAIL=admin@quickshop.echelonxventures.org
SUPPORT_EMAIL=support@quickshop.echelonxventures.org
```

## 5. Docker Deployment

### 5.1. Build and Start Services

```bash
cd /home/opc/quickshop

# Build and start all services
sudo docker-compose -f deployment/docker-compose.yml up -d --build

# Check if all services are running
sudo docker-compose -f deployment/docker-compose.yml ps
```

### 5.2. Nginx Configuration

Update the nginx.conf with SSL certificates:

```bash
# Enable SSL in nginx configuration
sudo nano /home/opc/quickshop/deployment/nginx.conf
```

Uncomment the SSL server block and update certificate paths:

```
# SSL Configuration
server {
    listen 443 ssl;
    server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;

    ssl_certificate /etc/ssl/certs/quickshop.echelonxventures.org.crt;
    ssl_certificate_key /etc/ssl/private/quickshop.echelonxventures.org.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin {
        proxy_pass http://admin:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /support {
        proxy_pass http://support:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /analytics {
        proxy_pass http://analytics:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;
    return 301 https://$server_name$request_uri;
}
```

### 5.3. Start Nginx Proxy

```bash
# Copy nginx config to proper location
sudo cp /home/opc/quickshop/deployment/nginx.conf /etc/nginx/nginx.conf

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 6. CI/CD Pipeline Setup

### 6.1. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: |
        cd backend
        npm install
        cd ../frontend
        npm install
        cd ../admin_portal
        npm install
        cd ../support_portal
        npm install
        cd ../analytics_portal
        npm install

    - name: Run tests
      run: |
        cd backend
        npm test
        cd ../frontend
        npm test

    - name: Build applications
      run: |
        cd frontend
        npm run build
        cd ../admin_portal
        npm run build
        cd ../support_portal
        npm run build
        cd ../analytics_portal
        npm run build

    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /home/opc/quickshop
          git pull origin main
          sudo docker-compose down
          sudo docker-compose up -d --build
```

## 7. Monitoring and Logging

### 7.1. Set up Log Monitoring

The deployment includes Elasticsearch and Kibana for log analysis:

```bash
# Access Kibana for log visualization
# Kibana will be available at http://your-server-ip:5601

# Set up index patterns and dashboards in Kibana
```

### 7.2. Health Checks

Set up health checks in your cloud provider:

- Backend: `http://quickshop.echelonxventures.org/health`
- Frontend: `http://quickshop.echelonxventures.org/`
- Admin: `http://quickshop.echelonxventures.org/admin`

## 8. Backup Strategy

### 8.1. Database Backup

Set up automated backups:

```bash
# Create backup script
sudo nano /home/opc/backup_db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h [MYSQL_CONNECTION_STRING] -u admin -p'your_password' quickshop > /home/opc/backups/quickshop_$DATE.sql
# Upload to object storage or send to another location
```

```bash
# Make executable
chmod +x /home/opc/backup_db.sh

# Add to cron for daily backups
crontab -e
# Add: 0 2 * * * /home/opc/backup_db.sh
```

## 9. Troubleshooting

### 9.1. Common Issues

1. **Port 80/443 not accessible**
   - Check security rules in OCI
   - Verify nginx is running: `sudo systemctl status nginx`

2. **Database connection errors**
   - Check MySQL connection string
   - Verify firewall rules allow connections
   - Test connection: `mysql -h [HOST] -u admin -p`

3. **Docker containers not starting**
   - Check logs: `sudo docker-compose logs`
   - Verify environment variables

### 9.2. Useful Commands

```bash
# View logs
sudo docker-compose -f deployment/docker-compose.yml logs -f

# Restart services
sudo docker-compose -f deployment/docker-compose.yml restart

# Check status
sudo docker-compose -f deployment/docker-compose.yml ps

# Update from Git and restart
git pull origin main
sudo docker-compose -f deployment/docker-compose.yml down
sudo docker-compose -f deployment/docker-compose.yml up -d --build
```

## 10. Performance Optimization

### 10.1. Caching Setup

Redis is included in the docker-compose file for caching. Configure caching in your application:

- Product catalog caching
- User session caching
- API response caching

### 10.2. CDN Configuration

Consider setting up Cloudflare or OCI Edge Services for static asset caching and global CDN.

## 11. Maintenance Tasks

### 11.1. Regular Maintenance

1. **Weekly:**
   - Update system packages
   - Check disk space usage
   - Review application logs

2. **Monthly:**
   - Update application dependencies
   - Review security logs
   - Test backup restoration

3. **Quarterly:**
   - Security audit
   - Performance review
   - Database optimization

### 11.2. Security Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
sudo docker-compose pull
sudo docker-compose up -d --build
```

## Conclusion

Your QuickShop e-commerce platform is now deployed and running on Oracle Cloud Infrastructure using the Always Free Tier. The application is accessible at `https://quickshop.echelonxventures.org` and includes all the features specified in the requirements.

Remember to monitor the resource usage to ensure you remain within the Always Free Tier limits. You can also set up billing alerts in Oracle Cloud to monitor your usage.
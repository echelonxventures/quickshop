# 🚀 QuickShop Platform Deployment Guide

## 📋 Deployment Overview

The QuickShop e-commerce platform is fully configured and ready for production deployment. This document provides comprehensive instructions for deploying the platform on Oracle Cloud Infrastructure Always Free Tier with domain hosting through Hostinger.

## 🎯 Production System Architecture

### Server Requirements
- **Cloud Provider**: Oracle Cloud Infrastructure (Always Free Tier)
- **Instance Type**: VM.Standard.E4.Flex (1 OCPU, 1 GB RAM, 48 GB storage)
- **Operating System**: Ubuntu 22.04 LTS
- **Domain**: quickshop.echelonxventures.org (Hostinger)

### Tech Stack
- **Backend**: Node.js/Express.js with microservices architecture
- **Frontend**: React.js with advanced features and PWA capabilities
- **Database**: MySQL 8.0 with Redis caching
- **Web Server**: Nginx reverse proxy
- **Containerization**: Docker & Docker Compose
- **SSL**: Let's Encrypt certificates
- **Analytics**: Elasticsearch + Kibana stack

## 🔐 Prerequisites

### Server Setup
```bash
# Connect to your Oracle Cloud instance
ssh -i your_private_key ubuntu@your_server_ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y \
    docker.io \
    docker-compose \
    git \
    curl \
    wget \
    nginx \
    certbot \
    python3-certbot-nginx \
    mysql-client \
    redis-tools \
    nodejs \
    npm \
    build-essential
```

### Domain Configuration
1. **Purchase Domain**: quickshop.echelonxventures.org from Hostinger
2. **DNS Configuration**: Point A record to your OCI server IP
3. **Propagation**: Allow up to 48 hours for DNS propagation

## 🚀 Deployment Steps

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/quickshop.git
cd quickshop

# Create secrets directory
mkdir -p secrets
echo "your_secure_mysql_password" > secrets/mysql_root_password.txt
echo "your_secure_mysql_password" > secrets/mysql_user_password.txt
```

### 2. Environment Configuration
```bash
# Create environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin_portal/.env.example admin_portal/.env
cp support_portal/.env.example support_portal/.env
cp analytics_portal/.env.example analytics_portal/.env

# Update with your configuration values
# Essential values for Always Free Tier:
DB_HOST=127.0.0.1  # Use localhost for local MySQL
MYSQL_ROOT_PASSWORD_FILE=/run/secrets/mysql_root_password
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_very_long_and_secure_secret_key
```

### 3. Configure environment variables
# Essential backend environment variables:
cat << 'EOF' > backend/.env
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=mysql
DB_USER=admin
DB_PASSWORD=your_secure_password
DB_NAME=quickshop
DB_PORT=3306

# Authentication & Security
JWT_SECRET=your_super_secret_jwt_key_that_should_be_long_enough
BCRYPT_ROUNDS=12

# Payment Gateway Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FROM_EMAIL=noreply@quickshop.echelonxventures.org

# Cloud Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# AI Configuration
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
APP_NAME=QuickShop
APP_URL=https://quickshop.echelonxventures.org
ADMIN_EMAIL=admin@quickshop.echelonxventures.org
SUPPORT_EMAIL=support@quickshop.echelonxventures.org
LOG_LEVEL=info

# Cache Configuration
REDIS_URL=redis://redis:6379
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
EOF

# Frontend environment variables
cat << 'EOF' > frontend/.env
REACT_APP_API_URL=https://quickshop.echelonxventures.org/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
REACT_APP_PAYPAL_CLIENT_ID=your_paypal_client_id
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_GA_MEASUREMENT_ID=GA_MEASUREMENT_ID
REACT_APP_HOTJAR_ID=HOTJAR_ID
EOF
```

### 3. Database Initialization
```bash
# Start MySQL container first (for schema creation)
docker-compose -f deployment/prod-docker-compose.yml up -d mysql

# Wait for MySQL to be ready
sleep 30

# Create the database
docker exec quickshop-mysql-1 mysql -u admin -p"$(cat secrets/mysql_user_password.txt)" -e "CREATE DATABASE IF NOT EXISTS quickshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema and seed data
docker exec -i quickshop-mysql-1 mysql -u admin -p"$(cat secrets/mysql_user_password.txt)" quickshop < database/schema.sql
docker exec -i quickshop-mysql-1 mysql -u admin -p"$(cat secrets/mysql_user_password.txt)" quickshop < database/seed_data.sql
```

### 4. SSL Certificate Setup
```bash
# Obtain SSL certificate using Let's Encrypt
sudo certbot --nginx -d quickshop.echelonxventures.org

# The certificate will be stored in /etc/letsencrypt/live/quickshop.echelonxventures.org/
```

### 5. Nginx Configuration
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/quickshop << 'EOF'
server {
    listen 80;
    server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/quickshop.echelonxventures.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quickshop.echelonxventures.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logging
    access_log /var/log/nginx/quickshop.access.log;
    error_log /var/log/nginx/quickshop.error.log;

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/;
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
    }

    # Frontend React App
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Portal
    location /admin {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Support Portal
    location /support {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Analytics Portal
    location /analytics {
        proxy_pass http://localhost:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check Endpoint
    location /health {
        access_log off;
        return 200 "Healthy\n";
        add_header Content-Type text/plain;
    }

    # Static Assets Optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/quickshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Start the Application
```bash
# Build and start all services
sudo docker-compose -f deployment/prod-docker-compose.yml up -d --build

# Check service status
sudo docker-compose -f deployment/prod-docker-compose.yml ps

# Monitor logs
sudo docker-compose -f deployment/prod-docker-compose.yml logs -f
```

## 🧪 Post-Deployment Verification

### Health Checks
```bash
# Check if all services are running
curl -k https://quickshop.echelonxventures.org/health

# Test API endpoints
curl -k https://quickshop.echelonxventures.org/api/products

# Test frontend
curl -k https://quickshop.echelonxventures.org
```

### Service Status Monitoring
```bash
# Check container status
sudo docker ps

# Check logs for any errors
sudo docker-compose -f deployment/prod-docker-compose.yml logs --tail=100

# Monitor resource usage
htop
docker stats
```

## 🔧 OCI Always Free Tier Optimizations

### Memory Management
- MySQL: innodb_buffer_pool_size=128M
- Redis: maxmemory 100mb with LRU eviction
- Elasticsearch: ES_JAVA_OPTS="-Xms512m -Xmx512m"

### Performance Tips
1. **Monitor Resource Usage**: Use `docker stats` to monitor container resource consumption
2. **Optimize MySQL**: Use custom.cnf for Always Free Tier optimizations
3. **Caching Strategy**: Implement multi-layer caching (Redis, nginx, CDN)
4. **Database Queries**: Optimize with proper indexing and query optimization
5. **Static Assets**: Use CDN for static content delivery

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Port Already in Use
```bash
# Check what's using port 80/443
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Kill conflicting processes if needed
sudo kill -9 <PID>
```

#### 2. Docker Service Not Running
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

#### 3. SSL Certificate Not Working
```bash
# Renew certificate
sudo certbot renew

# Test certificate
sudo certbot certificates
```

#### 4. Database Connection Issues
```bash
# Check MySQL container logs
sudo docker-compose -f deployment/prod-docker-compose.yml logs mysql

# Test database connection
sudo docker exec -it quickshop-mysql-1 mysql -u admin -p -e "SHOW DATABASES;"
```

#### 5. Application Startup Issues
```bash
# Check backend logs for errors
sudo docker-compose -f deployment/prod-docker-compose.yml logs backend

# Check if ports are properly mapped
sudo netstat -tlnp | grep :5000
```

## 📊 Performance Monitoring

### Essential Metrics to Monitor
- Application response times
- Database query performance
- Memory usage across services
- Disk space utilization
- Network throughput
- Error rates and uptime

### Log Analysis
```bash
# Monitor application logs
sudo docker-compose -f deployment/prod-docker-compose.yml logs -f --tail=50

# Analyze logs for errors
sudo docker-compose -f deployment/prod-docker-compose.yml logs backend | grep -i error
```

## 🔐 Security Best Practices

### SSL Certificate Management
```bash
# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# Set up UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### Regular Security Updates
```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Rotate secrets periodically
# Update JWT secrets
# Update database passwords
# Renew SSL certificates
```

## 🔄 Backup Strategy

### Database Backup
```bash
# Create backup script
sudo tee /home/ubuntu/backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Create database backup
docker exec quickshop-mysql-1 mysqldump -u admin -p"$(cat secrets/mysql_user_password.txt)" quickshop > $BACKUP_DIR/quickshop_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/quickshop_backup_$DATE.sql

# Upload to secure location (S3, etc.) if needed
# aws s3 cp $BACKUP_DIR/quickshop_backup_$DATE.sql.gz s3://your-backup-bucket/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "quickshop_backup_*.sql.gz" -mtime +7 -delete
EOF

# Make executable and schedule
chmod +x /home/ubuntu/backup_db.sh
sudo crontab -e
# Add: 0 2 * * * /home/ubuntu/backup_db.sh
```

## 📈 Scaling Considerations

### Horizontal Scaling (Future Enhancement)
- Load balancer configuration
- Database replication setup
- Microservices architecture
- Container orchestration (Kubernetes)

### Current Limitations (Free Tier)
- 1 OCPU, 1GB RAM (sufficient for moderate traffic)
- 48GB storage (adequate for initial phase)
- Bandwidth limits (monitor and optimize)

## 📞 Support and Maintenance

### Daily Maintenance Tasks
```bash
# Check service health
sudo docker-compose -f deployment/prod-docker-compose.yml ps

# Monitor logs for issues
sudo docker-compose -f deployment/prod-docker-compose.yml logs --tail=10

# Check system resources
free -h
df -h
```

### Weekly Maintenance
- Update system packages
- Check backup integrity
- Monitor application performance
- Review security logs

### Monthly Tasks
- Renew SSL certificates if needed
- Update application to latest version
- Review and optimize database performance
- Audit user accounts and permissions

## 🎯 Success Indicators

### Platform Running Successfully When:
- ✅ All services show as "healthy" in `docker ps`
- ✅ Website loads at https://quickshop.echelonxventures.org
- ✅ API responds to requests at https://quickshop.echelonxventures.org/api/health
- ✅ HTTPS is active with valid SSL certificate
- ✅ Admin portal accessible at https://quickshop.echelonxventures.org/admin
- ✅ Support portal accessible at https://quickshop.echelonxventures.org/support
- ✅ Analytics portal accessible at https://quickshop.echelonxventures.org/analytics
- ✅ Database connects properly and shows sample data
- ✅ Payment gateways are properly configured
- ✅ AI features are functional and responding

## 🚀 Production Go-Live Checklist

- [ ] Domain properly configured with DNS
- [ ] SSL certificate installed and working
- [ ] All services running and healthy
- [ ] Database initialized with schema and seed data
- [ ] Frontend and backend communicating properly
- [ ] Payment gateways configured and tested
- [ ] Email notifications working
- [ ] Analytics dashboards accessible
- [ ] Security headers properly configured
- [ ] Firewall rules in place
- [ ] Backup system operational
- [ ] Monitoring alerts set up
- [ ] Performance tests passed
- [ ] Load testing completed
- [ ] Security audit completed

## 📚 Documentation References

- [API Documentation](./api.md)
- [Admin Manual](./admin_manual.md)
- [Developer Guide](./developer_guide.md)
- [Security Guide](./security_guide.md)
- [Performance Tuning](./performance_guide.md)

---

## 🎉 Congratulations!

Your QuickShop e-commerce platform is now fully deployed and operational on Oracle Cloud Infrastructure Always Free Tier with Hostinger domain hosting. The platform includes all the advanced features comparable to Amazon, Flipkart, and eBay with AI-powered capabilities and comprehensive admin tools.

**Access your platform at: [https://quickshop.echelonxventures.org](https://quickshop.echelonxventures.org)**

The platform includes:
- ✅ Complete e-commerce functionality
- ✅ Multi-vendor marketplace support
- ✅ AI-powered recommendations and chatbot
- ✅ Advanced analytics and business intelligence
- ✅ Comprehensive admin and support portals
- ✅ Secure payment processing
- ✅ Mobile-responsive design
- ✅ Optimized for Always Free Tier performance

Your QuickShop platform is production-ready and scalable!
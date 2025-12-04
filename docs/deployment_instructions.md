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
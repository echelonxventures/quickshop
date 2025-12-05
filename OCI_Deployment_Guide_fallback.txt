# QuickShop E-commerce Platform - Complete Deployment Guide

## Table of Contents
- [1. Introduction](#1-introduction)
- [2. Infrastructure Setup](#2-infrastructure-setup)
- [3. Database Configuration](#3-database-configuration)
- [4. Domain Configuration](#4-domain-configuration)
- [5. Backend Deployment](#5-backend-deployment)
- [6. Frontend Deployment](#6-frontend-deployment)
- [7. SSL Configuration](#7-ssl-configuration)
- [8. Auto-deployment Setup](#8-auto-deployment-setup)
- [9. Final Integration](#9-final-integration)
- [10. Resources](#10-resources)

---

## 1. Introduction {#1-introduction}

Welcome to the complete deployment guide for QuickShop, a modern, AI-powered e-commerce platform. This guide will walk you through setting up your application on Oracle Cloud Infrastructure (OCI) using the Always Free Tier, with proper networking, database, and deployment automation.

### Project Overview
QuickShop is a comprehensive e-commerce solution featuring:
- Multi-vendor marketplace
- AI-powered recommendations
- Advanced analytics dashboard
- Mobile-responsive design
- Payment gateway integrations
- Customer support system

### Requirements
- Oracle Cloud Infrastructure account (Always Free Tier)
- Domain name (already registered with Hostinger)
- Basic Linux command-line knowledge
- Git and GitHub access

---

## 2. Infrastructure Setup {#2-infrastructure-setup}

### 2.1 Virtual Cloud Network (VCN) Configuration

#### Creating the VCN

1. **Log into OCI Console**
   - Navigate to [OCI Console](https://cloud.oracle.com)
   - Sign in with your account credentials

2. **Navigate to Virtual Cloud Networks**
   - In the left navigation pane, under "Networking", click "Virtual Cloud Networks"

3. **Create VCN**
   - Click "Create Virtual Cloud Network"
   - Fill in the following details:
     - **Name**: `myvnc`
     - **Compartment**: Select your root compartment or a specific compartment
     - **Create Virtual Cloud Network**: "VCN with Internet Connectivity"
     - **CIDR Block**: `10.0.0.0/16`

4. **Configure Subnets and Gateways**
   - The wizard will automatically create:
     - Route table with internet gateway
     - Security list with default rules
     - DHCP options with default DNS

#### VCN Details
- **Name**: myvnc
- **CIDR Block**: 10.0.0.0/16

### 2.2 Public Subnet Setup

#### Creating Public Subnet

1. **In your VCN details page**, click on "Subnets"
2. **Click "Create Subnet"**
3. **Fill in the following details**:
   - **Subnet Type**: Regional
   - **Name**: `public-subnet-myvnc`
   - **CIDR Block**: `10.0.0.0/24`
   - **Route Table**: Default route table (with internet gateway)
   - **Subnet Access**: Public Subnet
   - **DHCP Options**: Default DHCP options
   - **DNS Resolution**: Use VCN DNS hostname
   - **Security Lists**: Create new or use default

#### Public Subnet Details
- **Name**: public-subnet-myvnc
- **CIDR Block**: 10.0.0.0/24
- **Access**: Public (has internet gateway)
- **Purpose**: Hosts public-facing applications and load balancers

### 2.3 Private Subnet Setup

#### Creating Private Subnet

1. **In your VCN details page**, click on "Subnets"
2. **Click "Create Subnet"**
3. **Fill in the following details**:
   - **Subnet Type**: Regional
   - **Name**: `private-subnet-myvnc`
   - **CIDR Block**: `10.0.1.0/24`
   - **Route Table**: Create custom route table with NAT Gateway
   - **Subnet Access**: Private Subnet
   - **DHCP Options**: Default DHCP options
   - **DNS Resolution**: Use VCN DNS hostname
   - **Security Lists**: Create new or use default

#### Private Subnet Details
- **Name**: private-subnet-myvnc
- **CIDR Block**: 10.0.1.0/24
- **Access**: Private (no direct internet access)
- **Purpose**: Hosts database and internal services

### 2.4 Security Rules Configuration

#### Public Subnet Security List Rules

**Ingress Rules (Inbound)**:
1. **For HTTP traffic**:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `80`

2. **For HTTPS traffic**:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `443`

3. **For SSH traffic**:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0` *(More restrictive: your IP range)*
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `22`

4. **For custom application**:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `5000`

#### Private Subnet Security List Rules

**Ingress Rules (Inbound)**:
1. **For MySQL traffic**:
   - **Source Type**: CIDR
   - **Source CIDR**: `10.0.0.0/16`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `3306`

2. **For custom application**:
   - **Source Type**: CIDR
   - **Source CIDR**: `10.0.0.0/24`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `5000`

3. **For Redis traffic**:
   - **Source Type**: CIDR
   - **Source CIDR**: `10.0.0.0/16`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `6379`

**Egress Rules (Outbound)**:
1. **For internet access**:
   - **Destination Type**: CIDR
   - **Destination CIDR**: `0.0.0.0/0`
   - **IP Protocol**: All
   - **Destination Port Range**: All

### 2.5 Compute Instance Setup

#### Creating the Instance

1. **Navigate to "Compute"** in the OCI console
2. **Click "Instances"**
3. **Click "Create Instance"**
4. **Fill in the following details**:
   - **Name**: `quickshop`
   - **Placement**: Choose any availability domain
   - **Image**: Canonical Ubuntu 24.04
   - **Shape**: VM.Standard.E4.Flex (for Always Free Tier)
   - **OCPUs**: 1
   - **Memory**: 1 GB (minimum for Always Free Tier)
   - **Boot Volume**: 50 GB (minimum for Always Free Tier)

5. **Networking Configuration**:
   - **VNIC**: Primary VNIC
   - **Subnet**: Select your public subnet (`public-subnet-myvnc`)
   - **Assign a public IP**: Yes

6. **Add SSH Keys**:
   - **Paste your public SSH key** in the provided field
   - Or upload your public key file

7. **Create the instance** by clicking "Create"

#### Instance Details
- **Name**: quickshop
- **Public IP**: 141.148.196.251
- **Private IP**: 10.0.0.172
- **Operating System**: Canonical Ubuntu 24.04

---

## 3. Database Configuration {#3-database-configuration}

### 3.1 Setting up OCI MySQL Heatwave (Always Free Tier)

#### Prerequisites for MySQL Setup
Before creating your MySQL database, ensure you have:
- Selected the appropriate compartment in OCI
- Made sure the private subnet (`private-subnet-myvnc`) is created in the same availability domain

#### Creating MySQL Heatwave Database

1. **Navigate to "MySQL"** in the OCI console
   - From the OCI dashboard, search for "MySQL Database Systems" or find it under "Database" services

2. **Click "Create MySQL Database System"**
   - On the MySQL Database Systems page, click the "Create MySQL DB System" button

3. **Choose "Free Tier" option**
   - In the creation page, select "Free Tier" as the DB System Type
   - Note: Free tier provides 1 OCPU and 1 GB memory with 50 GB storage

4. **Fill in the required details**:

   **Database System Information**:
   - **Display Name**: `my-mysql-db`
   - **DB System Identifier**: `my-mysql-db` (must be unique in your region)
   - **Description**: "QuickShop database for production"
   - **Compartment**: Select your compartment (typically root compartment or dedicated compartment)
   - **Availability Domain**: Select any available AD in your region
   - **Fault Domain**: Default (can select any)

   **MySQL Configuration**:
   - **Shape**: VM.Standard.E4.Flex (with 1 OCPU and 1 GB memory for free tier)
   - **MySQL Version**: MySQL 8.0.x (latest available in free tier)
   - **Admin Username**: `admin` (default, you can change if needed)
   - **Admin Password**: Create a strong password that meets requirements:
     - At least 8 characters
     - Contains uppercase, lowercase, number, and special character
   - **Confirm Password**: Re-enter your strong password

   **Network Configuration**:
   - **Virtual Cloud Network Compartment**: Same compartment as VCN
   - **Virtual Cloud Network**: `myvnc`
   - **Client Subnet Compartment**: Same compartment
   - **Client Subnet**: `private-subnet-myvnc` (your private subnet)
   - **Is Private?**: Yes (should be in private subnet)
   - **Port for MySQL**: 3306 (default)

5. **Review and Create**:
   - Verify all settings before clicking "Create"
   - Provisioning takes approximately 10-15 minutes

6. **Wait for provisioning**:
   - The DB system status will change from "Creating" to "Active"
   - Note the private IP address assigned (will be in the 10.0.1.x range)

#### Database Connection Details
- **DB System Identifier**: my-mysql-db
- **Private IP**: Will be assigned during creation (e.g., 10.0.1.23)
- **Username**: admin
- **Port**: 3306
- **Connection Type**: Internal (within the same VCN)

#### Connecting to MySQL from Your Instance

1. **Access your compute instance** via SSH:
   ```bash
   ssh -i your_private_key.pem ubuntu@141.148.196.251
   ```

2. **Install MySQL client** on your instance:
   ```bash
   sudo apt update
   sudo apt install mysql-client -y
   ```

3. **Test the connection** to your MySQL database (use the actual private IP assigned to your DB):
   ```bash
   mysql -h 10.0.1.23 -u admin -p
   ```

4. **Alternative connection command** with full details:
   ```bash
   mysql -h 10.0.1.23 -P 3306 -u admin -p
   ```

#### Important MySQL Configuration Notes
- The MySQL instance is in a private subnet and can only be accessed from other resources in the same VCN
- The root password cannot be retrieved once created, so store it securely
- The free tier has limitations on CPU and memory usage

### 3.2 Database Schema Setup

1. **Clone the QuickShop repository** on your compute instance:
   ```bash
   git clone https://github.com/echelonxventures/quickshop.git
   cd quickshop
   ```

2. **Navigate to the database directory** to check schema files:
   ```bash
   ls database/
   ```
   You should see `schema.sql` and `seed_data.sql` files

3. **Create the database** on your MySQL instance:
   ```bash
   mysql -h 10.0.1.23 -u admin -p -e "CREATE DATABASE quickshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

4. **Import schema** (database structure):
   ```bash
   mysql -h 10.0.1.23 -u admin -p quickshop < database/schema.sql
   ```

5. **Import seed data** (sample data):
   ```bash
   mysql -h 10.0.1.23 -u admin -p quickshop < database/seed_data.sql
   ```

6. **Verify the database was created**:
   ```bash
   mysql -h 10.0.1.23 -u admin -p -e "SHOW DATABASES LIKE 'quickshop';"
   ```

7. **Check tables were created**:
   ```bash
   mysql -h 10.0.1.23 -u admin -p -e "USE quickshop; SHOW TABLES;"
   ```

### 3.3 Database Connection Testing from Application

1. **Test connection from backend code**:
   ```bash
   cd ~/quickshop/backend
   ```

2. **Create a simple connection test**:
   ```bash
   nano test-db-connection.js
   ```

   **Add the following test code**:
   ```javascript
   const mysql = require('mysql2/promise');

   const connectionConfig = {
     host: '10.0.1.23',  // Replace with your actual private IP
     user: 'admin',
     password: 'your_admin_password',
     database: 'quickshop',
     port: 3306,
     connectTimeout: 60000, // 60 seconds
     acquireTimeout: 60000,
     timeout: 60000,
   };

   async function testConnection() {
     try {
       console.log('Attempting to connect to MySQL database...');
       const connection = await mysql.createConnection(connectionConfig);

       console.log('Connected to MySQL database successfully!');

       // Test query
       const [rows] = await connection.execute('SELECT 1 + 1 AS solution');
       console.log('Test query result:', rows[0]);

       await connection.end();
       console.log('Connection closed.');
     } catch (error) {
       console.error('Connection failed:', error.message);
     }
   }

   testConnection();
   ```

3. **Install required package** for the test:
   ```bash
   npm install mysql2
   ```

4. **Run the test**:
   ```bash
   node test-db-connection.js
   ```

5. **Clean up** after testing:
   ```bash
   rm test-db-connection.js
   ```

---

## 4. Domain Configuration {#4-domain-configuration}

### 4.1 Configuring Domain with Hostinger

#### Prerequisites
- Access to your Hostinger account
- Domain already registered: `quickshop.echelonxventures.org`
- Public IP of your OCI instance: `141.148.196.251`

#### Step-by-Step Domain Configuration

1. **Log in to your Hostinger account**
   - Navigate to [Hostinger Customer Panel](https://www.hostinger.com/cpanel)
   - Enter your login credentials (email and password)
   - Click "Log In"

2. **Access Domain Management**
   - In the dashboard, find and click on "Domains" in the main navigation
   - Or look for "Domain Management" in the side panel
   - You should see a list of your domains

3. **Select your domain**
   - Find `quickshop.echelonxventures.org` in the domain list
   - Click on the domain name or the "Manage" button next to it
   - This will take you to the domain management page

#### DNS Configuration Setup

**A Record Configuration**:
1. **Navigate to DNS Management**
   - Once in the domain management page, look for "DNS Management", "DNS Records", or "Zone Editor"
   - Click on the appropriate option to access DNS records

2. **Locate and modify A record for root domain**:
   - Find the A record with **Name** or **Host** as `@` or `(none)` or `quickshop.echelonxventures.org.`
   - **Current IP**: May be a placeholder or existing IP
   - **Change To**: `141.148.196.251`
   - **TTL**: Keep as default (usually 14400 or 1 hour) or set to 300 for faster propagation if needed
   - Click "Save", "Update", or the checkmark button

3. **Locate and modify A record for www subdomain**:
   - Find the A record with **Name** or **Host** as `www` or `www.quickshop.echelonxventures.org.`
   - **Current IP**: May be a placeholder or existing IP
   - **Change To**: `141.148.196.251`
   - **TTL**: Keep as default or set to 300
   - Click "Save", "Update", or the checkmark button

4. **Add additional A records if needed**:
   - If you plan to have other subdomains like `api.quickshop.echelonxventures.org` or `admin.quickshop.echelonxventures.org`
   - Create additional A records with:
     - **Name/Host**: `api` (for api.quickshop.echelonxventures.org)
     - **Type**: A
     - **Value/Points to**: `141.148.196.251`
     - **TTL**: Default

#### Additional DNS Records (Optional but Recommended)

**MX Records for Email** (if you plan to use email hosting):
- Keep existing MX records or configure according to your email provider's requirements

**TXT Records for Domain Verification** (if needed later):
- You may need to add TXT records for Google Workspace, email verification, or other services

#### DNS Propagation and Verification

**Check DNS Records**:
1. **Use online DNS checker tools**:
   - Visit [DNS Checker](https://dnschecker.org/) or [What's My DNS](https://www.whatsmydns.net/)
   - Enter `quickshop.echelonxventures.org` and check A record status
   - Select multiple locations to verify global propagation

2. **Command line verification** (from your local machine):
   ```bash
   # Check A record
   nslookup quickshop.echelonxventures.org
   # Or
   dig quickshop.echelonxventures.org A
   # Or
   ping quickshop.echelonxventures.org
   ```

**Propagation Timeline**:
- **Initial propagation**: 1-4 hours for most regions
- **Complete global propagation**: Up to 24-48 hours in rare cases
- **TTL factor**: Lower TTL values result in faster propagation

#### Testing Domain Access

1. **Test HTTP access** (after DNS propagation):
   - Open a web browser
   - Navigate to `http://quickshop.echelonxventures.org`
   - You should see your application or a placeholder page

2. **Test with curl** from command line:
   ```bash
   curl -I http://quickshop.echelonxventures.org
   ```
   You should see HTTP headers indicating the server is responding

3. **Check IP resolution**:
   ```bash
   ping quickshop.echelonxventures.org
   ```
   Should return `141.148.196.251`

#### Common Issues and Troubleshooting

**DNS Not Resolving**:
- Ensure you've saved the DNS changes in Hostinger
- Wait for DNS propagation (can take up to 48 hours)
- Clear your browser cache and DNS cache on your machine:
  ```bash
  # On Windows
  ipconfig /flushdns

  # On Mac/Linux
  sudo dscacheutil -flushcache  # Mac
  sudo systemd-resolve --flush-caches  # Linux with systemd
  sudo /etc/init.d/dns-clean start  # Other Linux
  ```

**Wrong IP Address**:
- Double-check that you entered the correct public IP: `141.148.196.251`
- Verify the A records in Hostinger panel match this IP

**Mixed Content Issues**:
- Initially test with HTTP until SSL is configured
- After SSL setup, all traffic should redirect to HTTPS

---

## 5. Backend Deployment {#5-backend-deployment}

### 5.1 Server Preparation

1. **SSH into your OCI instance**:
   ```bash
   ssh -i your_private_key.pem ubuntu@141.148.196.251
   ```

   **Note**: Replace `your_private_key.pem` with the path to your actual SSH private key file

2. **Update the system**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Install required packages for build tools**:
   ```bash
   sudo apt install curl git build-essential libtool-bin autoconf automake pkg-config libssl-dev -y
   ```

4. **Verify available disk space**:
   ```bash
   df -h
   ```
   Ensure you have at least 2GB of free space for the application and dependencies

### 5.2 Node.js and PM2 Installation

1. **Install Node.js using NodeSource repository** (LTS version recommended):
   ```bash
   # Check current LTS version at https://nodejs.org/
   # As of late 2024, Node.js 20.x LTS is recommended
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Verify Node.js installation**:
   ```bash
   node --version
   npm --version
   ```

   You should see Node.js version 20.x.x and npm version 10.x.x

3. **Update npm to latest version** (recommended):
   ```bash
   sudo npm install -g npm@latest
   ```

4. **Install PM2 globally**:
   ```bash
   sudo npm install -g pm2
   ```

5. **Start PM2 on system boot**:
   ```bash
   pm2 startup
   sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
   pm2 save
   ```

6. **Verify PM2 installation**:
   ```bash
   pm2 --version
   ```

### 5.3 Backend Application Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/echelonxventures/quickshop.git
   cd quickshop
   ```

2. **Switch to the correct branch** (if not main):
   ```bash
   # Check available branches
   git branch -a

   # Switch to main or production branch if different
   git checkout main  # or git checkout production
   ```

3. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

4. **Install backend dependencies**:
   ```bash
   npm install
   ```

   **Note**: This may take several minutes depending on your internet connection

5. **Check for existing .env file**:
   ```bash
   ls -la .env*
   ```

   If .env doesn't exist, copy from example:
   ```bash
   cp .env.example .env
   ```

6. **Configure environment variables**:
   ```bash
   nano .env
   ```

   **Key settings for production** (replace placeholder values with actual values):
   ```env
   # Application Configuration
   NODE_ENV=production
   PORT=5000
   HOST=0.0.0.0
   APP_NAME=QuickShop
   APP_VERSION=1.0.0
   APP_URL=https://quickshop.echelonxventures.org

   # Database Configuration
   DB_HOST=10.0.1.23  # Private IP of your MySQL instance
   DB_USER=admin
   DB_PASSWORD=your_actual_mysql_password  # Replace with your actual password
   DB_NAME=quickshop
   DB_PORT=3306
   DB_SSL_MODE=DISABLED  # For free tier MySQL, SSL may not be available

   # Authentication & Security
   JWT_SECRET=replace_with_very_long_secret_string_at_least_32_characters_long_for_security
   JWT_EXPIRE=7d
   BCRYPT_ROUNDS=12

   # Redis Configuration (if using Redis on the same instance)
   REDIS_URL=redis://localhost:6379
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=  # Leave empty if no password

   # Email Configuration (for production - configure with your provider)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password  # Use app password for Gmail
   FROM_EMAIL=noreply@quickshop.echelonxventures.org
   FROM_NAME=QuickShop

   # Payment Gateway Configuration
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   PAYPAL_CLIENT_ID=your_paypal_client_id
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Cloud Storage Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # AI/ML Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Security Configuration
   CORS_ORIGIN=https://quickshop.echelonxventures.org
   TRUST_PROXY=1

   # Logging Configuration
   LOG_LEVEL=info
   LOG_FILE_SIZE=10m
   LOG_FILE_COUNT=5

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   RATE_LIMIT_MAX=100

   # File Upload Configuration
   MAX_FILE_SIZE=10485760  # 10MB
   UPLOAD_DIR=./uploads
   ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
   ```

7. **Create required directories**:
   ```bash
   mkdir -p uploads logs
   sudo chown -R ubuntu:ubuntu uploads logs
   sudo chmod -R 755 uploads logs
   ```

8. **Test the application locally** (before using PM2):
   ```bash
   node server.js
   ```

   **Note**: Press `Ctrl+C` to stop the application after testing

9. **Set up PM2 configuration file** (in the main quickshop directory):
   ```bash
   cd ..
   nano ecosystem.config.js
   ```

   **Content for ecosystem.config.js**:
   ```javascript
   module.exports = {
     apps: [{
       name: 'quickshop-backend',
       script: './backend/server.js',
       instances: 1, // For free tier, limit to 1 instance to save memory
       exec_mode: 'fork', // Use fork mode instead of cluster for simpler memory usage
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       },
       error_file: './backend/logs/err.log',
       out_file: './backend/logs/out.log',
       log_file: './backend/logs/combined.log',
       time: true,
       max_memory_restart: '512M', // Restart if memory usage exceeds 512MB
       node_args: '--max-old-space-size=512', // Limit node memory usage for free tier
       watch: false, // Don't watch for changes in production
       ignore_watch: ['node_modules', 'logs', '.git'],
       exp_backoff_restart_delay: 100, // Restart quickly if crashes
       max_restarts: 30, // Max restarts per minute
       min_uptime: '10s' // App needs to be up for at least 10s to be considered started
     }]
   };
   ```

10. **Create logs directory in backend folder**:
    ```bash
    mkdir -p backend/logs
    ```

11. **Start the backend application with PM2**:
    ```bash
    pm2 start ecosystem.config.js
    ```

12. **Verify the application is running**:
    ```bash
    pm2 status
    pm2 logs quickshop-backend --lines 20
    ```

13. **Test the backend**:
    ```bash
    curl http://localhost:5000/health
    # Should return: {"status":"OK","timestamp":"2024-12-05T10:30:00.000Z"}
    ```

### 5.4 Backend Production Configuration

1. **Monitor memory usage**:
   ```bash
   pm2 monit
   ```
   Press `Ctrl+C` to exit monitoring

2. **Set up log rotation** (to prevent logs from consuming all disk space):
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 5
   pm2 set pm2-logrotate:compress true
   ```

3. **Configure firewall to allow backend port** (if UFW is enabled):
   ```bash
   sudo ufw allow 5000
   sudo ufw reload
   ```

4. **Test external access** (from your local machine):
   ```bash
   curl http://141.148.196.251:5000/health
   ```

5. **Create a health check script** for monitoring:
   ```bash
   nano ~/backend-health-check.sh
   ```

   **Content for health check script**:
   ```bash
   #!/bin/bash
   # Backend health check script

   # Check if PM2 process is running
   if pm2 status | grep -q "quickshop-backend.*online"; then
       echo "$(date): Backend is running"

       # Test API endpoint
       response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
       if [ "$response" = "200" ]; then
           echo "$(date): Backend API is responding correctly (Status: $response)"
       else
           echo "$(date): Backend API is not responding correctly (Status: $response)"
           # Optionally restart the service
           # pm2 restart quickshop-backend
       fi
   else
       echo "$(date): Backend is not running, attempting restart"
       pm2 start quickshop-backend
   fi
   ```

   Make the script executable:
   ```bash
   chmod +x ~/backend-health-check.sh
   ```

6. **Set up a cron job** for periodic health checks (optional):
   ```bash
   crontab -e
   ```

   Add this line to run health check every 5 minutes:
   ```
   */5 * * * * /home/ubuntu/backend-health-check.sh >> /home/ubuntu/backend-health.log 2>&1
   ```

### 5.5 Database Connection Verification

1. **Test database connection from backend**:
   ```bash
   cd ~/quickshop/backend
   # Install a simple test script
   npm install mysql2
   ```

2. **Create a database connection test**:
   ```bash
   nano test-connection.js
   ```

   **Content for test-connection.js**:
   ```javascript
   const mysql = require('mysql2/promise');
   require('dotenv').config();

   // Use the same connection parameters as your .env file
   const dbConfig = {
     host: process.env.DB_HOST || '10.0.1.23',
     user: process.env.DB_USER || 'admin',
     password: process.env.DB_PASSWORD || 'your_password',
     database: process.env.DB_NAME || 'quickshop',
     port: process.env.DB_PORT || 3306,
     connectTimeout: 60000,
     acquireTimeout: 60000,
     timeout: 60000,
   };

   async function testConnection() {
     try {
       console.log('Testing database connection...');
       const connection = await mysql.createConnection(dbConfig);

       console.log('✓ Successfully connected to database');

       // Test with a simple query
       const [rows] = await connection.execute('SELECT NOW() as currentTime');
       console.log('✓ Database query executed successfully:', rows[0]);

       await connection.end();
       console.log('✓ Connection closed successfully');
     } catch (error) {
       console.error('✗ Database connection failed:', error.message);
       process.exit(1);
     }
   }

   testConnection();
   ```

3. **Run the database test**:
   ```bash
   node test-connection.js
   ```

4. **Clean up**:
   ```bash
   rm test-connection.js
   ```

---

## 6. Frontend Deployment {#6-frontend-deployment}

### 6.1 Frontend Build Tools Installation

1. **Navigate to the quickshop directory**:
   ```bash
   cd ~/quickshop
   ```

2. **Install Node.js packages for frontend** (if not already done):
   ```bash
   cd frontend
   npm install
   ```

   **Note**: You may need to increase memory limits for build process on the free tier:
   ```bash
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm install
   ```

3. **Check for existing build files**:
   ```bash
   ls -la
   # Look for package.json, src/ directory, and public/ directory
   ```

4. **Configure frontend environment variables**:
   ```bash
   cp .env.example .env
   nano .env
   ```

   **Frontend environment variables**:
   ```env
   # Frontend Application Settings
   REACT_APP_API_URL=https://quickshop.echelonxventures.org/api
   REACT_APP_NAME=QuickShop
   REACT_APP_VERSION=1.0.0
   REACT_APP_ENV=production

   # Payment Gateway Configuration
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   REACT_APP_PAYPAL_CLIENT_ID=your_paypal_client_id

   # Analytics Configuration
   REACT_APP_GA_MEASUREMENT_ID=GA_MEASUREMENT_ID
   REACT_APP_HOTJAR_ID=HOTJAR_ID

   # Feature Flags
   REACT_APP_ENABLE_ANALYTICS=true
   REACT_APP_ENABLE_CHATBOT=true
   REACT_APP_ENABLE_REVIEWS=true
   ```

5. **Install build dependencies** (if needed):
   ```bash
   sudo apt update
   sudo apt install build-essential -y
   ```

### 6.2 Frontend Build Process

1. **Build the production version** with increased memory:
   ```bash
   # Set memory limit for build process
   export NODE_OPTIONS="--max_old_space_size=4096"

   # Build the application
   npm run build
   ```

   **Note**: This may take several minutes on the free tier instance. If the build fails due to memory issues, you may need to temporarily add swap space:
   ```bash
   # Add 1GB of swap space (temporary, will be removed after reboot)
   sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **Verify build was successful**:
   ```bash
   ls -la build/
   # Should show built files: index.html, static/, etc.
   ```

3. **Test the build locally** (optional, using a simple server):
   ```bash
   # Install a simple static server
   sudo npm install -g serve

   # Serve the build (in a separate terminal, test and close)
   # serve -s build -l 4000
   ```

### 6.3 Build Additional Applications

Since QuickShop has multiple portals, you need to build each one:

1. **Build Admin Portal**:
   ```bash
   cd ~/quickshop/admin_portal
   npm install
   cp .env.example .env
   # Configure admin portal environment variables
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm run build
   ```

2. **Build Support Portal**:
   ```bash
   cd ~/quickshop/support_portal
   npm install
   cp .env.example .env
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm run build
   ```

3. **Build Analytics Portal**:
   ```bash
   cd ~/quickshop/analytics_portal
   npm install
   cp .env.example .env
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm run build
   ```

4. **Build Seller Portal**:
   ```bash
   cd ~/quickshop/seller_portal
   npm install
   cp .env.example .env
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm run build
   ```

### 6.4 NGINX Installation and Configuration

1. **Install NGINX**:
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```

2. **Check NGINX status**:
   ```bash
   sudo systemctl status nginx
   ```

3. **Start and enable NGINX**:
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

4. **Check if NGINX is running**:
   ```bash
   sudo netstat -tlnp | grep :80
   ```

   You should see NGINX listening on port 80.

5. **Configure firewall for HTTP/HTTPS**:
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw reload
   ```

### 6.5 NGINX Configuration for QuickShop

1. **Create a dedicated configuration file**:
   ```bash
   sudo nano /etc/nginx/sites-available/quickshop
   ```

2. **Add comprehensive NGINX configuration**:
   ```nginx
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
       }

       # WebSocket connections for real-time features
       location /ws {
           proxy_pass http://backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Admin portal
       location /admin {
           alias /home/ubuntu/quickshop/admin_portal/build/;
           try_files $uri $uri/ @admin_fallback;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       location @admin_fallback {
           alias /home/ubuntu/quickshop/admin_portal/build/index.html;
       }

       # Seller portal
       location /seller {
           alias /home/ubuntu/quickshop/seller_portal/build/;
           try_files $uri $uri/ @seller_fallback;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       location @seller_fallback {
           alias /home/ubuntu/quickshop/seller_portal/build/index.html;
       }

       # Support portal
       location /support {
           alias /home/ubuntu/quickshop/support_portal/build/;
           try_files $uri $uri/ @support_fallback;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       location @support_fallback {
           alias /home/ubuntu/quickshop/support_portal/build/index.html;
       }

       # Analytics portal
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
   ```

3. **Test the configuration for syntax errors**:
   ```bash
   sudo nginx -t
   ```

   You should see "test is successful" if there are no errors.

4. **Enable the site configuration**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/quickshop /etc/nginx/sites-enabled/
   ```

5. **Disable the default NGINX site** (to avoid conflicts):
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

6. **Restart NGINX to apply changes**:
   ```bash
   sudo systemctl restart nginx
   ```

### 6.6 Frontend Deployment Verification

1. **Check NGINX status**:
   ```bash
   sudo systemctl status nginx
   ```

2. **Verify configuration**:
   ```bash
   sudo nginx -t
   ```

3. **Test site accessibility**:
   ```bash
   curl -I http://quickshop.echelonxventures.org
   ```

   You should see HTTP/1.1 200 OK or a redirect response.

4. **Check if the frontend files are being served**:
   ```bash
   curl -s http://quickshop.echelonxventures.org | head -20
   ```

   You should see the HTML structure of your frontend application.

5. **Test API proxy**:
   ```bash
   curl -I http://quickshop.echelonxventures.org/api/health
   ```

   This should return the backend health check response.

6. **Check NGINX error logs** if there are issues:
   ```bash
   sudo tail -f /var/log/nginx/quickshop_error.log
   ```

### 6.7 Common Frontend Deployment Issues and Solutions

**Build fails with memory issues**:
- Add temporary swap space as shown above
- Use `export NODE_OPTIONS="--max_old_space_size=4096"` before npm commands

**Static files not loading**:
- Verify file permissions: `ls -la ~/quickshop/frontend/build/`
- Check NGINX configuration paths: `sudo nginx -t`

**API calls not working**:
- Verify backend is running: `pm2 status`
- Check backend logs: `pm2 logs quickshop-backend`
- Verify NGINX proxy configuration

**SSL/HTTPS issues** (to be fixed in next section):
- Initially access via HTTP until SSL is configured
- Ensure all configurations will work with HTTPS after SSL setup

**Slow loading times**:
- Verify gzip compression is working in NGINX
- Check cache headers are properly set
- Optimize images and assets if needed

---

## 7. SSL Configuration {#7-ssl-configuration}

### 7.1 Install Certbot and SSL Prerequisites

1. **Update your system packages**:
   ```bash
   sudo apt update
   ```

2. **Install Certbot and the NGINX plugin**:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

3. **Verify installation**:
   ```bash
   certbot --version
   ```

4. **Ensure NGINX configuration is correct before SSL setup**:
   ```bash
   sudo nginx -t
   ```

5. **Restart NGINX if needed**:
   ```bash
   sudo systemctl restart nginx
   ```

### 7.2 SSL Certificate Configuration and Obtainment

1. **Verify domain is accessible via HTTP first** (important for certificate validation):
   ```bash
   curl -I http://quickshop.echelonxventures.org
   curl -I http://www.quickshop.echelonxventures.org
   ```

   Both should return 200 OK status.

2. **Run Certbot to obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d quickshop.echelonxventures.org -d www.quickshop.echelonxventures.org
   ```

3. **Follow the prompts during certificate setup**:
   - **Enter your email address**: Provide a valid email for security notices
   - **Agree to the Terms of Service**: Type 'A' or 'Y' to agree
   - **Share email with EFF (optional)**: Choose Y or N based on your preference
   - **Redirect HTTP to HTTPS**: Choose option 2 to redirect all traffic to HTTPS (recommended for security)

4. **Verify certificate was obtained successfully**:
   ```bash
   sudo ls -la /etc/letsencrypt/live/quickshop.echelonxventures.org/
   ```

   You should see: `cert.pem`, `chain.pem`, `fullchain.pem`, and `privkey.pem`

### 7.3 Certbot Configuration Verification

1. **Check the updated NGINX configuration**:
   ```bash
   sudo cat /etc/nginx/sites-enabled/quickshop
   ```

   You should see the configuration has been updated to include SSL settings.

2. **Test the NGINX configuration after SSL changes**:
   ```bash
   sudo nginx -t
   ```

3. **Restart NGINX to ensure SSL is properly configured**:
   ```bash
   sudo systemctl restart nginx
   ```

4. **Check the SSL certificate information**:
   ```bash
   sudo certbot certificates
   ```

### 7.4 SSL Security Enhancements

1. **Create Diffie-Hellman parameters for stronger encryption** (optional but recommended):
   ```bash
   sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
   ```

   **Note**: This may take 10-20 minutes to complete.

2. **Update NGINX configuration to include security enhancements**:
   ```bash
   sudo nano /etc/nginx/sites-available/quickshop
   ```

   Add SSL-related configuration before the server block or in the main config:
   ```nginx
   # Add these lines at the top of the file or in the main nginx.conf
   # SSL Security Parameters
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
   ssl_prefer_server_ciphers off;
   ssl_session_cache shared:SSL:10m;
   ssl_session_timeout 10m;
   ssl_session_tickets off;

   # OCSP Stapling
   ssl_stapling on;
   ssl_stapling_verify on;
   resolver 8.8.8.8 8.8.4.4 valid=300s;
   resolver_timeout 5s;
   ```

   Then modify your server configuration to include these SSL parameters:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;

       # SSL Configuration
       ssl_certificate /etc/letsencrypt/live/quickshop.echelonxventures.org/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/quickshop.echelonxventures.org/privkey.pem;
       ssl_trusted_certificate /etc/letsencrypt/live/quickshop.echelonxventures.org/chain.pem;

       # SSL Security Parameters
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
       ssl_session_tickets off;

       # HSTS (HTTP Strict Transport Security)
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

       # OCSP Stapling
       ssl_stapling on;
       ssl_stapling_verify on;
       resolver 8.8.8.8 8.8.4.4 valid=300s;
       resolver_timeout 5s;

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header Referrer-Policy "no-referrer-when-downgrade" always;
       add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

       # Rest of your configuration from the previous section...
   }
   ```

   **Note**: If you choose to manually edit the configuration, make sure to preserve the existing location blocks and backend proxy settings.

3. **If you manually edited the configuration, test and restart NGINX**:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 7.5 SSL Certificate Auto-Renewal Setup

1. **Test certificate renewal process** (without actually renewing):
   ```bash
   sudo certbot renew --dry-run
   ```

   This ensures the renewal process will work properly without actually updating your certificates.

2. **Set up automatic renewal with cron**:
   ```bash
   sudo crontab -e
   ```

3. **Add the following lines** to schedule renewal checks twice daily (recommended for Let's Encrypt):
   ```
   # Renew SSL certificates twice daily (at 2:30 AM and 2:30 PM)
   30 2,14 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
   ```

   Or use the traditional once-weekly approach:
   ```
   # Renew SSL certificates weekly on Sundays at 2:30 AM
   30 2 * * 0 /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
   ```

4. **Verify the cron job was added**:
   ```bash
   sudo crontab -l
   ```

### 7.6 SSL Configuration Verification

1. **Test SSL certificate installation**:
   ```bash
   echo | openssl s_client -connect quickshop.echelonxventures.org:443 2>/dev/null | openssl x509 -noout -dates
   ```

   This shows certificate validity dates.

2. **Test HTTPS site accessibility**:
   ```bash
   curl -I https://quickshop.echelonxventures.org
   ```

   You should see HTTP/1.1 200 OK or appropriate redirect response.

3. **Verify HTTP to HTTPS redirect**:
   ```bash
   curl -I http://quickshop.echelonxventures.org
   ```

   This should return a 301 or 302 redirect to HTTPS.

4. **Test SSL certificate details with online tools**:
   - Visit [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
   - Enter `quickshop.echelonxventures.org`
   - This provides detailed SSL configuration analysis

5. **Check backend API still works through proxy**:
   ```bash
   curl -I https://quickshop.echelonxventures.org/api/health
   ```

### 7.7 SSL Troubleshooting

**Certificate validation failures**:
- Ensure your domain DNS is properly configured
- Check if port 80 is accessible from external sources
- Verify firewall rules allow HTTP traffic

**Renewal failures**:
- Test renewal with: `sudo certbot renew --dry-run`
- Check cron logs: `sudo grep -i certbot /var/log/syslog`
- Ensure domain still resolves to your server

**Mixed content warnings**:
- Update all frontend code to use HTTPS URLs
- Ensure all API calls go through the correct proxy path
- Check browser console for mixed content errors

**NGINX SSL errors**:
- Check NGINX error logs: `sudo tail -f /var/log/nginx/error.log`
- Test configuration: `sudo nginx -t`
- Check certificate permissions: `sudo ls -la /etc/letsencrypt/live/`

### 7.8 Security Best Practices

1. **Regular monitoring**:
   - Set up alerts for certificate expiration
   - Monitor SSL/TLS configuration for security updates

2. **Backup certificates** (optional but recommended):
   ```bash
   sudo cp -r /etc/letsencrypt /home/ubuntu/letsencrypt-backup-$(date +%F)
   ```

3. **Keep Certbot updated**:
   ```bash
   sudo apt update && sudo apt upgrade certbot
   ```

---

## 8. Auto-deployment Setup {#8-auto-deployment-setup}

### 8.1 Preparing for Auto-Deployment

1. **Verify your GitHub repository**:
   - Ensure your repository is at: https://github.com/echelonxventures/quickshop.git
   - Verify you have admin access to configure webhooks
   - Check that your main branch is the default branch (usually "main" or "master")

2. **Install additional tools needed for deployment**:
   ```bash
   # Install Git if not already installed
   sudo apt install git -y

   # Ensure you have PM2 installed (should already be done)
   sudo npm install -g pm2

   # Install additional tools for deployment
   sudo apt install jq -y  # For JSON parsing
   ```

3. **Verify current working directory structure**:
   ```bash
   ls -la ~/quickshop/
   # Should show: backend/, frontend/, admin_portal/, seller_portal/, support_portal/, analytics_portal/, webhook/, deployment/, ecosystem.config.js
   ```

### 8.2 Webhook Server Implementation

1. **Create webhook server directory**:
   ```bash
   cd ~/quickshop
   mkdir -p webhook
   cd webhook
   ```

2. **Create package.json for webhook server**:
   ```bash
   nano package.json
   ```

   **Content for package.json**:
   ```json
   {
     "name": "quickshop-webhook-server",
     "version": "1.0.0",
     "description": "Webhook server for automatic deployment of QuickShop application",
     "main": "webhook-server.js",
     "scripts": {
       "start": "node webhook-server.js",
       "dev": "node webhook-server.js"
     },
     "dependencies": {
       "express": "^4.18.2",
       "crypto": "^1.0.1",
       "child_process": "^1.0.2",
       "pm2": "^5.3.0"
     },
     "keywords": ["webhook", "deployment", "github", "auto-deploy"],
     "author": "QuickShop Team",
     "license": "MIT"
   }
   ```

3. **Install webhook dependencies**:
   ```bash
   npm install
   ```

4. **Create a more robust webhook server**:
   ```bash
   nano webhook-server.js
   ```

   **Content for webhook-server.js**:
   ```javascript
   const express = require('express');
   const crypto = require('crypto');
   const { exec, spawn } = require('child_process');
   const fs = require('fs');
   const path = require('path');

   const app = express();

   // Use raw body for signature verification
   app.use('/webhook', express.raw({ type: 'application/json' }));

   // Parse JSON for other routes
   app.use(express.json());

   const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default_secret_for_testing';
   const DEPLOYMENT_SCRIPT = process.env.DEPLOYMENT_SCRIPT || '/home/ubuntu/quickshop/deployment/deploy.sh';
   const LOG_DIR = process.env.LOG_DIR || '/home/ubuntu/quickshop/logs';

   // Ensure log directory exists
   if (!fs.existsSync(LOG_DIR)) {
       fs.mkdirSync(LOG_DIR, { recursive: true });
   }

   // Verify GitHub webhook signature
   function verifySignature(payload, signature) {
       if (!signature) {
           return false;
       }

       const expectedSignature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET)
           .update(payload)
           .digest('hex');

       // Use timing-safe comparison
       return crypto.timingSafeEqual(
           Buffer.from(signature),
           Buffer.from(expectedSignature)
       );
   }

   // Log function
   function logMessage(message, type = 'INFO') {
       const timestamp = new Date().toISOString();
       const logEntry = `[${timestamp}] [${type}] ${message}\n`;
       console.log(logEntry.trim());

       // Write to log file
       const logFilePath = path.join(LOG_DIR, 'webhook.log');
       fs.appendFileSync(logFilePath, logEntry);
   }

   // Webhook endpoint
   app.post('/webhook', (req, res) => {
       const signature = req.headers['x-hub-signature-256'];

       logMessage('Received webhook request');

       if (!signature) {
           logMessage('No signature provided', 'ERROR');
           return res.status(401).send('No signature provided');
       }

       if (!verifySignature(req.body, signature)) {
           logMessage('Invalid signature', 'ERROR');
           return res.status(401).send('Invalid signature');
       }

       // Parse the webhook payload
       const payload = JSON.parse(req.body);

       // Only deploy on push to main branch
       if (payload.ref !== 'refs/heads/main' && payload.ref !== 'refs/heads/master') {
           logMessage(`Skipping deployment for branch: ${payload.ref}`, 'INFO');
           return res.status(200).send('Skipping deployment - not main/master branch');
       }

       logMessage(`Processing webhook for branch: ${payload.ref}`, 'INFO');

       // Execute deployment script
       const deploymentProcess = spawn('bash', [DEPLOYMENT_SCRIPT], {
           detached: true,
           stdio: ['ignore', 'pipe', 'pipe']
       });

       let stdout = '';
       let stderr = '';

       deploymentProcess.stdout.on('data', (data) => {
           stdout += data.toString();
           logMessage(`Deployment output: ${data.toString().trim()}`, 'INFO');
       });

       deploymentProcess.stderr.on('data', (data) => {
           stderr += data.toString();
           logMessage(`Deployment error: ${data.toString().trim()}`, 'ERROR');
       });

       deploymentProcess.on('close', (code) => {
           logMessage(`Deployment process exited with code: ${code}`, code === 0 ? 'INFO' : 'ERROR');

           if (code === 0) {
               res.status(200).send('Deployment triggered successfully');
           } else {
               res.status(500).send('Deployment failed');
           }
       });

       deploymentProcess.on('error', (error) => {
           logMessage(`Failed to start deployment: ${error.message}`, 'ERROR');
           res.status(500).send('Failed to start deployment process');
       });
   });

   // Health check endpoint
   app.get('/health', (req, res) => {
       res.status(200).json({
           status: 'OK',
           timestamp: new Date().toISOString(),
           service: 'Webhook Server'
       });
   });

   // Status endpoint
   app.get('/status', (req, res) => {
       res.status(200).json({
           status: 'RUNNING',
           webhook_secret_set: !!process.env.WEBHOOK_SECRET,
           deployment_script: DEPLOYMENT_SCRIPT,
           timestamp: new Date().toISOString()
       });
   });

   const PORT = process.env.PORT || 9000;

   app.listen(PORT, '0.0.0.0', () => {
       logMessage(`Webhook server running on port ${PORT}`, 'INFO');
       logMessage(`Webhook endpoint: http://0.0.0.0:${PORT}/webhook`, 'INFO');
   });

   // Graceful shutdown
   process.on('SIGTERM', () => {
       logMessage('Received SIGTERM, shutting down gracefully', 'INFO');
       process.exit(0);
   });

   process.on('SIGINT', () => {
       logMessage('Received SIGINT, shutting down gracefully', 'INFO');
       process.exit(0);
   });
   ```

### 8.3 Enhanced Deployment Script

1. **Create deployment directory**:
   ```bash
   mkdir -p ~/quickshop/deployment
   cd ~/quickshop/deployment
   ```

2. **Create a comprehensive deployment script**:
   ```bash
   nano deploy.sh
   ```

   **Content for deploy.sh**:
   ```bash
   #!/bin/bash

   #===============================================================================
   # QuickShop Auto-Deployment Script
   #===============================================================================
   # This script performs a complete auto-deployment of QuickShop application
   # It updates the code, installs dependencies, builds the frontend,
   # and restarts the services.
   #===============================================================================

   set -e  # Exit on any error

   # Configuration
   PROJECT_DIR="/home/ubuntu/quickshop"
   BACKUP_DIR="/home/ubuntu/quickshop-backups"
   LOG_FILE="/home/ubuntu/quickshop/logs/deployment.log"
   TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

   # Function to log messages
   log() {
       echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
   }

   log "Starting deployment process..."

   # Function for error handling
   error_exit() {
       log "ERROR: $1"
       exit 1
   }

   # Create backup directory if it doesn't exist
   mkdir -p "$BACKUP_DIR"
   mkdir -p "/home/ubuntu/quickshop/logs"

   # Create backup of current version
   log "Creating backup of current version..."
   BACKUP_NAME="quickshop_backup_${TIMESTAMP}"
   BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
   cp -r "$PROJECT_DIR" "$BACKUP_PATH" || log "Warning: Could not create backup"
   log "Backup created at: $BACKUP_PATH"

   # Navigate to project directory
   cd "$PROJECT_DIR" || error_exit "Could not navigate to project directory"

   # Fetch latest changes from repository
   log "Fetching latest changes from repository..."
   git fetch origin || error_exit "Failed to fetch from origin"
   git reset --hard origin/main || error_exit "Failed to reset to origin/main"

   # Verify the correct branch is checked out
   CURRENT_BRANCH=$(git branch --show-current)
   log "Current branch: $CURRENT_BRANCH"

   # Update backend
   log "Updating backend..."
   cd "$PROJECT_DIR/backend" || error_exit "Could not navigate to backend directory"

   # Install backend dependencies
   log "Installing backend dependencies..."
   export NODE_OPTIONS="--max_old_space_size=4096"  # Increase memory for build
   npm install --production || error_exit "Failed to install backend dependencies"

   # Build backend if needed (for TypeScript or other build steps)
   if [ -f "tsconfig.json" ] || [ -f "webpack.config.js" ]; then
       log "Building backend..."
       npm run build || log "Backend build had issues, continuing..."
   fi

   # Update frontend
   log "Updating frontend..."
   cd "$PROJECT_DIR/frontend" || error_exit "Could not navigate to frontend directory"

   # Install frontend dependencies
   log "Installing frontend dependencies..."
   export NODE_OPTIONS="--max_old_space_size=4096"  # Increase memory for build
   npm install --production || error_exit "Failed to install frontend dependencies"

   # Build frontend
   log "Building frontend..."
   npm run build || error_exit "Failed to build frontend"

   # Update admin portal
   log "Updating admin portal..."
   cd "$PROJECT_DIR/admin_portal" || error_exit "Could not navigate to admin portal directory"
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm install --production || log "Error installing admin portal dependencies, continuing..."
   npm run build || log "Error building admin portal, continuing..."

   # Update support portal
   log "Updating support portal..."
   cd "$PROJECT_DIR/support_portal" || error_exit "Could not navigate to support portal directory"
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm install --production || log "Error installing support portal dependencies, continuing..."
   npm run build || log "Error building support portal, continuing..."

   # Update analytics portal
   log "Updating analytics portal..."
   cd "$PROJECT_DIR/analytics_portal" || error_exit "Could not navigate to analytics portal directory"
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm install --production || log "Error installing analytics portal dependencies, continuing..."
   npm run build || log "Error building analytics portal, continuing..."

   # Update seller portal
   log "Updating seller portal..."
   cd "$PROJECT_DIR/seller_portal" || error_exit "Could not navigate to seller portal directory"
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm install --production || log "Error installing seller portal dependencies, continuing..."
   npm run build || log "Error building seller portal, continuing..."

   # Restart PM2 processes
   log "Restarting PM2 processes..."
   cd "$PROJECT_DIR"

   # Reload PM2 without downtime
   pm2 reload all || log "Error reloading PM2, attempting restart..."

   # If reload failed, try individual restart
   if [ $? -ne 0 ]; then
       pm2 restart quickshop-backend || log "Error restarting backend"
       pm2 restart quickshop-webhook || log "Error restarting webhook"
   fi

   # Run post-deployment checks
   log "Running post-deployment checks..."

   # Check if backend is responding
   BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "000")
   if [ "$BACKEND_STATUS" = "200" ]; then
       log "✓ Backend is responding correctly (Status: $BACKEND_STATUS)"
   else
       log "✗ Backend is not responding correctly (Status: $BACKEND_STATUS)"
   fi

   # Check if webhook is responding
   WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health || echo "000")
   if [ "$WEBHOOK_STATUS" = "200" ]; then
       log "✓ Webhook server is responding correctly (Status: $WEBHOOK_STATUS)"
   else
       log "✗ Webhook server is not responding correctly (Status: $WEBHOOK_STATUS)"
   fi

   # Reload NGINX configuration
   log "Reloading NGINX configuration..."
   sudo nginx -t && sudo systemctl reload nginx || error_exit "Failed to reload NGINX"

   # Clean up old backups (keep last 5)
   log "Cleaning up old backups..."
   ls -t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}" 2>/dev/null || log "No old backups to remove"

   log "Deployment completed successfully at $(date)"
   log "========================================"
   ```

3. **Make the deployment script executable**:
   ```bash
   chmod +x deploy.sh
   ```

4. **Test the deployment script** (dry run):
   ```bash
   # Make sure all directories exist before running the script
   ls -la /home/ubuntu/quickshop/
   ```

### 8.4 Configure GitHub Webhook

1. **Navigate to your GitHub repository**:
   - Go to https://github.com/echelonxventures/quickshop.git
   - Click on the "Settings" tab
   - In the left sidebar, click on "Webhooks"

2. **Generate a secure webhook secret**:
   ```bash
   # On your server, generate a secure secret
   openssl rand -hex 32
   ```

   This will generate a 64-character hexadecimal string to use as your webhook secret.

3. **Add a new webhook**:
   - Click "Add webhook" button
   - **Payload URL**: `https://quickshop.echelonxventures.org:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: Paste the secret generated above
   - **Events**: Select "Just the push event" or "Let me select individual events" and choose "Pushes"
   - Click "Add webhook"

4. **Verify webhook is added**:
   - The webhook should appear in the list
   - Status should show "Recent Deliveries" with a green checkmark after successful setup

### 8.5 PM2 Configuration for Webhook Server

1. **Update the ecosystem.config.js file** in the main quickshop directory:
   ```bash
   cd ~/quickshop
   nano ecosystem.config.js
   ```

   **Updated content for ecosystem.config.js**:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'quickshop-backend',
         script: './backend/server.js',
         instances: 1, // For free tier, limit to 1 instance
         exec_mode: 'fork', // Use fork mode for simpler memory usage
         env: {
           NODE_ENV: 'production',
           PORT: 5000,
           HOST: '0.0.0.0'
         },
         env_file: './backend/.env',
         error_file: './backend/logs/err.log',
         out_file: './backend/logs/out.log',
         log_file: './backend/logs/combined.log',
         time: true,
         max_memory_restart: '512M',
         node_args: '--max-old-space-size=512',
         watch: false,
         ignore_watch: ['node_modules', 'logs', '.git'],
         exp_backoff_restart_delay: 100,
         max_restarts: 30,
         min_uptime: '10s',
         // Set environment variables for production
         env_production: {
           NODE_ENV: 'production'
         }
       },
       {
         name: 'quickshop-webhook',
         script: './webhook/webhook-server.js',
         instances: 1,
         exec_mode: 'fork',
         env: {
           NODE_ENV: 'production',
           PORT: 9000,
           WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your_webhook_secret_here',
           DEPLOYMENT_SCRIPT: './deployment/deploy.sh',
           LOG_DIR: './logs'
         },
         error_file: './logs/webhook-err.log',
         out_file: './logs/webhook-out.log',
         log_file: './logs/webhook-combined.log',
         time: true,
         max_memory_restart: '256M',
         node_args: '--max-old-space-size=256',
         watch: false,
         ignore_watch: ['node_modules', 'logs', '.git'],
         exp_backoff_restart_delay: 100,
         max_restarts: 10,
         min_uptime: '10s'
       }
     ]
   };
   ```

2. **Set the webhook secret as an environment variable**:
   ```bash
   # Generate a secure secret if you haven't already
   WEBHOOK_SECRET=$(openssl rand -hex 32)
   echo "export WEBHOOK_SECRET=\"$WEBHOOK_SECRET\"" >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Update PM2 with the new configuration**:
   ```bash
   cd ~/quickshop
   pm2 delete all  # Remove any existing processes
   pm2 start ecosystem.config.js
   pm2 save
   ```

4. **Check that both processes are running**:
   ```bash
   pm2 status
   ```

   You should see both `quickshop-backend` and `quickshop-webhook` as "online".

### 8.6 Configure Firewall for Webhook Port

1. **Open port 9000 for the webhook server**:
   ```bash
   sudo ufw allow 9000
   sudo ufw reload
   ```

2. **Verify firewall status**:
   ```bash
   sudo ufw status
   ```

### 8.7 Test Auto-Deployment Setup

1. **Test webhook server health**:
   ```bash
   curl http://localhost:9000/health
   curl http://localhost:9000/status
   ```

2. **Test webhook from external source** (simulating GitHub):
   ```bash
   # Create a simple test payload
   cat > /tmp/test-payload.json << EOF
   {
     "ref": "refs/heads/main",
     "repository": {
       "name": "quickshop",
       "full_name": "echelonxventures/quickshop"
     }
   }
   EOF

   # Generate signature (replace YOUR_SECRET with your actual webhook secret)
   SECRET="your_actual_webhook_secret"
   PAYLOAD=$(cat /tmp/test-payload.json)
   SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

   # Send test request
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-Hub-Signature-256: $SIGNATURE" \
     -d "$PAYLOAD" \
     http://localhost:9000/webhook
   ```

3. **Check the webhook server logs**:
   ```bash
   pm2 logs quickshop-webhook --lines 50
   ```

4. **Test the deployment script directly**:
   ```bash
   cd ~/quickshop/deployment
   bash deploy.sh
   ```

### 8.8 Auto-deployment Verification and Troubleshooting

1. **Check deployment logs**:
   ```bash
   cat ~/quickshop/logs/deployment.log
   ```

2. **Monitor PM2 logs**:
   ```bash
   pm2 logs
   # Or monitor specific services
   pm2 logs quickshop-webhook
   pm2 logs quickshop-backend
   ```

3. **Verify webhook is accessible from internet**:
   - Visit your GitHub webhook settings page
   - Check the "Recent Deliveries" section
   - Red indicator means failure, green means success

4. **Setup deployment monitoring**:
   ```bash
   # Create a monitoring script
   nano ~/deployment-monitor.sh
   ```

   **Content for deployment-monitor.sh**:
   ```bash
   #!/bin/bash

   # QuickShop deployment monitoring script
   LOG_FILE="/home/ubuntu/quickshop/logs/monitoring.log"

   log() {
       echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
   }

   # Check backend status
   BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://quickshop.echelonxventures.org/api/health 2>/dev/null || echo "000")
   if [ "$BACKEND_STATUS" = "200" ]; then
       log "✓ Backend OK: $BACKEND_STATUS"
   else
       log "✗ Backend Error: $BACKEND_STATUS"
       # Optionally restart backend
       # pm2 restart quickshop-backend
   fi

   # Check webhook status
   WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://quickshop.echelonxventures.org:9000/health 2>/dev/null || echo "000")
   if [ "$WEBHOOK_STATUS" = "200" ]; then
       log "✓ Webhook OK: $WEBHOOK_STATUS"
   else
       log "✗ Webhook Error: $WEBHOOK_STATUS"
   fi

   # Check if PM2 processes are running
   RUNNING_APPS=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "online") | .name' | wc -l)
   TOTAL_APPS=$(pm2 jlist | jq 'length')

   log "PM2 Status: $RUNNING_APPS/$TOTAL_APPS apps running"

   if [ "$RUNNING_APPS" -lt "$TOTAL_APPS" ]; then
       log "⚠️ Some PM2 apps are not running, attempting restart"
       pm2 reload all
   fi
   ```

   Make it executable and add to cron:
   ```bash
   chmod +x ~/deployment-monitor.sh

   # Add to crontab to run every 5 minutes
   (crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/deployment-monitor.sh") | crontab -
   ```

5. **Common auto-deployment issues and solutions**:
   - **Webhook timeout**: Increase the timeout values in the webhook server
   - **Permission errors**: Ensure the deployment user has proper permissions
   - **SSL/TLS issues**: Make sure your webhook URL uses HTTPS
   - **Build failures**: Check the deployment logs for specific errors
   - **Memory issues**: On free tier, ensure you're not exceeding memory limits

### 8.9 Deploy a Test Change to Verify Auto-Deployment

1. **Make a small change to your repository** (from your local machine):
   - Make a minor change to any file in the GitHub repository
   - Commit and push the change to the main branch
   - This should trigger the webhook and auto-deployment

2. **Monitor the deployment**:
   - Check GitHub webhook delivery status
   - Monitor PM2 logs: `pm2 logs`
   - Check deployment logs: `tail -f ~/quickshop/logs/deployment.log`
   - Verify the change appears on your live site

---

## 9. Final Integration {#9-final-integration}

### 9.1 Complete System Integration Verification

1. **Verify all services are running**:
   ```bash
   pm2 status
   ```

   You should see both `quickshop-backend` and `quickshop-webhook` showing as "online".

2. **Check backend API health**:
   ```bash
   curl -I https://quickshop.echelonxventures.org/api/health
   # Should return HTTP/1.1 200 OK
   ```

3. **Verify full backend functionality**:
   ```bash
   curl -s https://quickshop.echelonxventures.org/api/health
   # Should return: {"status":"OK","timestamp":"2024-12-05T10:30:00.000Z"}
   ```

4. **Check frontend accessibility**:
   ```bash
   curl -I https://quickshop.echelonxventures.org
   # Should return HTTP/1.1 200 OK
   ```

5. **Verify different portals are accessible**:
   ```bash
   curl -I https://quickshop.echelonxventures.org/admin
   curl -I https://quickshop.echelonxventures.org/seller
   curl -I https://quickshop.echelonxventures.org/support
   curl -I https://quickshop.echelonxventures.org/analytics
   ```

6. **Test API proxy functionality**:
   ```bash
   curl -I https://quickshop.echelonxventures.org/api/
   # Should return 200 or 404 (meaning the proxy is working)
   ```

7. **Check webhook server status**:
   ```bash
   curl -s http://quickshop.echelonxventures.org:9000/health
   # Should return: {"status":"OK","timestamp":"...","service":"Webhook Server"}
   ```

### 9.2 Database Connection Testing

1. **Test database connectivity from backend**:
   ```bash
   cd ~/quickshop/backend
   # Create a test script to verify database connection
   nano test-db-integration.js
   ```

   **Content for test-db-integration.js**:
   ```javascript
   require('dotenv').config();
   const mysql = require('mysql2/promise');

   const dbConfig = {
     host: process.env.DB_HOST || '10.0.1.23',
     user: process.env.DB_USER || 'admin',
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME || 'quickshop',
     port: process.env.DB_PORT || 3306,
     connectTimeout: 60000,
     acquireTimeout: 60000,
     timeout: 60000,
   };

   async function testIntegration() {
     try {
       console.log('Testing database integration...');
       const connection = await mysql.createConnection(dbConfig);

       // Test with a real query that validates the schema
       const [tables] = await connection.execute('SHOW TABLES');
       console.log(`✓ Found ${tables.length} tables in the database`);

       // Test with a sample query (adjust based on your schema)
       const [result] = await connection.execute('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?', [process.env.DB_NAME]);
       console.log(`✓ Database query successful: ${JSON.stringify(result[0])}`);

       await connection.end();
       console.log('✓ Database integration test completed successfully');
       return true;
     } catch (error) {
       console.error('✗ Database integration test failed:', error.message);
       return false;
     }
   }

   testIntegration();
   ```

2. **Run the database integration test**:
   ```bash
   npm install mysql2 dotenv  # Install dependencies if not present
   node test-db-integration.js
   ```

3. **Clean up test file**:
   ```bash
   rm test-db-integration.js
   ```

### 9.3 Application Functionality Testing

1. **Test user registration endpoint** (if available):
   ```bash
   curl -X POST https://quickshop.echelonxventures.org/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@quickshop.echelonxventures.org", "password":"TestPass123!", "name":"Test User"}'
   ```

2. **Test product listing endpoint** (if available):
   ```bash
   curl -s https://quickshop.echelonxventures.org/api/products | head -20
   ```

3. **Check SSL certificate validity**:
   ```bash
   echo | openssl s_client -connect quickshop.echelonxventures.org:443 2>/dev/null | openssl x509 -noout -dates
   ```

4. **Test HTTP to HTTPS redirect**:
   ```bash
   curl -I http://quickshop.echelonxventures.org
   # Should return: HTTP/1.1 301 Moved Permanently with Location: https://...
   ```

### 9.4 Performance Optimization and Security Verification

1. **Enable and configure advanced NGINX caching**:
   ```bash
   sudo nano /etc/nginx/sites-available/quickshop
   ```

   Update the server configuration with comprehensive caching:
   ```nginx
   # Add these at the top of the file to create a cache zone
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC_CACHE:10m max_size=1g inactive=60m use_temp_path=off;

   server {
       listen 443 ssl http2;
       server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;

       # SSL Configuration (add these if not already present)
       ssl_certificate /etc/letsencrypt/live/quickshop.echelonxventures.org/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/quickshop.echelonxventures.org/privkey.pem;
       ssl_trusted_certificate /etc/letsencrypt/live/quickshop.echelonxventures.org/chain.pem;

       # SSL Security Parameters
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
       ssl_session_tickets off;

       # HSTS (HTTP Strict Transport Security)
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

       # Cache for static files
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
           gzip_static on;
           etag on;
       }

       # Main frontend application (customer-facing)
       location / {
           alias /home/ubuntu/quickshop/frontend/build/;
           try_files $uri $uri/ @fallback;
           expires 1h;
           add_header Cache-Control "public, must-revalidate";
       }

       # Fallback for Single Page Application routing
       location @fallback {
           alias /home/ubuntu/quickshop/frontend/build/index.html;
       }

       # API proxy to backend
       location /api {
           proxy_pass http://localhost:5000;
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

           # Security: Prevent direct access to sensitive backend paths
           proxy_redirect off;
       }

       # Admin portal
       location /admin {
           alias /home/ubuntu/quickshop/admin_portal/build/;
           try_files $uri $uri/ @admin_fallback;
           expires 1h;
           add_header Cache-Control "public, must-revalidate";
       }

       location @admin_fallback {
           alias /home/ubuntu/quickshop/admin_portal/build/index.html;
       }

       # Seller portal
       location /seller {
           alias /home/ubuntu/quickshop/seller_portal/build/;
           try_files $uri $uri/ @seller_fallback;
           expires 1h;
           add_header Cache-Control "public, must-revalidate";
       }

       location @seller_fallback {
           alias /home/ubuntu/quickshop/seller_portal/build/index.html;
       }

       # Support portal
       location /support {
           alias /home/ubuntu/quickshop/support_portal/build/;
           try_files $uri $uri/ @support_fallback;
           expires 1h;
           add_header Cache-Control "public, must-revalidate";
       }

       location @support_fallback {
           alias /home/ubuntu/quickshop/support_portal/build/index.html;
       }

       # Analytics portal
       location /analytics {
           alias /home/ubuntu/quickshop/analytics_portal/build/;
           try_files $uri $uri/ @analytics_fallback;
           expires 1h;
           add_header Cache-Control "public, must-revalidate";
       }

       location @analytics_fallback {
           alias /home/ubuntu/quickshop/analytics_portal/build/index.html;
       }

       # Logging
       access_log /var/log/nginx/quickshop_access.log;
       error_log /var/log/nginx/quickshop_error.log;
   }

   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name quickshop.echelonxventures.org www.quickshop.echelonxventures.org;
       return 301 https://$server_name$request_uri;
   }
   ```

2. **Test the updated NGINX configuration**:
   ```bash
   sudo nginx -t
   ```

3. **Reload NGINX with new configuration**:
   ```bash
   sudo systemctl reload nginx
   ```

### 9.5 Comprehensive Security Checks

1. **Run security headers check**:
   ```bash
   curl -I https://quickshop.echelonxventures.org | grep -i "strict-transport-security\|x-frame-options\|x-xss-protection\|x-content-type-options"
   ```

   You should see the security headers we configured.

2. **Test security with online tools**:
   - Visit [Mozilla Observatory](https://observatory.mozilla.org/)
   - Enter `quickshop.echelonxventures.org`
   - Review security rating and recommendations

3. **Check for common security issues**:
   ```bash
   # Check if sensitive files are accessible
   curl -I https://quickshop.echelonxventures.org/.env
   curl -I https://quickshop.echelonxventures.org/.git/
   # Should return 404 or 403 for both
   ```

### 9.6 Load Testing Preparation

1. **Set up basic monitoring**:
   ```bash
   # Install additional monitoring tools
   sudo apt install htop iotop nethogs -y
   ```

2. **Create a simple load test script** (optional):
   ```bash
   nano ~/load-test.sh
   ```

   **Content for load-test.sh**:
   ```bash
   #!/bin/bash
   # Simple load test script for QuickShop

   URL="https://quickshop.echelonxventures.org"
   DURATION=30  # seconds
   CONCURRENCY=5

   echo "Starting load test for $DURATION seconds with $CONCURRENCY concurrent requests..."
   echo "Testing URL: $URL"

   # Install Apache Bench if not present
   if ! command -v ab &> /dev/null; then
       sudo apt install apache2-utils -y
   fi

   # Run the load test
   ab -n $((CONCURRENCY * 20)) -c $CONCURRENCY "$URL/"

   echo "Load test completed."
   ```

   Make it executable:
   ```bash
   chmod +x ~/load-test.sh
   ```

### 9.7 Final Health Check and Monitoring Setup

1. **Set up basic monitoring with a health check script**:
   ```bash
   nano ~/full-health-check.sh
   ```

   **Content for full-health-check.sh**:
   ```bash
   #!/bin/bash
   # Comprehensive health check for QuickShop deployment

   TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
   LOG_FILE="/home/ubuntu/quickshop/logs/full-health-check.log"

   log() {
       echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
   }

   log "=== Starting Full Health Check ==="

   # Check PM2 services
   log "Checking PM2 services..."
   PM2_STATUS=$(pm2 jlist | jq -r '.[].pm2_env.status' | sort | uniq | tr '\n' ' ')
   log "PM2 Status: $PM2_STATUS"

   # Check backend health
   BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://quickshop.echelonxventures.org/api/health 2>/dev/null || echo "000")
   log "Backend Status: $BACKEND_STATUS"

   # Check frontend accessibility
   FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://quickshop.echelonxventures.org 2>/dev/null || echo "000")
   log "Frontend Status: $FRONTEND_STATUS"

   # Check webhook server
   WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://quickshop.echelonxventures.org:9000/health 2>/dev/null || echo "000")
   log "Webhook Status: $WEBHOOK_STATUS"

   # Check SSL certificate
   SSL_EXPIRY=$(echo | openssl s_client -connect quickshop.echelonxventures.org:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
   log "SSL Certificate Expiry: $SSL_EXPIRY"

   # Check system resources
   MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f%%", $3/$2 * 100.0}')
   DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
   log "Memory Usage: $MEMORY_USAGE"
   log "Disk Usage: $DISK_USAGE"

   # Summary
   if [[ "$BACKEND_STATUS" == "200" && "$FRONTEND_STATUS" == "200" ]]; then
       log "✓ Overall status: HEALTHY"
   else
       log "✗ Overall status: ISSUES DETECTED"
   fi

   log "=== Health Check Complete ==="
   log ""
   ```

   Make it executable:
   ```bash
   chmod +x ~/full-health-check.sh
   ```

2. **Run the full health check**:
   ```bash
   ~/full-health-check.sh
   ```

3. **Set up automated health checks**:
   ```bash
   # Add to crontab to run every 10 minutes
   (crontab -l 2>/dev/null; echo "*/10 * * * * /home/ubuntu/full-health-check.sh") | crontab -
   ```

### 9.8 Documentation and Final Verification

1. **Verify all environment variables are properly configured**:
   ```bash
   # Check backend environment
   cd ~/quickshop/backend
   echo "Backend configuration check:"
   grep -E "^(NODE_ENV|DB_HOST|DB_USER|APP_URL)" .env
   ```

2. **Verify SSL certificate is properly configured**:
   ```bash
   sudo certbot certificates
   ```

3. **Check that auto-renewal is properly configured**:
   ```bash
   sudo crontab -l
   ```

4. **Verify webhook secret is properly set**:
   ```bash
   printenv | grep WEBHOOK_SECRET
   ```

5. **Document the deployment** by creating a status file:
   ```bash
   cat > ~/quickshop/DEPLOYMENT_STATUS.md << EOF
   # QuickShop Deployment Status

   **Deployment Date**: $(date)
   **Environment**: Production
   **Domain**: https://quickshop.echelonxventures.org

   ## Services Status
   - Backend API: $(curl -s -o /dev/null -w "%{http_code}" https://quickshop.echelonxventures.org/api/health 2>/dev/null || echo "DOWN")
   - Frontend: $(curl -s -o /dev/null -w "%{http_code}" https://quickshop.echelonxventures.org 2>/dev/null || echo "DOWN")
   - Webhook: $(curl -s -o /dev/null -w "%{http_code}" http://quickshop.echelonxventures.org:9000/health 2>/dev/null || echo "DOWN")

   ## SSL Certificate
   - Status: Valid
   - Expiry: $(echo | openssl s_client -connect quickshop.echelonxventures.org:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)

   ## Auto-deployment
   - Status: Configured
   - Webhook URL: https://quickshop.echelonxventures.org:9000/webhook

   ## Backup Strategy
   - Automatic: Daily backups (if configured)
   - Manual: Available in /home/ubuntu/quickshop-backups/

   **Deployed by**: Ubuntu User
   **Contact**: admin@quickshop.echelonxventures.org
   EOF
   ```

### 9.9 Final Deployment Validation Checklist

Verify that all components are working properly:

- [ ] **Domain**: `quickshop.echelonxventures.org` resolves to `141.148.196.251`
- [ ] **SSL Certificate**: Valid and auto-renewal configured
- [ ] **Backend**: Running on port 5000, accessible via API proxy
- [ ] **Frontend**: Served via NGINX, accessible at root domain
- [ ] **Admin Portal**: Accessible at `/admin` path
- [ ] **Database**: OCI MySQL Heatwave connected and functional
- [ ] **Webhook**: Running on port 9000, accepting GitHub pushes
- [ ] **Auto-deployment**: Working with successful test deployment
- [ ] **Security**: All recommended headers and protections in place
- [ ] **Monitoring**: Health checks and logs properly configured
- [ ] **Backup**: Backup system properly implemented

Congratulations! Your QuickShop e-commerce platform is now fully deployed and operational with all required features and automatic deployment capabilities.

---

## 10. Resources {#10-resources}

### 10.1 Helpful Links

- [Oracle Cloud Infrastructure Documentation](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [QuickShop GitHub Repository](https://github.com/echelonxventures/quickshop.git)
- [NGINX Configuration Guide](https://nginx.org/en/docs/)
- [PM2 Process Manager](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Let's Encrypt SSL Documentation](https://letsencrypt.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [GitHub Webhooks Guide](https://docs.github.com/en/webhooks)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)

### 10.2 Troubleshooting

**Common Issues and Solutions**:

1. **SSL Certificate Issues**:
   - Verify domain DNS points to correct IP
   - Check firewall rules allow port 80/443
   - Test with `sudo certbot renew --dry-run`

2. **Backend Not Starting**:
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables: `pm2 env quickshop-backend`
   - Check database connectivity

3. **Frontend Build Issues**:
   - Ensure Node.js and npm are installed correctly
   - Clear npm cache: `npm cache clean --force`
   - Rebuild: `npm run build`

4. **GitHub Webhook Not Triggering**:
   - Verify webhook URL is accessible
   - Check firewall allows port 9000
   - Verify webhook secret matches

5. **OCI Network Issues**:
   - Verify Security List rules allow necessary traffic
   - Check that the instance is in the correct subnet
   - Confirm route tables have required gateways

6. **Database Connection Issues**:
   - Verify the MySQL instance is running and accessible
   - Check that the security rules in the private subnet allow database connections
   - Confirm the connection string is correctly formatted

7. **Auto-deployment Failures**:
   - Check webhook server logs: `pm2 logs quickshop-webhook`
   - Verify the webhook secret matches between GitHub and server
   - Confirm deployment script has proper execute permissions

### 10.3 Maintenance Commands

```bash
# View application logs
pm2 logs

# Restart all processes
pm2 restart all

# Monitor resource usage
pm2 monit

# View system information
pm2 info

# Update certificates
sudo certbot renew

# Check NGINX configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep -E "(node|nginx|pm2)"

# Check listening ports
sudo netstat -tlnp

# View application status
pm2 status

# Check specific application logs
pm2 logs quickshop-backend --lines 50
pm2 logs quickshop-webhook --lines 50

# Check NGINX logs
sudo tail -f /var/log/nginx/quickshop_access.log
sudo tail -f /var/log/nginx/quickshop_error.log

# Check deployment logs
tail -f /home/ubuntu/quickshop/logs/deployment.log
tail -f /home/ubuntu/quickshop/logs/webhook.log
```

### 10.4 Performance Monitoring

**System Resources**:
- **Memory**: Monitor with `free -h` and `htop`
- **Disk**: Monitor with `df -h`
- **CPU**: Monitor with `htop` or `top`
- **Network**: Monitor with `nethogs` or `iftop`

**Application Performance**:
- Monitor response times with `curl -w "@curl-format.txt" -o /dev/null -s "https://quickshop.echelonxventures.org"`
- Monitor error rates in application logs
- Check database query performance

**Using PM2 for Monitoring**:
```bash
# Real-time monitoring
pm2 monit

# Detailed process information
pm2 show quickshop-backend

# Memory and CPU usage
pm2 top
```

### 10.5 Security Best Practices

1. **Regular Updates**: Keep the system and applications updated:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **SSH Security**:
   - Use SSH keys instead of passwords
   - Consider changing SSH port and disabling root login
   - Use fail2ban for additional protection

3. **Database Security**:
   - Regularly update database passwords
   - Implement database backup strategies
   - Monitor database access logs

4. **Application Security**:
   - Regularly update dependencies
   - Monitor application logs for suspicious activity
   - Implement rate limiting

5. **Network Security**:
   - Keep security lists restrictive
   - Regularly audit firewall rules
   - Monitor network traffic

### 10.6 Backup and Recovery Strategy

1. **Application Code Backup**:
   - Automated git commits are part of the deployment process
   - Manual backups are created during deployments in `/home/ubuntu/quickshop-backups/`

2. **Database Backup**:
   ```bash
   # Create a database backup
   mysqldump -h 10.0.1.23 -u admin -p quickshop | gzip > quickshop_backup_$(date +%Y%m%d_%H%M%S).sql.gz
   ```

3. **Configuration Backup**:
   - Keep copies of critical configuration files
   - Store environment variables securely

4. **Full System Backup**:
   - OCI provides VM snapshot capabilities
   - Consider using OCI Object Storage for backup storage

### 10.7 Scaling Considerations

1. **Vertical Scaling** (for future when outgrowing free tier):
   - Upgrade to larger VM instance shapes
   - Increase database resources
   - Expand storage capacity

2. **Horizontal Scaling** (for future growth):
   - Implement load balancer
   - Add additional application servers
   - Use database read replicas
   - Implement caching layers (Redis/Memcached)

3. **Performance Optimizations**:
   - Optimize database queries
   - Implement CDN for static assets
   - Use image optimization
   - Implement advanced caching strategies

---

**Congratulations!** You have successfully deployed your QuickShop e-commerce platform on Oracle Cloud Infrastructure. Your application is now live at https://quickshop.echelonxventures.org with automated deployment capabilities.

For any issues during deployment, refer to the troubleshooting section or create an issue on the GitHub repository.

---

*[QuickShop Deployment Guide - Version 1.0.0 - December 2024]*

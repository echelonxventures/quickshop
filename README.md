# QuickShop - AI-Powered E-Commerce Platform

Welcome to QuickShop, a futuristic, scalable, AI-powered e-commerce platform inspired by Amazon, Flipkart, and eBay, with advanced analytics, personalization, and automation capabilities.

## 🚀 Features

### Core Features
- **Multi-Vendor Marketplace**: Support for multiple sellers
- **Advanced Product Catalog**: Filtering, search, and recommendations
- **Shopping Cart & Wishlist**: Complete cart functionality
- **Order Management**: Comprehensive order processing
- **Payment Gateways**: Stripe, PayPal, Razorpay integration
- **User Management**: Role-based access control
- **Responsive Design**: Mobile-first approach

### AI & Advanced Features
- **AI-Powered Recommendations**: Personalized product suggestions
- **Dynamic Pricing Engine**: AI-driven pricing optimization
- **AI Chatbot**: NLP-powered customer support
- **Sentiment Analysis**: Customer feedback analysis
- **Predictive Analytics**: Sales and trend forecasting
- **Customer Behavior Analysis**: Engagement and conversion insights

### Additional Features
- **Multi-Language & Multi-Currency**: International support
- **Advanced Search**: Faceted search with filters
- **User Reviews & Ratings**: Product feedback system
- **Inventory Management**: Real-time stock tracking
- **Marketing Tools**: Coupons, promotions, email campaigns
- **Analytics Dashboard**: Business intelligence and reporting
- **Affiliate System**: Commission-based marketing
- **Seller Portal**: Independent seller management

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **Caching**: Redis
- **Authentication**: JWT with refresh tokens
- **Payments**: Stripe, PayPal, Razorpay
- **AI/ML**: OpenAI API for chatbot and recommendations

### Frontend
- **Framework**: React.js 18+
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS + Headless UI
- **UI Components**: Radix UI + Headless UI
- **Routing**: React Router
- **HTTP Client**: Axios

### Infrastructure
- **Cloud**: Oracle Cloud Infrastructure (Always Free Tier)
- **Database**: MySQL (OCI Always Free)
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **CDN**: Cloudflare (optional)

## 📋 Prerequisites

- Node.js 18+ with npm
- MySQL 8+
- Redis
- Docker & Docker Compose
- Git

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/quickshop.git
cd quickshop
```

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update environment variables
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=quickshop
# JWT_SECRET=your_jwt_secret_key
# FRONTEND_URL=http://localhost:3000
# STRIPE_SECRET_KEY=your_stripe_secret_key
# ... add other required environment variables
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update API URL
# REACT_APP_API_URL=http://localhost:5000
```

### 4. Database Setup
```bash
# Start MySQL and create database
mysql -u root -p
CREATE DATABASE quickshop;
USE quickshop;
exit;

# Import schema
mysql -u root -p quickshop < ../database/schema.sql

# Import seed data (optional)
mysql -u root -p quickshop < ../database/seed_data.sql
```

### 5. Environment Variables

Create `.env` files for both backend and frontend:

#### Backend `.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quickshop
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Payment Gateway Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# AI/ML Configuration
OPENAI_API_KEY=your_openai_api_key

# Cloud Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Application Configuration
APP_NAME=QuickShop
APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@quickshop.echelonxventures.org
SUPPORT_EMAIL=support@quickshop.echelonxventures.org
```

#### Frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
REACT_APP_PAYPAL_CLIENT_ID=your_paypal_client_id
REACT_APP_SENTRY_DSN=your_sentry_dsn
REACT_APP_GOOGLE_ANALYTICS_ID=your_ga_id
```

## 🔧 Running the Application

### Development
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm start

# Terminal 3: Start Redis (if not running as service)
redis-server

# Terminal 4: Start MySQL (if not running as service)
sudo service mysql start
```

### Production (Using Docker)
```bash
# Build and start all services
cd deployment
docker-compose up -d --build

# Check service status
docker-compose ps
```

## 🏗️ Project Structure

```
quickshop/
├── backend/
│   ├── auth/           # Authentication services
│   ├── product/        # Product management
│   ├── order/          # Order processing
│   ├── payment/        # Payment processing
│   ├── user/           # User management
│   ├── cart/           # Shopping cart
│   ├── wishlist/       # Wishlist functionality
│   ├── review/         # Product reviews
│   ├── seller/         # Seller management
│   ├── inventory/      # Inventory management
│   ├── chatbot/        # AI chatbot
│   ├── analytics/      # Analytics services
│   ├── support/        # Support system
│   ├── admin/          # Admin services
│   ├── db.js           # Database connection
│   ├── server.js       # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Custom hooks
│   │   ├── utils/      # Utility functions
│   │   ├── context/    # React context
│   │   ├── assets/     # Static assets
│   │   ├── styles/     # Styling
│   │   └── App.jsx     # Main app component
│   ├── package.json
│   └── public/
├── admin_portal/       # Admin dashboard
├── support_portal/     # Customer support portal
├── analytics_portal/   # Analytics dashboard
├── database/           # SQL schemas and seeds
├── docs/               # Documentation
├── deployment/         # Docker and deployment configs
└── README.md
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create a product (admin/seller only)
- `PUT /api/products/:id` - Update a product (admin/seller only)
- `DELETE /api/products/:id` - Delete a product (admin/seller only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:productId` - Update cart item
- `DELETE /api/cart/:productId` - Remove item from cart

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create an order
- `GET /api/orders/:id` - Get order by ID

### Reviews
- `GET /api/reviews/:productId` - Get product reviews
- `POST /api/reviews` - Add a review
- `PUT /api/reviews/:id` - Update a review (own only)
- `DELETE /api/reviews/:id` - Delete a review (own/admin only)

## 🤖 AI Features

### Product Recommendations
The system uses collaborative filtering and content-based filtering to provide personalized recommendations.

### AI Chatbot
Integrated NLP-powered chatbot for customer support using OpenAI API.

### Dynamic Pricing
AI-driven pricing that adjusts based on demand, competition, and market trends.

## 📊 Analytics Dashboard

The analytics dashboard provides:

- Sales metrics and trends
- Customer behavior analysis
- Product performance insights
- Conversion funnel analysis
- Predictive analytics
- Real-time monitoring

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Password hashing using bcrypt
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet.js security headers
- SQL injection prevention
- XSS protection

## 📱 Mobile Responsiveness

- Fully responsive design
- Progressive Web App (PWA) capabilities
- Touch-friendly interfaces
- Optimized mobile performance

## 🌐 Deployment

### To Oracle Cloud Infrastructure (Always Free Tier)

1. **Create OCI Account**: Sign up for Oracle Cloud Infrastructure with Always Free Tier
2. **Set up VM**: Create a VM instance with Always Free specifications
3. **Domain**: Configure your domain (quickshop.echelonxventures.org) to point to your OCI server
4. **Install Docker**: On your OCI server
5. **Clone Repository**: `git clone` your repository
6. **Update Configuration**: Update environment variables for production
7. **Deploy**: Use the provided docker-compose.yml

### SSL Certificate (using Let's Encrypt)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🛠️ Development Scripts

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run seed` - Seed database

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject Create React App (irreversible)

## 🧪 Testing

### Unit Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### API Testing with Postman Collections
Import the provided Postman collection from `/docs/postman-collection.json`

## 🔧 Maintenance

### Database Backup
```bash
mysqldump -u root -p quickshop > backup.sql
```

### Log Rotation
Configure log rotation in your production environment.

## 🆘 Support

For support, email support@quickshop.echelonxventures.org or create an issue on our GitHub repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Inspired by Amazon, Flipkart, and eBay
- Built with modern technologies and best practices
- Designed for scalability and maintainability
- Focused on user experience and performance

---

Made with ❤️ by the QuickShop Team

**QuickShop** - Your one-stop destination for all your shopping needs!
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./auth/authRoutes');
const productRoutes = require('./product/productRoutes');
const userRoutes = require('./user/userRoutes');
const orderRoutes = require('./order/orderRoutes');
const paymentRoutes = require('./payment/paymentRoutes');
const cartRoutes = require('./cart/cartRoutes');
const wishlistRoutes = require('./wishlist/wishlistRoutes');
const reviewRoutes = require('./review/reviewRoutes');
const sellerRoutes = require('./seller/sellerRoutes');
const inventoryRoutes = require('./inventory/inventoryRoutes');
const chatbotRoutes = require('./chatbot/advancedChatbotController');
const analyticsRoutes = require('./analytics/advancedAnalyticsController');
const supportRoutes = require('./support/advancedSupportController');
const adminRoutes = require('./admin/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/inventory', inventoryRoutes);

// For chatbot, analytics, and support, we need to import the controllers differently
// since they might not have separate route files

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'QuickShop API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
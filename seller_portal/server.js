// sellerPortalServer.js - Seller portal server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

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

// Seller API routes
app.use('/api/seller', sellerRoutes);
app.use('/api/seller/products', productRoutes);
app.use('/api/seller/orders', orderRoutes);
app.use('/api/seller/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'QuickShop Seller Portal API is running!' });
});

app.listen(PORT, () => {
  console.log(`Seller Portal API running on port ${PORT}`);
});

module.exports = app;
const express = require('express');
const router = express.Router();
const { 
  getSellerDashboard,
  getSellerProducts,
  getSellerOrders,
  getSellerAnalytics,
  getSellerProfile,
  updateSellerProfile,
  getSellerPayouts,
  createSellerPayout
} = require('./sellerController');

// Seller dashboard
router.get('/dashboard', getSellerDashboard);

// Seller products
router.get('/products', getSellerProducts);

// Seller orders
router.get('/orders', getSellerOrders);

// Seller analytics
router.get('/analytics', getSellerAnalytics);

// Seller profile
router.get('/profile', getSellerProfile);
router.put('/profile', updateSellerProfile);

// Seller payouts
router.get('/payouts', getSellerPayouts);
router.post('/payouts', createSellerPayout);

module.exports = router;
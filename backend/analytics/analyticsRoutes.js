const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getSalesReport,
  getCustomerAnalytics,
  getProductPerformance,
  getTrafficAnalytics,
  getConversionAnalytics
} = require('./advancedAnalyticsController');

// Get dashboard analytics
router.get('/dashboard', getDashboardData);

// Get sales report
router.get('/sales', getSalesReport);

// Get customer analytics
router.get('/customers', getCustomerAnalytics);

// Get product performance
router.get('/products', getProductPerformance);

// Get traffic analytics
router.get('/traffic', getTrafficAnalytics);

// Get conversion analytics
router.get('/conversions', getConversionAnalytics);

module.exports = router;
const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  getOrders,
  getOrderById,
  updateOrder,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAnalytics,
  getSystemConfig,
  updateSystemConfig,
  getAdminAnalytics
} = require('./adminController');

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Order management
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrder);

// Product management
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Analytics
router.get('/analytics', getAnalytics);

// System configuration
router.get('/config', getSystemConfig);
router.put('/config', updateSystemConfig);

// Admin-specific analytics
router.get('/admin-analytics', getAdminAnalytics);

module.exports = router;
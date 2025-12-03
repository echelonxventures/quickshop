const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getOrders, 
  getOrderById, 
  updateOrderStatus,
  processPayment,
  getPaymentMethods
} = require('./orderController');

// Create a new order
router.post('/', createOrder);

// Get all orders for a user
router.get('/', getOrders);

// Get single order by ID
router.get('/:id', getOrderById);

// Update order status (admin/seller only)
router.put('/:id/status', updateOrderStatus);

// Process payment for an order
router.post('/payment', processPayment);

// Get available payment methods
router.get('/payment/methods', getPaymentMethods);

module.exports = router;
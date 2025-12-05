const express = require('express');
const router = express.Router();
const { createOrder, updateOrder, getOrders, getOrderById, processPayment, trackOrder, cancelOrder, returnOrder } = require('./orderController');

// Create a new order
router.post('/', createOrder);

// Get all orders for a user
router.get('/', getOrders);

// Get order by ID
router.get('/:id', getOrderById);

// Update order status
router.put('/:id', updateOrder);

// Process order payment
router.post('/:id/payment', processPayment);

// Track order status
router.get('/:id/track', trackOrder);

// Cancel order
router.post('/:id/cancel', cancelOrder);

// Return order
router.post('/:id/return', returnOrder);

module.exports = router;
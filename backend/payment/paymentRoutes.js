const express = require('express');
const router = express.Router();
const { 
  processPayment, 
  getPaymentMethods, 
  getPaymentStatus,
  refundPayment
} = require('./paymentController');

// Process payment
router.post('/', processPayment);

// Get available payment methods
router.get('/methods', getPaymentMethods);

// Get payment status for an order
router.get('/status/:orderId', getPaymentStatus);

// Refund payment
router.post('/refund', refundPayment);

module.exports = router;
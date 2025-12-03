const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart,
  clearCart,
  getCartCount
} = require('./cartController');

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/', addToCart);

// Update cart item quantity
router.put('/:productId', updateCartItem);

// Remove item from cart
router.delete('/:productId', removeFromCart);

// Clear entire cart
router.delete('/', clearCart);

// Get cart count
router.get('/count', getCartCount);

module.exports = router;
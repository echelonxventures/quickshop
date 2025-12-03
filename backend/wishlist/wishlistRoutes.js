const express = require('express');
const router = express.Router();
const { 
  getWishlist, 
  addToWishlist, 
  removeFromWishlist,
  clearWishlist,
  isProductInWishlist,
  getWishlistCount
} = require('./wishlistController');

// Get user's wishlist
router.get('/', getWishlist);

// Add item to wishlist
router.post('/', addToWishlist);

// Remove item from wishlist
router.delete('/:productId', removeFromWishlist);

// Clear entire wishlist
router.delete('/', clearWishlist);

// Check if product is in wishlist
router.get('/check/:productId', isProductInWishlist);

// Get wishlist count
router.get('/count', getWishlistCount);

module.exports = router;
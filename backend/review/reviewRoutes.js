const express = require('express');
const router = express.Router();
const { 
  addReview, 
  getReviews, 
  getReviewById, 
  updateReview, 
  deleteReview,
  getProductReviews,
  getReviewStats
} = require('./reviewController');

// Add a new review
router.post('/', addReview);

// Get all reviews (admin/seller only)
router.get('/', getReviews);

// Get review by ID
router.get('/:id', getReviewById);

// Update review (author or admin only)
router.put('/:id', updateReview);

// Delete review (author or admin only)
router.delete('/:id', deleteReview);

// Get reviews for a specific product
router.get('/product/:productId', getProductReviews);

// Get review statistics
router.get('/stats/:productId', getReviewStats);

module.exports = router;
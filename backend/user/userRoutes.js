const express = require('express');
const router = express.Router();
const { 
  getUserProfile, 
  updateUserProfile, 
  getUserOrders,
  getUserAddress,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserPreferences,
  updateUserPreferences
} = require('./userController');

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

// Get user orders
router.get('/orders', getUserOrders);

// Get user addresses
router.get('/addresses', getUserAddress);

// Add user address
router.post('/addresses', addUserAddress);

// Update user address
router.put('/addresses/:id', updateUserAddress);

// Delete user address
router.delete('/addresses/:id', deleteUserAddress);

// Get user preferences
router.get('/preferences', getUserPreferences);

// Update user preferences
router.put('/preferences', updateUserPreferences);

module.exports = router;
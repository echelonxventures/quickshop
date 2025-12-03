const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword, getProfile, updateProfile } = require('./authController');

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Forgot password
router.post('/forgot-password', forgotPassword);

// Reset password
router.put('/reset-password/:token', resetPassword);

// Get user profile
router.get('/profile', getProfile);

// Update user profile
router.put('/profile', updateProfile);

module.exports = router;
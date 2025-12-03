const express = require('express');
const router = express.Router();
const { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  getRecommendedProducts
} = require('./productController');

// Get all products with pagination and filters
router.get('/', getAllProducts);

// Search products
router.get('/search', searchProducts);

// Get products by category
router.get('/category/:categoryId', getProductsByCategory);

// Get recommended products for user
router.get('/recommended', getRecommendedProducts);

// Get single product by ID
router.get('/:id', getProductById);

// Create new product (admin/seller only)
router.post('/', createProduct);

// Update product (admin/seller only)
router.put('/:id', updateProduct);

// Delete product (admin/seller only)
router.delete('/:id', deleteProduct);

module.exports = router;
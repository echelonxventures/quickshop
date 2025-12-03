// productController.js - Product management controller
const db = require('../db');

// Get all products with pagination and filters
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    
    let query = 'SELECT * FROM products WHERE 1=1';
    let params = [];
    
    if (category) {
      query += ' AND category_id = ?';
      params.push(category);
    }
    
    if (minPrice) {
      query += ' AND price >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(maxPrice);
    }
    
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [products] = await db.pool.execute(query, params);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams = [];
    
    if (category) {
      countQuery += ' AND category_id = ?';
      countParams.push(category);
    }
    
    if (minPrice) {
      countQuery += ' AND price >= ?';
      countParams.push(minPrice);
    }
    
    if (maxPrice) {
      countQuery += ' AND price <= ?';
      countParams.push(maxPrice);
    }
    
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Simple search in name and description
    const query = `
      SELECT * FROM products 
      WHERE name LIKE ? OR description LIKE ? 
      ORDER BY name 
      LIMIT ? OFFSET ?
    `;
    const params = [`%${q}%`, `%${q}%`, parseInt(limit), parseInt(offset)];
    
    const [products] = await db.pool.execute(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total FROM products 
      WHERE name LIKE ? OR description LIKE ?
    `;
    const countParams = [`%${q}%`, `%${q}%`];
    
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error while searching products' });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT * FROM products 
      WHERE category_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [products] = await db.pool.execute(query, [categoryId, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM products WHERE category_id = ?';
    const [countResult] = await db.pool.execute(countQuery, [categoryId]);
    const total = countResult[0].total;
    
    res.status(200).json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ message: 'Server error while fetching products by category' });
  }
};

// Get recommended products for user
const getRecommendedProducts = async (req, res) => {
  try {
    // This is a simplified recommendation logic
    // In a real application, this would be more sophisticated
    const userId = req.user ? req.user.userId : null;
    
    let query;
    let params = [];
    
    if (userId) {
      // Get user's purchase history or browsing history to recommend similar products
      query = `
        SELECT DISTINCT p.* FROM products p
        JOIN orders o ON p.category_id = (
          SELECT p2.category_id 
          FROM products p2 
          JOIN order_items oi ON p2.id = oi.product_id 
          JOIN orders o2 ON oi.order_id = o2.id 
          WHERE o2.user_id = ?
          ORDER BY o2.created_at DESC 
          LIMIT 1
        )
        WHERE p.id != (
          SELECT p3.id 
          FROM products p3 
          JOIN order_items oi ON p3.id = oi.product_id 
          JOIN orders o ON oi.order_id = o.id 
          WHERE o.user_id = ? 
          ORDER BY o.created_at DESC 
          LIMIT 1
        )
        LIMIT 10
      `;
      params = [userId, userId];
    } else {
      // If user not logged in, return trending products
      query = `
        SELECT * FROM products 
        ORDER BY views DESC, created_at DESC 
        LIMIT 10
      `;
    }
    
    const [products] = await db.pool.execute(query, params);
    
    res.status(200).json({ products });
  } catch (error) {
    console.error('Get recommended products error:', error);
    res.status(500).json({ message: 'Server error while fetching recommended products' });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `;
    
    const [products] = await db.pool.execute(query, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Increment view count
    await db.pool.execute('UPDATE products SET views = views + 1 WHERE id = ?', [id]);
    
    res.status(200).json({ product: products[0] });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
};

// Create new product (admin/seller only)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category_id, stock_quantity, images, specifications } = req.body;
    const userId = req.user.userId;
    
    // Basic validation
    if (!name || !price || !category_id) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }
    
    // Check if the user is seller or admin
    const userQuery = 'SELECT role FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'seller')) {
      return res.status(403).json({ message: 'Access denied. Only admin and seller can create products.' });
    }
    
    const query = `
      INSERT INTO products (name, description, price, category_id, stock_quantity, images, specifications, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.pool.execute(query, [
      name, 
      description, 
      price, 
      category_id, 
      stock_quantity || 0, 
      JSON.stringify(images || []), 
      JSON.stringify(specifications || {}), 
      userId
    ]);
    
    // Update category product count
    await db.pool.execute('UPDATE categories SET product_count = product_count + 1 WHERE id = ?', [category_id]);
    
    res.status(201).json({ 
      message: 'Product created successfully', 
      productId: result.insertId 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error while creating product' });
  }
};

// Update product (admin/seller only)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, stock_quantity, images, specifications } = req.body;
    const userId = req.user.userId;
    
    // Check if the user is seller or admin
    const userQuery = 'SELECT role FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'seller')) {
      return res.status(403).json({ message: 'Access denied. Only admin and seller can update products.' });
    }
    
    // Check if product exists and if user has permission to update it
    const productQuery = 'SELECT created_by FROM products WHERE id = ?';
    const [products] = await db.pool.execute(productQuery, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    if (users[0].role !== 'admin' && product.created_by !== userId) {
      return res.status(403).json({ message: 'Access denied. You can only update products you created.' });
    }
    
    const query = `
      UPDATE products 
      SET name = ?, description = ?, price = ?, category_id = ?, stock_quantity = ?, 
          images = ?, specifications = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.pool.execute(query, [
      name, description, price, category_id, stock_quantity, 
      JSON.stringify(images || []), JSON.stringify(specifications || {}), id
    ]);
    
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error while updating product' });
  }
};

// Delete product (admin/seller only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if the user is seller or admin
    const userQuery = 'SELECT role FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'seller')) {
      return res.status(403).json({ message: 'Access denied. Only admin and seller can delete products.' });
    }
    
    // Check if product exists and if user has permission to delete it
    const productQuery = 'SELECT created_by, category_id FROM products WHERE id = ?';
    const [products] = await db.pool.execute(productQuery, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    if (users[0].role !== 'admin' && product.created_by !== userId) {
      return res.status(403).json({ message: 'Access denied. You can only delete products you created.' });
    }
    
    // Delete product
    await db.pool.execute('DELETE FROM products WHERE id = ?', [id]);
    
    // Update category product count
    await db.pool.execute('UPDATE categories SET product_count = product_count - 1 WHERE id = ?', [product.category_id]);
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error while deleting product' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  getRecommendedProducts
};
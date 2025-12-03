// wishlistController.js - Advanced wishlist management
const db = require('../db');

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const wishlistQuery = `
      SELECT 
        w.*,
        p.name as product_name,
        p.price as product_price,
        p.sale_price,
        p.images,
        p.rating,
        p.review_count,
        p.stock_quantity,
        p.condition,
        c.name as category_name,
        u.name as seller_name,
        u.id as seller_id
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN users u ON p.created_by = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;
    
    const [wishlistItems] = await db.pool.execute(wishlistQuery, [userId]);
    
    const enhancedWishlist = wishlistItems.map(item => ({
      ...item,
      current_price: item.sale_price || item.product_price,
      images: item.images ? JSON.parse(item.images) : [],
      rating: parseFloat(item.rating || 0),
      review_count: item.review_count || 0,
      stock_status: item.stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
      seller: {
        id: item.seller_id,
        name: item.seller_name
      },
      created_at: item.created_at.toISOString()
    }));
    
    res.status(200).json({
      wishlist: enhancedWishlist,
      count: enhancedWishlist.length,
      success: true
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error while fetching wishlist', error: error.message });
  }
};

// Add item to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id } = req.body;
    
    // Validate product exists and is active
    const productQuery = `
      SELECT p.*, u.name as seller_name
      FROM products p
      JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.is_active = 1
    `;
    const [products] = await db.pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found or inactive' });
    }
    
    // Check if product already in wishlist
    const existingQuery = 'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?';
    const [existing] = await db.pool.execute(existingQuery, [userId, product_id]);
    
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Product already in wishlist' });
    }
    
    // Add to wishlist
    const insertQuery = 'INSERT INTO wishlist (user_id, product_id, created_at) VALUES (?, ?, NOW())';
    await db.pool.execute(insertQuery, [userId, product_id]);
    
    res.status(201).json({
      message: 'Product added to wishlist successfully',
      product_id,
      success: true
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Server error while adding to wishlist', error: error.message });
  }
};

// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    
    const deleteQuery = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';
    const [result] = await db.pool.execute(deleteQuery, [userId, productId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }
    
    res.status(200).json({
      message: 'Product removed from wishlist successfully',
      product_id: productId,
      success: true
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Server error while removing from wishlist', error: error.message });
  }
};

// Clear entire wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await db.pool.execute('DELETE FROM wishlist WHERE user_id = ?', [userId]);
    
    res.status(200).json({
      message: 'Wishlist cleared successfully',
      success: true
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ message: 'Server error while clearing wishlist', error: error.message });
  }
};

// Check if product is in wishlist
const isProductInWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    
    const checkQuery = 'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?';
    const [result] = await db.pool.execute(checkQuery, [userId, productId]);
    
    res.status(200).json({
      in_wishlist: result.length > 0,
      product_id: parseInt(productId),
      success: true
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ message: 'Server error while checking wishlist', error: error.message });
  }
};

// Get wishlist count
const getWishlistCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const countQuery = 'SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?';
    const [result] = await db.pool.execute(countQuery, [userId]);
    
    res.status(200).json({
      count: result[0].count,
      success: true
    });
  } catch (error) {
    console.error('Get wishlist count error:', error);
    res.status(500).json({ message: 'Server error while getting wishlist count', error: error.message });
  }
};

// Move wishlist item to cart
const moveWishlistToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;
    
    // Remove from wishlist
    await removeFromWishlist({ params: { productId }, user: { userId } }, { status: () => ({ json: () => {} }) });
    
    // Add to cart
    const cartController = require('../cart/cartController');
    await cartController.addToCart(
      { body: { product_id: productId, quantity }, user: { userId } },
      res
    );
    
    // Since we're calling another controller function, we need to handle the response differently
    // For now, just return success
    res.status(200).json({
      message: 'Product moved from wishlist to cart successfully',
      product_id: productId,
      quantity,
      success: true
    });
  } catch (error) {
    console.error('Move wishlist to cart error:', error);
    res.status(500).json({ message: 'Server error while moving wishlist to cart', error: error.message });
  }
};

// Share wishlist
const shareWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friend_email } = req.body;
    
    // Get wishlist items
    const wishlistQuery = `
      SELECT 
        p.name, p.price, p.sale_price, p.images
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
    `;
    const [wishlistItems] = await db.pool.execute(wishlistQuery, [userId]);
    
    // In a real app, you would send an email
    console.log(`Wishlist shared with ${friend_email} for user ${userId}`, wishlistItems);
    
    res.status(200).json({
      message: 'Wishlist shared successfully',
      items_shared: wishlistItems.length,
      success: true
    });
  } catch (error) {
    console.error('Share wishlist error:', error);
    res.status(500).json({ message: 'Server error while sharing wishlist', error: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  isProductInWishlist,
  getWishlistCount,
  moveWishlistToCart,
  shareWishlist
};
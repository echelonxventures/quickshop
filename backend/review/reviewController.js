// reviewController.js - Advanced review management
const db = require('../db');

// Add a new review
const addReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, rating, title, review, order_id } = req.body;
    
    // Validate required fields
    if (!product_id || !rating || !review) {
      return res.status(400).json({ message: 'Product ID, rating, and review are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if user purchased the product (if order_id provided)
    if (order_id) {
      const orderCheckQuery = `
        SELECT oi.product_id 
        FROM order_items oi 
        JOIN orders o ON oi.order_id = o.id 
        WHERE o.id = ? AND o.user_id = ? AND oi.product_id = ?
      `;
      const [orderResults] = await db.pool.execute(orderCheckQuery, [order_id, userId, product_id]);
      
      if (orderResults.length === 0) {
        return res.status(400).json({ message: 'You must have purchased this product to review it' });
      }
    }
    
    // Check if user already reviewed this product
    const existingReviewQuery = 'SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ?';
    const [existingReviews] = await db.pool.execute(existingReviewQuery, [userId, product_id]);
    
    if (existingReviews.length > 0) {
      return res.status(409).json({ message: 'You have already reviewed this product' });
    }
    
    // Insert review
    const insertQuery = `
      INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, review, is_verified_purchase, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const [result] = await db.pool.execute(insertQuery, [
      product_id,
      userId,
      order_id || null,
      rating,
      title || '',
      review,
      order_id ? 1 : 0
    ]);
    
    // Update product rating
    await updateProductRating(product_id);
    
    res.status(201).json({
      message: 'Review added successfully',
      review_id: result.insertId,
      success: true
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error while adding review', error: error.message });
  }
};

// Get all reviews (admin/seller only)
const getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = null, product_id = null, user_id = null } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status) {
      whereClause += ' AND pr.is_approved = ?';
      params.push(status === 'approved' ? 1 : 0);
    }
    
    if (product_id) {
      whereClause += ' AND pr.product_id = ?';
      params.push(product_id);
    }
    
    if (user_id) {
      whereClause += ' AND pr.user_id = ?';
      params.push(user_id);
    }
    
    const query = `
      SELECT 
        pr.*,
        u.name as user_name,
        u.avatar as user_avatar,
        p.name as product_name,
        p.images as product_images
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      JOIN products p ON pr.product_id = p.id
      ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [reviews] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      JOIN products p ON pr.product_id = p.id
      ${whereClause.replace('ORDER BY', 'AND')}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      reviews: reviews.map(review => ({
        ...review,
        product_images: review.product_images ? JSON.parse(review.product_images) : [],
        helpful_count: review.helpful_count || 0,
        is_approved: review.is_approved === 1,
        is_verified_purchase: review.is_verified_purchase === 1,
        created_at: review.created_at.toISOString()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      success: true
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching reviews', error: error.message });
  }
};

// Get review by ID
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        pr.*,
        u.name as user_name,
        u.avatar as user_avatar,
        p.name as product_name
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      JOIN products p ON pr.product_id = p.id
      WHERE pr.id = ?
    `;
    
    const [reviews] = await db.pool.execute(query, [id]);
    
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    const review = reviews[0];
    
    res.status(200).json({
      review: {
        ...review,
        helpful_count: review.helpful_count || 0,
        is_approved: review.is_approved === 1,
        is_verified_purchase: review.is_verified_purchase === 1,
        created_at: review.created_at.toISOString()
      },
      success: true
    });
  } catch (error) {
    console.error('Get review by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching review', error: error.message });
  }
};

// Update review (author or admin only)
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { rating, title, review: reviewText } = req.body;
    
    // Get existing review to check permissions
    const reviewQuery = 'SELECT user_id, product_id FROM product_reviews WHERE id = ?';
    const [reviews] = await db.pool.execute(reviewQuery, [id]);
    
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    const review = reviews[0];
    
    // Check permissions
    const hasPermission = (
      userRole === 'admin' || 
      review.user_id === userId
    );
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update review
    const updateQuery = `
      UPDATE product_reviews 
      SET rating = COALESCE(?, rating), 
          title = COALESCE(?, title), 
          review = COALESCE(?, review), 
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.pool.execute(updateQuery, [rating, title, reviewText, id]);
    
    // Update product rating
    await updateProductRating(review.product_id);
    
    res.status(200).json({
      message: 'Review updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error while updating review', error: error.message });
  }
};

// Delete review (author or admin only)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Get existing review to check permissions and product ID
    const reviewQuery = 'SELECT user_id, product_id FROM product_reviews WHERE id = ?';
    const [reviews] = await db.pool.execute(reviewQuery, [id]);
    
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    const review = reviews[0];
    
    // Check permissions
    const hasPermission = (
      userRole === 'admin' || 
      review.user_id === userId
    );
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Delete review
    await db.pool.execute('DELETE FROM product_reviews WHERE id = ?', [id]);
    
    // Update product rating
    await updateProductRating(review.product_id);
    
    res.status(200).json({
      message: 'Review deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error while deleting review', error: error.message });
  }
};

// Get reviews for a specific product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC', verified_only = false } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE pr.product_id = ? AND pr.is_approved = 1';
    let params = [productId];
    
    if (verified_only === 'true') {
      whereClause += ' AND pr.is_verified_purchase = 1';
    }
    
    const query = `
      SELECT 
        pr.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      ${whereClause}
      ORDER BY pr.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [reviews] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_reviews pr
      WHERE pr.product_id = ? AND pr.is_approved = 1
      ${verified_only === 'true' ? 'AND pr.is_verified_purchase = 1' : ''}
    `;
    const [countResult] = await db.pool.execute(countQuery, [productId]);
    const total = countResult[0].total;
    
    // Get product rating stats
    const statsQuery = `
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1
      FROM product_reviews
      WHERE product_id = ? AND is_approved = 1
    `;
    const [stats] = await db.pool.execute(statsQuery, [productId]);
    
    res.status(200).json({
      reviews: reviews.map(review => ({
        ...review,
        helpful_count: review.helpful_count || 0,
        is_verified_purchase: review.is_verified_purchase === 1,
        created_at: review.created_at.toISOString()
      })),
      stats: stats[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      success: true
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching product reviews', error: error.message });
  }
};

// Get review statistics for a product
const getReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const statsQuery = `
      SELECT 
        p.name as product_name,
        AVG(pr.rating) as avg_rating,
        COUNT(pr.id) as total_reviews,
        COUNT(CASE WHEN pr.is_verified_purchase = 1 THEN 1 END) as verified_reviews,
        COUNT(CASE WHEN pr.rating = 5 THEN 1 END) as rating_5,
        COUNT(CASE WHEN pr.rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN pr.rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN pr.rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN pr.rating = 1 THEN 1 END) as rating_1
      FROM products p
      LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = 1
      WHERE p.id = ?
      GROUP BY p.id
    `;
    
    const [stats] = await db.pool.execute(statsQuery, [productId]);
    
    if (stats.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const result = stats[0];
    result.avg_rating = parseFloat(result.avg_rating || 0).toFixed(1);
    
    res.status(200).json({
      stats: result,
      success: true
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error while fetching review stats', error: error.message });
  }
};

// Helper function to update product rating
const updateProductRating = async (productId) => {
  try {
    const ratingQuery = `
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as review_count
      FROM product_reviews 
      WHERE product_id = ? AND is_approved = 1
    `;
    
    const [ratings] = await db.pool.execute(ratingQuery, [productId]);
    
    const avgRating = ratings[0]?.avg_rating || 0;
    const reviewCount = ratings[0]?.review_count || 0;
    
    await db.pool.execute(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?',
      [parseFloat(avgRating).toFixed(2), reviewCount, productId]
    );
  } catch (error) {
    console.error('Update product rating error:', error);
  }
};

// Mark review as helpful
const markReviewHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if user already marked this review as helpful
    const checkQuery = 'SELECT id FROM review_helpfulness WHERE review_id = ? AND user_id = ?';
    const [existing] = await db.pool.execute(checkQuery, [id, userId]);
    
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already marked this review as helpful' });
    }
    
    // Insert helpfulness record
    const insertQuery = 'INSERT INTO review_helpfulness (review_id, user_id, helpful, created_at) VALUES (?, ?, 1, NOW())';
    await db.pool.execute(insertQuery, [id, userId]);
    
    // Update helpful count
    await db.pool.execute('UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = ?', [id]);
    
    res.status(200).json({
      message: 'Review marked as helpful',
      success: true
    });
  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({ message: 'Server error while marking review as helpful', error: error.message });
  }
};

module.exports = {
  addReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getProductReviews,
  getReviewStats,
  markReviewHelpful
};
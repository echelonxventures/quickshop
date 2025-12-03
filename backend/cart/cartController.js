// cartController.js - Advanced cart management
const db = require('../db');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const cartQuery = `
      SELECT 
        c.*,
        p.name as product_name,
        p.price as product_price,
        p.sale_price,
        p.images,
        p.stock_quantity,
        p.reserved_quantity,
        p.condition,
        p.free_shipping,
        u.name as seller_name,
        u.id as seller_id
      FROM cart c
      JOIN products p ON c.product_id = p.id
      JOIN users u ON p.created_by = u.id
      WHERE c.user_id = ?
    `;
    
    const [cartItems] = await db.pool.execute(cartQuery, [userId]);
    
    // Calculate totals
    let subtotal = 0;
    let totalItems = 0;
    let totalDiscount = 0;
    
    const enhancedCartItems = cartItems.map(item => {
      const price = item.sale_price || item.product_price;
      const itemTotal = price * item.quantity;
      
      subtotal += itemTotal;
      totalItems += item.quantity;
      
      return {
        ...item,
        current_price: price,
        item_total: itemTotal,
        images: item.images ? JSON.parse(item.images) : [],
        available_stock: item.stock_quantity - item.reserved_quantity,
        can_add_more: (item.stock_quantity - item.reserved_quantity) > item.quantity,
        seller: {
          id: item.seller_id,
          name: item.seller_name
        }
      };
    });
    
    // Calculate potential discount from coupons
    // This would be more complex in a real implementation
    
    res.status(200).json({
      cart: enhancedCartItems,
      totals: {
        subtotal,
        totalItems,
        total: subtotal, // In a real app, would include tax/shipping
        discount: totalDiscount,
        tax: subtotal * 0.08, // 8% tax placeholder
        shipping: enhancedCartItems.some(item => !item.free_shipping) ? 5.99 : 0
      },
      success: true
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error while fetching cart', error: error.message });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id, quantity = 1, variant_id = null } = req.body;
    
    // Validate product exists and is active
    const productQuery = `
      SELECT 
        p.*, 
        (p.stock_quantity - p.reserved_quantity) as available_stock,
        u.name as seller_name,
        u.id as seller_id
      FROM products p
      JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.is_active = 1
    `;
    const [products] = await db.pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found or inactive' });
    }
    
    const product = products[0];
    
    // Check inventory
    if (product.available_stock < quantity) {
      return res.status(400).json({ 
        message: `Only ${product.available_stock} items available in stock`,
        available_stock: product.available_stock
      });
    }
    
    // Check if item already in cart
    const existingCartQuery = 'SELECT * FROM cart WHERE user_id = ? AND product_id = ?';
    const [existingItems] = await db.pool.execute(existingCartQuery, [userId, product_id]);
    
    if (existingItems.length > 0) {
      // Update existing cart item
      const newQuantity = existingItems[0].quantity + quantity;
      
      if (product.available_stock < newQuantity) {
        return res.status(400).json({ 
          message: `Cannot add ${quantity} more items. Only ${product.available_stock - existingItems[0].quantity} available`,
          available_stock: product.available_stock
        });
      }
      
      const updateQuery = 'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ?';
      await db.pool.execute(updateQuery, [newQuantity, userId, product_id]);
    } else {
      // Add new cart item
      const insertQuery = `
        INSERT INTO cart (user_id, product_id, quantity, price, created_at, updated_at, variant_id)
        VALUES (?, ?, ?, ?, NOW(), NOW(), ?)
      `;
      
      await db.pool.execute(insertQuery, [
        userId,
        product_id,
        quantity,
        product.sale_price || product.price,
        variant_id
      ]);
    }
    
    res.status(200).json({
      message: 'Item added to cart successfully',
      product_id,
      quantity: quantity,
      available_stock: product.available_stock - quantity,
      success: true
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error while adding to cart', error: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    
    // Get current cart item and product info
    const cartItemQuery = `
      SELECT c.*, p.stock_quantity, p.reserved_quantity 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ? AND c.product_id = ?
    `;
    const [cartItems] = await db.pool.execute(cartItemQuery, [userId, productId]);
    
    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    
    const cartItem = cartItems[0];
    const availableStock = cartItem.stock_quantity - cartItem.reserved_quantity;
    
    if (availableStock < quantity) {
      return res.status(400).json({ 
        message: `Only ${availableStock} items available in stock`,
        available_stock: availableStock
      });
    }
    
    // Update quantity
    const updateQuery = 'UPDATE cart SET quantity = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ?';
    await db.pool.execute(updateQuery, [quantity, userId, productId]);
    
    res.status(200).json({
      message: 'Cart item updated successfully',
      product_id: productId,
      quantity: quantity,
      success: true
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Server error while updating cart item', error: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    
    const deleteQuery = 'DELETE FROM cart WHERE user_id = ? AND product_id = ?';
    const [result] = await db.pool.execute(deleteQuery, [userId, productId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    
    res.status(200).json({
      message: 'Item removed from cart successfully',
      product_id: productId,
      success: true
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error while removing item from cart', error: error.message });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await db.pool.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
    
    res.status(200).json({
      message: 'Cart cleared successfully',
      success: true
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error while clearing cart', error: error.message });
  }
};

// Get cart count
const getCartCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const countQuery = 'SELECT COUNT(*) as count, SUM(quantity) as total_items FROM cart WHERE user_id = ?';
    const [result] = await db.pool.execute(countQuery, [userId]);
    
    res.status(200).json({
      count: result[0].count,
      total_items: result[0].total_items || 0,
      success: true
    });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({ message: 'Server error while getting cart count', error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
};
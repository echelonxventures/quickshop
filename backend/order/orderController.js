// orderController.js - Order management controller
const db = require('../db');

// Create a new order
const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shipping_address_id, billing_address_id, payment_method, coupon_code } = req.body;
    
    // Get cart items for the user
    const cartQuery = `
      SELECT c.product_id, c.quantity, c.price, p.name as product_name
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `;
    const [cartItems] = await db.pool.execute(cartQuery, [userId]);
    
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Calculate order totals
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += item.price * item.quantity;
    }
    
    // Apply coupon if provided
    let discount_amount = 0;
    let coupon_id = null;
    if (coupon_code) {
      const couponQuery = `
        SELECT id, type, value, max_discount_amount, usage_limit, used_count
        FROM coupons
        WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
      `;
      const [coupons] = await db.pool.execute(couponQuery, [coupon_code]);
      
      if (coupons.length > 0) {
        const coupon = coupons[0];
        
        // Check usage limit
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
          return res.status(400).json({ message: 'Coupon usage limit reached' });
        }
        
        if (coupon.type === 'percentage') {
          discount_amount = Math.min(subtotal * (coupon.value / 100), coupon.max_discount_amount || Infinity);
        } else if (coupon.type === 'fixed_amount') {
          discount_amount = Math.min(coupon.value, coupon.max_discount_amount || coupon.value);
        }
        
        coupon_id = coupon.id;
      } else {
        return res.status(400).json({ message: 'Invalid or expired coupon' });
      }
    }
    
    // Calculate taxes and shipping (simplified)
    const tax_rate = parseFloat(process.env.TAX_RATE || 0.085);
    const tax_amount = subtotal * tax_rate;
    const shipping_cost = 0; // Will be calculated based on shipping method
    
    const total_amount = subtotal - discount_amount + tax_amount + shipping_cost;
    
    // Generate unique order number
    const order_number = `QS${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Start transaction
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert order
      const orderQuery = `
        INSERT INTO orders (
          user_id, order_number, subtotal, tax_amount, shipping_cost, 
          discount_amount, total_amount, shipping_address_id, billing_address_id,
          payment_method, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      const [orderResult] = await connection.execute(orderQuery, [
        userId, order_number, subtotal, tax_amount, shipping_cost,
        discount_amount, total_amount, shipping_address_id, billing_address_id,
        payment_method
      ]);
      
      const orderId = orderResult.insertId;
      
      // Insert order items
      const orderItemsQuery = `
        INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, total_price)
        VALUES ?
      `;
      const orderItemsValues = cartItems.map(item => [
        orderId, 
        item.product_id, 
        item.product_name, 
        item.price, 
        item.quantity, 
        item.price * item.quantity
      ]);
      
      await connection.query(orderItemsQuery, [orderItemsValues]);
      
      // Update product stock quantities
      for (const item of cartItems) {
        const updateStockQuery = `
          UPDATE products 
          SET stock_quantity = stock_quantity - ?, sold_quantity = sold_quantity + ?
          WHERE id = ? AND stock_quantity >= ?
        `;
        const [updateResult] = await connection.execute(updateStockQuery, [
          item.quantity, 
          item.quantity, 
          item.product_id, 
          item.quantity
        ]);
        
        if (updateResult.affectedRows === 0) {
          throw new Error(`Insufficient stock for product ID: ${item.product_id}`);
        }
      }
      
      // Update coupon usage if applicable
      if (coupon_id) {
        await connection.execute(
          'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
          [coupon_id]
        );
        
        // Add coupon usage record
        await connection.execute(
          'INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES (?, ?, ?)',
          [coupon_id, userId, orderId]
        );
      }
      
      // Clear user's cart
      await connection.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
      
      await connection.commit();
      connection.release();
      
      res.status(201).json({ 
        message: 'Order created successfully', 
        order_id: orderId,
        order_number,
        total_amount
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
};

// Get all orders for a user
const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT o.*, u.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [orders] = await db.pool.execute(query, [userId, limit, offset]);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const [countResult] = await db.pool.execute(countQuery, [userId]);
    const total = countResult[0].total;
    
    res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error while fetching orders' });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const query = `
      SELECT o.*, u.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.user_id = ?
    `;
    
    const [orders] = await db.pool.execute(query, [id, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get order items
    const itemsQuery = `
      SELECT oi.*, p.images
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    const [items] = await db.pool.execute(itemsQuery, [id]);
    
    const order = orders[0];
    order.items = items;
    
    res.status(200).json({ order });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching order' });
  }
};

// Update order status (admin/seller only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    
    // Check if user is admin or seller
    const userQuery = 'SELECT role FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0 || (users[0].role !== 'admin' && users[0].role !== 'seller')) {
      return res.status(403).json({ message: 'Access denied. Only admin and seller can update order status.' });
    }
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    
    // Update order status
    const query = 'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?';
    const [result] = await db.pool.execute(query, [status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // If order is cancelled, return stock to products
    if (status === 'cancelled') {
      const connection = await db.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Get order items
        const itemsQuery = 'SELECT product_id, quantity FROM order_items WHERE order_id = ?';
        const [items] = await connection.execute(itemsQuery, [id]);
        
        // Return stock to products
        for (const item of items) {
          await connection.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
        
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    
    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error while updating order status' });
  }
};

// Process payment for an order
const processPayment = async (req, res) => {
  try {
    const { order_id, payment_method, payment_data } = req.body;
    const userId = req.user.userId;
    
    // Verify order belongs to user
    const orderQuery = 'SELECT * FROM orders WHERE id = ? AND user_id = ?';
    const [orders] = await db.pool.execute(orderQuery, [order_id, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found or does not belong to user' });
    }
    
    const order = orders[0];
    if (order.payment_status !== 'pending') {
      return res.status(400).json({ message: 'Payment already processed for this order' });
    }
    
    // Process payment based on method
    let payment_success = false;
    let transaction_id = null;
    
    switch (payment_method) {
      case 'stripe':
        // Stripe payment processing would go here
        // In a real implementation, you would call Stripe API
        payment_success = true;
        transaction_id = `stripe_${Date.now()}`;
        break;
        
      case 'paypal':
        // PayPal payment processing would go here
        // In a real implementation, you would call PayPal API
        payment_success = true;
        transaction_id = `paypal_${Date.now()}`;
        break;
        
      case 'razorpay':
        // Razorpay payment processing would go here
        // In a real implementation, you would call Razorpay API
        payment_success = true;
        transaction_id = `razorpay_${Date.now()}`;
        break;
        
      default:
        return res.status(400).json({ message: 'Unsupported payment method' });
    }
    
    if (payment_success) {
      // Update order payment status
      const updateOrderQuery = `
        UPDATE orders 
        SET payment_status = 'paid', payment_method = ?, payment_transaction_id = ?
        WHERE id = ?
      `;
      await db.pool.execute(updateOrderQuery, [payment_method, transaction_id, order_id]);
      
      // Insert payment record
      const paymentQuery = `
        INSERT INTO payments (order_id, payment_gateway, transaction_id, amount, currency, status, payment_method, payment_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.pool.execute(paymentQuery, [
        order_id, 
        payment_method, 
        transaction_id, 
        order.total_amount, 
        order.currency, 
        'completed', 
        payment_method, 
        JSON.stringify(payment_data || {})
      ]);
      
      // Update order status to confirmed
      await db.pool.execute('UPDATE orders SET status = "confirmed", updated_at = NOW() WHERE id = ?', [order_id]);
      
      res.status(200).json({ 
        message: 'Payment processed successfully', 
        order_id,
        transaction_id,
        payment_status: 'paid'
      });
    } else {
      // Payment failed
      await db.pool.execute('UPDATE orders SET payment_status = "failed" WHERE id = ?', [order_id]);
      
      res.status(400).json({ 
        message: 'Payment processing failed', 
        order_id,
        payment_status: 'failed'
      });
    }
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Server error while processing payment' });
  }
};

// Get available payment methods
const getPaymentMethods = async (req, res) => {
  try {
    // In a real implementation, this might check which payment methods are enabled in system config
    const paymentMethods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card (Stripe)',
        enabled: true,
        icon: 'credit-card'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        enabled: true,
        icon: 'paypal'
      },
      {
        id: 'razorpay',
        name: 'Razorpay',
        enabled: true,
        icon: 'wallet'
      }
    ];
    
    res.status(200).json({ payment_methods: paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error while fetching payment methods' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  processPayment,
  getPaymentMethods
};
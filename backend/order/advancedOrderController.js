// advancedOrderController.js - Advanced order management with multi-vendor, affiliate, and analytics
const db = require('../db');

// Create advanced order with multi-vendor support and affiliate tracking
const createAdvancedOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      shipping_address_id,
      billing_address_id,
      payment_method,
      coupon_code,
      gift_wrap = false,
      gift_message = '',
      shipping_method = 'standard',
      special_instructions = '',
      is_business_order = false,
      tax_exempt = false,
      affiliate_id = null,
      referrer_info = null
    } = req.body;
    
    // Validate required fields
    if (!shipping_address_id || !billing_address_id || !payment_method) {
      return res.status(400).json({ message: 'Shipping/billing addresses and payment method are required' });
    }
    
    // Get cart items for the user
    const cartQuery = `
      SELECT 
        c.*,
        p.name as product_name,
        p.price as product_price,
        p.stock_quantity,
        p.reserved_quantity,
        p.sold_quantity,
        p.images,
        p.category_id,
        p.brand_id,
        p.condition,
        p.free_shipping,
        p.weight,
        p.attributes,
        u.id as seller_id,
        u.name as seller_name,
        u.role as seller_role
      FROM cart c
      JOIN products p ON c.product_id = p.id
      JOIN users u ON p.created_by = u.id
      WHERE c.user_id = ?
    `;
    const [cartItems] = await db.pool.execute(cartQuery, [userId]);
    
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Validate inventory availability and calculate totals
    let subtotal = 0;
    let tax_total = 0;
    let shipping_total = 0;
    let discount_total = 0;
    let item_count = 0;
    
    // Group items by seller for multi-vendor orders
    const sellerItems = {};
    for (const item of cartItems) {
      // Check inventory
      const availableStock = item.stock_quantity - item.reserved_quantity;
      if (availableStock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for "${item.product_name}". Only ${availableStock} available.` 
        });
      }
      
      // Calculate item total
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      item_count += item.quantity;
      
      // Group by seller
      const sellerId = item.seller_id;
      if (!sellerItems[sellerId]) {
        sellerItems[sellerId] = {
          seller: { id: item.seller_id, name: item.seller_name, role: item.seller_role },
          items: [],
          subtotal: 0,
          shipping_cost: 0,
          tax: 0
        };
      }
      sellerItems[sellerId].items.push(item);
      sellerItems[sellerId].subtotal += itemTotal;
    }
    
    // Apply coupon discount
    if (coupon_code) {
      const couponQuery = `
        SELECT * FROM coupons 
        WHERE code = ? AND is_active = 1 
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (usage_limit IS NULL OR used_count < usage_limit)
      `;
      const [coupons] = await db.pool.execute(couponQuery, [coupon_code]);
      
      if (coupons.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired coupon code' });
      }
      
      const coupon = coupons[0];
      
      // Validate minimum order amount
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        return res.status(400).json({ 
          message: `Coupon requires minimum order amount of $${coupon.min_order_amount}` 
        });
      }
      
      // Calculate discount
      if (coupon.type === 'percentage') {
        discount_total = Math.min(subtotal * (coupon.value / 100), coupon.max_discount_amount || Infinity);
      } else if (coupon.type === 'fixed_amount') {
        discount_total = Math.min(coupon.value, coupon.max_discount_amount || coupon.value);
      }
      
      // Ensure discount doesn't exceed subtotal
      discount_total = Math.min(discount_total, subtotal);
    }
    
    // Calculate taxes (simplified, in a real app this would be more complex)
    const tax_rate = await getTaxRate(billing_address_id, userId);
    tax_total = (subtotal - discount_total) * (tax_rate / 100);
    
    // Calculate shipping costs (per seller in multi-vendor)
    const shippingMethods = await getShippingMethods(shipping_method);
    for (const sellerId in sellerItems) {
      const sellerData = sellerItems[sellerId];
      
      // Calculate shipping based on items, weight, distance, etc.
      let sellerShippingCost = 0;
      let totalWeight = 0;
      
      for (const item of sellerData.items) {
        totalWeight += (item.weight || 0.5) * item.quantity; // Default 0.5kg per item
        
        // If item offers free shipping
        if (item.free_shipping) {
          sellerShippingCost = 0;
        } else {
          // Calculate shipping based on weight and distance
          sellerShippingCost += await calculateShippingCost(totalWeight, shipping_method, shipping_address_id);
        }
      }
      
      sellerData.shipping_cost = sellerShippingCost;
      shipping_total += sellerShippingCost;
    }
    
    // Calculate final total
    const total_amount = Math.max(0, subtotal - discount_total + tax_total + shipping_total);
    
    // Generate unique order number
    const order_number = await generateUniqueOrderNumber();
    
    // Start transaction for atomic order creation
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert main order
      const orderQuery = `
        INSERT INTO orders (
          user_id, order_number, status, payment_status, payment_method,
          subtotal, tax_amount, shipping_cost, discount_amount, total_amount,
          shipping_address_id, billing_address_id, notes, shipping_method,
          gift_wrap, gift_message, special_instructions, is_business_order, tax_exempt,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const [orderResult] = await connection.execute(orderQuery, [
        userId,
        order_number,
        'pending', // Initial status
        'pending', // Payment status will be updated after payment
        payment_method,
        subtotal,
        tax_total,
        shipping_total,
        discount_total,
        total_amount,
        shipping_address_id,
        billing_address_id,
        special_instructions,
        shipping_method,
        gift_wrap,
        gift_message,
        special_instructions,
        is_business_order,
        tax_exempt
      ]);
      
      const orderId = orderResult.insertId;
      
      // Insert order items for each seller
      for (const sellerId in sellerItems) {
        const sellerData = sellerItems[sellerId];
        
        for (const item of sellerData.items) {
          const orderItemQuery = `
            INSERT INTO order_items (
              order_id, product_id, product_name, product_price, quantity, 
              subtotal, tax, shipping_cost, seller_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          
          await connection.execute(orderItemQuery, [
            orderId,
            item.product_id,
            item.product_name,
            item.price,
            item.quantity,
            item.price * item.quantity,
            (item.price * item.quantity) * (tax_rate / 100),
            item.free_shipping ? 0 : await calculateShippingCost(item.weight || 0.5, shipping_method, shipping_address_id),
            sellerData.seller.id
          ]);
        }
        
        // Update seller inventory
        for (const item of sellerData.items) {
          const updateInventoryQuery = `
            UPDATE products 
            SET reserved_quantity = reserved_quantity + ?, sold_quantity = sold_quantity + ?
            WHERE id = ? AND stock_quantity >= ?
          `;
          
          const [updateResult] = await connection.execute(updateInventoryQuery, [
            item.quantity,
            item.quantity,
            item.product_id,
            item.quantity
          ]);
          
          if (updateResult.affectedRows === 0) {
            throw new Error(`Insufficient stock for product ID: ${item.product_id}`);
          }
        }
      }
      
      // Apply coupon usage
      if (coupon_code) {
        await connection.execute(
          'UPDATE coupons SET used_count = used_count + 1 WHERE code = ?',
          [coupon_code]
        );
        
        await connection.execute(
          'INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES ((SELECT id FROM coupons WHERE code = ?), ?, ?)',
          [coupon_code, userId, orderId]
        );
      }
      
      // Record affiliate commission if applicable
      if (affiliate_id) {
        await createAffiliateCommission(connection, userId, orderId, total_amount, affiliate_id);
      }
      
      // Record referrer information
      if (referrer_info) {
        await connection.execute(
          'INSERT INTO user_referrals (user_id, referrer_id, order_id, referrer_info) VALUES (?, ?, ?, ?)',
          [userId, referrer_info.referrer_id || null, orderId, JSON.stringify(referrer_info)]
        );
      }
      
      // Clear user's cart
      await connection.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
      
      // Update user's order count and total spent
      await connection.execute(`
        UPDATE user_stats 
        SET total_orders = total_orders + 1, 
            total_spent = total_spent + ?,
            last_order_date = NOW()
        WHERE user_id = ?
        ON DUPLICATE KEY UPDATE 
            total_orders = total_orders + 1,
            total_spent = total_spent + ?,
            last_order_date = NOW()
      `, [total_amount, userId, total_amount]);
      
      await connection.commit();
      connection.release();
      
      // Process payment asynchronously
      setTimeout(async () => {
        try {
          const paymentResult = await processPayment(orderId, payment_method, total_amount);
          if (paymentResult.success) {
            await db.pool.execute(
              'UPDATE orders SET payment_status = "paid", status = "confirmed" WHERE id = ?',
              [orderId]
            );
            
            // Update product inventory (move from reserved to sold)
            const orderItems = await db.pool.execute(
              'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
              [orderId]
            );
            
            for (const item of orderItems[0]) {
              await db.pool.execute(
                'UPDATE products SET reserved_quantity = GREATEST(0, reserved_quantity - ?) WHERE id = ?',
                [item.quantity, item.product_id]
              );
            }
            
            // Send order confirmation emails
            await sendOrderConfirmation(orderId);
          }
        } catch (paymentError) {
          console.error('Payment processing error:', paymentError);
          await db.pool.execute(
            'UPDATE orders SET payment_status = "failed", status = "cancelled" WHERE id = ?',
            [orderId]
          );
        }
      }, 0);
      
      res.status(201).json({
        message: 'Order created successfully. Payment processing initiated.',
        order_id: orderId,
        order_number,
        total_amount,
        payment_status: 'pending',
        estimated_delivery: await calculateEstimatedDelivery(shipping_address_id, shipping_method),
        success: true
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Create advanced order error:', error);
    res.status(500).json({ 
      message: 'Server error while creating order', 
      error: error.message 
    });
  }
};

// Get comprehensive order analytics
const getOrderAnalytics = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      user_id, 
      seller_id, 
      status, 
      payment_status, 
      group_by = 'day' 
    } = req.query;
    
    // Build dynamic query based on filters
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (start_date) {
      whereClause += ' AND o.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND o.created_at <= ?';
      params.push(end_date);
    }
    
    if (user_id) {
      whereClause += ' AND o.user_id = ?';
      params.push(user_id);
    }
    
    if (seller_id) {
      whereClause += ' AND EXISTS(SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = ?)';
      params.push(seller_id);
    }
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    if (payment_status) {
      whereClause += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
    
    // Sales analytics query
    const salesQuery = `
      SELECT 
        DATE(o.created_at) as date,
        o.status,
        o.payment_status,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_sales,
        AVG(o.total_amount) as average_order_value,
        SUM(o.shipping_cost) as total_shipping,
        SUM(o.tax_amount) as total_tax,
        SUM(o.discount_amount) as total_discount,
        COUNT(DISTINCT o.user_id) as unique_customers,
        COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) as delivered_orders
      FROM orders o
      ${whereClause}
      GROUP BY 
        CASE 
          WHEN ? = 'year' THEN YEAR(o.created_at)
          WHEN ? = 'month' THEN DATE_FORMAT(o.created_at, '%Y-%m')
          WHEN ? = 'week' THEN YEARWEEK(o.created_at)
          ELSE DATE(o.created_at)
        END,
        o.status, o.payment_status
      ORDER BY date DESC
    `;
    
    const [salesData] = await db.pool.execute(salesQuery, [group_by, group_by, group_by, ...params]);
    
    // Top selling products
    const topProductsQuery = `
      SELECT 
        p.name,
        p.id as product_id,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.subtotal) as average_price,
        p.images
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      ${whereClause.replace('WHERE 1=1', 'WHERE o.id = oi.order_id')}
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    
    const [topProducts] = await db.pool.execute(topProductsQuery, params);
    
    // Top selling categories
    const topCategoriesQuery = `
      SELECT 
        c.name,
        c.id as category_id,
        COUNT(*) as order_count,
        SUM(oi.subtotal) as total_revenue,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      ${whereClause.replace('WHERE 1=1', 'WHERE o.id = oi.order_id')}
      GROUP BY c.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `;
    
    const [topCategories] = await db.pool.execute(topCategoriesQuery, params);
    
    // Customer analytics
    const customerQuery = `
      SELECT 
        COUNT(*) as total_customers,
        AVG(total_spent) as avg_customer_value,
        COUNT(CASE WHEN last_order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_customers,
        COUNT(CASE WHEN first_order_date = DATE(o.created_at) THEN 1 END) as new_customers
      FROM orders o
      JOIN user_stats us ON o.user_id = us.user_id
      ${whereClause}
    `;
    
    const [customerData] = await db.pool.execute(customerQuery, params);
    
    res.status(200).json({
      analytics: {
        sales: salesData,
        top_products: topProducts.map(p => ({
          ...p,
          images: p.images ? JSON.parse(p.images) : []
        })),
        top_categories: topCategories,
        customer_insights: customerData[0],
        summary: {
          total_orders: salesData.reduce((sum, row) => sum + row.order_count, 0),
          total_revenue: salesData.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0),
          total_customers: customerData[0]?.total_customers || 0,
          conversion_rate: calculateConversionRate(salesData, customerData[0])
        }
      },
      filters: {
        start_date,
        end_date,
        user_id,
        seller_id,
        status,
        payment_status,
        group_by
      },
      success: true
    });
  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics', error: error.message });
  }
};

// Calculate tax rate based on location
const getTaxRate = async (addressId, userId) => {
  // This would integrate with a tax calculation service in a real app
  // For now, using a simplified approach
  const addressQuery = `
    SELECT state, country FROM addresses 
    WHERE id = ? AND user_id = ?
  `;
  const [addresses] = await db.pool.execute(addressQuery, [addressId, userId]);
  
  if (addresses.length === 0) return 0; // Default tax rate
  
  const address = addresses[0];
  
  // Simplified tax calculation - in real app, use a service like Avalara
  const taxRates = {
    'CA': 8.25, // California
    'NY': 8.25, // New York
    'TX': 6.25, // Texas
    'FL': 6.00, // Florida
    'default': 8.00 // Default rate
  };
  
  return taxRates[address.state] || taxRates['default'];
};

// Get shipping methods and costs
const getShippingMethods = async (selectedMethod = 'standard') => {
  const methodsQuery = 'SELECT * FROM shipping_methods WHERE is_active = 1 ORDER BY cost ASC';
  const [methods] = await db.pool.execute(methodsQuery);
  
  return methods.reduce((acc, method) => {
    acc[method.name.toLowerCase()] = method;
    return acc;
  }, {});
};

// Calculate shipping cost based on various factors
const calculateShippingCost = async (weight, method, addressId) => {
  // This would typically integrate with shipping carriers' APIs
  // For now, using simplified calculation
  const baseCost = 5.00; // Base shipping cost
  const weightCost = weight * 0.50; // $0.50 per kg
  const distanceCost = 2.00; // Simplified distance cost
  
  return baseCost + weightCost + distanceCost;
};

// Generate unique order number
const generateUniqueOrderNumber = async () => {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const orderNumber = `QS${timestamp}${random}`;
  
  // Verify uniqueness
  const checkQuery = 'SELECT id FROM orders WHERE order_number = ?';
  const [existing] = await db.pool.execute(checkQuery, [orderNumber]);
  
  if (existing.length > 0) {
    // If somehow not unique, recursively generate new one
    return generateUniqueOrderNumber();
  }
  
  return orderNumber;
};

// Create affiliate commission record
const createAffiliateCommission = async (connection, userId, orderId, orderTotal, affiliateId) => {
  // Get affiliate commission rate
  const affiliateQuery = 'SELECT commission_rate FROM affiliates WHERE id = ? AND status = "active"';
  const [affiliates] = await connection.execute(affiliateQuery, [affiliateId]);
  
  if (affiliates.length === 0) return;
  
  const affiliate = affiliates[0];
  const commissionAmount = orderTotal * (affiliate.commission_rate / 100);
  
  const commissionQuery = `
    INSERT INTO affiliate_commissions (
      affiliate_id, user_id, order_id, order_amount, commission_rate, commission_amount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  await connection.execute(commissionQuery, [
    affiliateId,
    userId,
    orderId,
    orderTotal,
    affiliate.commission_rate,
    commissionAmount,
    'pending'
  ]);
  
  // Update affiliate balance
  const updateBalanceQuery = `
    UPDATE affiliates 
    SET pending_commission = pending_commission + ?,
        total_commission = total_commission + ?
    WHERE id = ?
  `;
  
  await connection.execute(updateBalanceQuery, [commissionAmount, commissionAmount, affiliateId]);
};

// Process payment (simplified)
const processPayment = async (orderId, paymentMethod, amount) => {
  // This would integrate with actual payment gateways
  // For now, returning a simulated success
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate payment processing
      resolve({
        success: true,
        transaction_id: `txn_${Date.now()}`,
        method: paymentMethod,
        amount: amount
      });
    }, 1000); // Simulate processing time
  });
};

// Send order confirmation
const sendOrderConfirmation = async (orderId) => {
  // This would send actual emails using an email service
  console.log(`Order confirmation email queued for order: ${orderId}`);
  
  // Also trigger notification to seller
  const orderItems = await db.pool.execute(`
    SELECT DISTINCT oi.seller_id 
    FROM order_items oi 
    WHERE oi.order_id = ?
  `, [orderId]);
  
  for (const item of orderItems[0]) {
    console.log(`Seller notification queued for seller: ${item.seller_id}, order: ${orderId}`);
  }
};

// Calculate estimated delivery
const calculateEstimatedDelivery = async (addressId, shippingMethod) => {
  // This would calculate based on shipping origin, destination, and method
  // For now, returning simplified estimates
  const shippingTimes = {
    'standard': 5, // 5 days
    'express': 2,  // 2 days
    'overnight': 1 // 1 day
  };
  
  const days = shippingTimes[shippingMethod] || shippingTimes['standard'];
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + days);
  
  return deliveryDate.toISOString().split('T')[0]; // Return date only
};

// Calculate conversion rate
const calculateConversionRate = (salesData, customerData) => {
  if (!customerData || customerData.total_customers === 0) return 0;
  
  const totalOrders = salesData.reduce((sum, row) => sum + row.order_count, 0);
  const totalCustomers = customerData.total_customers;
  
  return (totalOrders / totalCustomers * 100).toFixed(2); // Percentage
};

// Get seller orders (for marketplace)
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId; // Assuming seller is making the request
    const { 
      page = 1, 
      limit = 10, 
      status, 
      start_date, 
      end_date, 
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE oi.seller_id = ?';
    let params = [sellerId];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    if (start_date) {
      whereClause += ' AND o.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND o.created_at <= ?';
      params.push(end_date);
    }
    
    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const query = `
      SELECT 
        o.id, o.order_number, o.status, o.total_amount, o.created_at,
        u.name as customer_name, u.email as customer_email,
        SUM(oi.quantity) as total_items,
        SUM(oi.subtotal) as seller_revenue,
        o.shipping_cost,
        o.payment_status
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [orders] = await db.pool.execute(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      orders: orders.map(order => ({
        ...order,
        created_at: order.created_at.toISOString(),
        items: order.total_items,
        seller_revenue: parseFloat(order.seller_revenue || 0)
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
    console.error('Get seller orders error:', error);
    res.status(500).json({ message: 'Server error while fetching seller orders', error: error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, notes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    
    // Check if order exists and user has permission
    const orderQuery = `
      SELECT o.*, u.role as customer_role, 
             EXISTS(SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = ?) as is_seller_order
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const [orders] = await db.pool.execute(orderQuery, [userId, id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Check permissions
    const hasPermission = 
      userRole === 'admin' || 
      (userRole === 'seller' && order.is_seller_order) ||
      order.user_id === userId;
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Start transaction for status update
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update order status
      const updateQuery = 'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?';
      await connection.execute(updateQuery, [status, id]);
      
      // Handle specific status changes
      if (status === 'cancelled') {
        // Return stock to products
        await returnStockToProducts(connection, id);
      } else if (status === 'delivered') {
        // Mark commission as approved for affiliates
        await approveAffiliateCommissions(connection, id);
      }
      
      // Add order status history
      await connection.execute(`
        INSERT INTO order_status_history (order_id, status, notes, changed_by) 
        VALUES (?, ?, ?, ?)
      `, [id, status, notes || '', userId]);
      
      if (tracking_number) {
        await connection.execute(
          'UPDATE orders SET tracking_number = ?, shipped_at = CASE WHEN ? = "shipped" THEN NOW() END WHERE id = ?',
          [tracking_number, status, id]
        );
      }
      
      await connection.commit();
      connection.release();
      
      // Send notifications
      setTimeout(async () => {
        await sendStatusUpdateNotification(id, status, order.user_id);
      }, 0);
      
      res.status(200).json({
        message: 'Order status updated successfully',
        order_id: id,
        new_status: status,
        success: true
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error while updating order status', error: error.message });
  }
};

// Return stock to products when order is cancelled
const returnStockToProducts = async (connection, orderId) => {
  const orderItems = await connection.execute(
    'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
    [orderId]
  );
  
  for (const item of orderItems[0]) {
    await connection.execute(
      'UPDATE products SET reserved_quantity = GREATEST(0, reserved_quantity - ?) WHERE id = ?',
      [item.quantity, item.product_id]
    );
  }
};

// Approve affiliate commissions when order is delivered
const approveAffiliateCommissions = async (connection, orderId) => {
  await connection.execute(
    'UPDATE affiliate_commissions SET status = "approved", approved_at = NOW() WHERE order_id = ? AND status = "pending"',
    [orderId]
  );
  
  // Update affiliate balances
  const commissions = await connection.execute(`
    SELECT affiliate_id, commission_amount 
    FROM affiliate_commissions 
    WHERE order_id = ? AND status = "approved"
  `, [orderId]);
  
  for (const commission of commissions[0]) {
    await connection.execute(`
      UPDATE affiliates 
      SET pending_commission = pending_commission - ?,
          approved_commission = approved_commission + ?
      WHERE id = ?
    `, [commission.commission_amount, commission.commission_amount, commission.affiliate_id]);
  }
};

// Send status update notification
const sendStatusUpdateNotification = async (orderId, newStatus, userId) => {
  console.log(`Status update notification sent for order ${orderId}, status: ${newStatus}, user: ${userId}`);
  
  // This would send actual notifications via email, SMS, or push
  // Also notify seller if applicable
};

module.exports = {
  createAdvancedOrder,
  getOrderAnalytics,
  getSellerOrders,
  updateOrderStatus
};
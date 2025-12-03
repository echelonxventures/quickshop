// sellerController.js - Advanced seller management
const db = require('../db');

// Get seller dashboard
const getSellerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get seller info
    const sellerQuery = `
      SELECT 
        c.*,
        u.name as business_name,
        u.email as business_email,
        u.phone as business_phone
      FROM companies c
      JOIN users u ON c.id = u.company_id
      WHERE u.id = ?
    `;
    const [sellers] = await db.pool.execute(sellerQuery, [userId]);
    
    if (sellers.length === 0) {
      return res.status(404).json({ message: 'Seller profile not found' });
    }
    
    const seller = sellers[0];
    
    // Get recent orders
    const recentOrdersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.seller_id = ?) as item_count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.payment_status = 'paid'
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    
    const [recentOrders] = await db.pool.execute(recentOrdersQuery, [userId, userId]);
    
    // Get sales metrics
    const salesQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(oi.subtotal) as total_sales,
        AVG(oi.subtotal) as average_order_value,
        SUM(oi.quantity) as total_items_sold
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.payment_status = 'paid'
        AND o.status = 'delivered'
    `;
    
    const [sales] = await db.pool.execute(salesQuery, [userId]);
    
    // Get product metrics
    const productQuery = `
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity - reserved_quantity) as total_inventory,
        AVG(price) as average_price
      FROM products
      WHERE created_by = ?
    `;
    
    const [products] = await db.pool.execute(productQuery, [userId]);
    
    res.status(200).json({
      dashboard: {
        seller: {
          id: seller.id,
          name: seller.business_name,
          email: seller.business_email,
          phone: seller.business_phone,
          status: seller.status,
          created_at: seller.created_at.toISOString()
        },
        metrics: {
          ...sales[0],
          ...products[0],
          total_products: products[0]?.total_products || 0,
          total_sales: parseFloat(sales[0]?.total_sales || 0),
          average_order_value: parseFloat(sales[0]?.average_order_value || 0)
        },
        recent_orders: recentOrders.map(order => ({
          ...order,
          created_at: order.created_at.toISOString()
        }))
      },
      calculated_at: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Get seller dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching seller dashboard', error: error.message });
  }
};

// Get seller products
const getSellerProducts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 10, 
      status = null, 
      search = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.created_by = ?';
    let params = [userId];
    
    if (status === 'active') {
      whereClause += ' AND p.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = 0';
    }
    
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      params.push(search, search, search);
    }
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY p.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [products] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products p
      ${whereClause.replace('ORDER BY', 'AND')}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      products: products.map(product => ({
        ...product,
        current_price: product.sale_price || product.price,
        available_stock: product.available_stock || 0,
        images: product.images ? JSON.parse(product.images) : [],
        specifications: product.specifications ? JSON.parse(product.specifications) : {},
        tags: product.tags ? JSON.parse(product.tags) : [],
        created_at: product.created_at.toISOString(),
        updated_at: product.updated_at.toISOString(),
        stock_status: calculateStockStatus(product.available_stock, product.sold_quantity)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        status,
        search,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ message: 'Server error while fetching seller products', error: error.message });
  }
};

// Get seller orders
const getSellerOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 10, 
      status = null, 
      payment_status = null,
      start_date = null,
      end_date = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE oi.seller_id = ?';
    let params = [userId];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    if (payment_status) {
      whereClause += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
    
    if (start_date) {
      whereClause += ' AND o.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND o.created_at <= ?';
      params.push(end_date);
    }
    
    const query = `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at,
        o.shipped_at,
        o.delivered_at,
        u.name as customer_name,
        u.email as customer_email,
        SUM(oi.quantity) as total_items,
        SUM(oi.subtotal) as seller_revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [orders] = await db.pool.execute(query, params);
    
    // Get total count
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
        total_items: order.total_items || 0,
        seller_revenue: parseFloat(order.seller_revenue || 0),
        created_at: order.created_at.toISOString(),
        shipped_at: order.shipped_at ? order.shipped_at.toISOString() : null,
        delivered_at: order.delivered_at ? order.delivered_at.toISOString() : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        status,
        payment_status,
        start_date,
        end_date,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ message: 'Server error while fetching seller orders', error: error.message });
  }
};

// Get seller analytics
const getSellerAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { start_date = '30 days ago', end_date = 'now' } = req.query;
    
    // Parse dates
    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);
    
    // Get sales analytics
    const salesQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(oi.subtotal) as total_sales,
        AVG(oi.subtotal) as average_order_value,
        SUM(oi.quantity) as total_items_sold,
        SUM(oi.subtotal) as seller_revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.payment_status = 'paid'
        AND o.created_at BETWEEN ? AND ?
    `;
    
    const [sales] = await db.pool.execute(salesQuery, [userId, startDate, endDate]);
    
    // Get daily sales
    const dailySalesQuery = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as daily_orders,
        SUM(oi.subtotal) as daily_sales
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.payment_status = 'paid'
        AND o.created_at BETWEEN ? AND ?
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;
    
    const [dailySales] = await db.pool.execute(dailySalesQuery, [userId, startDate, endDate]);
    
    // Get top selling products
    const topProductsQuery = `
      SELECT 
        p.name,
        p.id as product_id,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.subtotal) as average_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.seller_id = ?
        AND o.payment_status = 'paid'
        AND o.created_at BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    
    const [topProducts] = await db.pool.execute(topProductsQuery, [userId, startDate, endDate]);
    
    res.status(200).json({
      analytics: {
        sales: sales[0] ? {
          ...sales[0],
          total_sales: parseFloat(sales[0].total_sales || 0),
          average_order_value: parseFloat(sales[0].average_order_value || 0),
          seller_revenue: parseFloat(sales[0].seller_revenue || 0)
        } : {},
        daily_sales: dailySales,
        top_products: topProducts,
        calculated_at: new Date().toISOString()
      },
      meta: {
        start_date: startDate,
        end_date: endDate
      },
      success: true
    });
  } catch (error) {
    console.error('Get seller analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching seller analytics', error: error.message });
  }
};

// Get seller profile
const getSellerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const sellerQuery = `
      SELECT 
        c.*,
        u.name as business_name,
        u.email as business_email,
        u.phone as business_phone,
        u.avatar as business_avatar
      FROM companies c
      JOIN users u ON c.id = u.company_id
      WHERE u.id = ?
    `;
    
    const [sellers] = await db.pool.execute(sellerQuery, [userId]);
    
    if (sellers.length === 0) {
      return res.status(404).json({ message: 'Seller profile not found' });
    }
    
    const seller = sellers[0];
    
    res.status(200).json({
      seller: {
        id: seller.id,
        business_name: seller.business_name,
        business_email: seller.business_email,
        business_phone: seller.business_phone,
        business_avatar: seller.business_avatar,
        business_type: seller.business_type,
        tax_id: seller.tax_id,
        address: seller.address ? JSON.parse(seller.address) : {},
        bank_details: seller.bank_details ? JSON.parse(seller.bank_details) : {},
        license: seller.license,
        status: seller.status,
        created_at: seller.created_at.toISOString(),
        updated_at: seller.updated_at.toISOString(),
        stats: {
          total_products: seller.product_count || 0,
          total_sales: seller.total_sales || 0,
          total_orders: seller.total_orders || 0
        }
      },
      success: true
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({ message: 'Server error while fetching seller profile', error: error.message });
  }
};

// Update seller profile
const updateSellerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      business_name,
      business_email,
      business_phone,
      business_type,
      tax_id,
      address,
      bank_details,
      license
    } = req.body;
    
    // Check if user has seller profile
    const checkQuery = `
      SELECT c.id FROM companies c
      JOIN users u ON c.id = u.company_id
      WHERE u.id = ?
    `;
    const [existing] = await db.pool.execute(checkQuery, [userId]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Seller profile not found' });
    }
    
    const sellerId = existing[0].id;
    
    // Update company info
    const updateQuery = `
      UPDATE companies 
      SET 
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        business_type = COALESCE(?, business_type),
        tax_id = COALESCE(?, tax_id),
        address = COALESCE(?, address),
        bank_details = COALESCE(?, bank_details),
        license = COALESCE(?, license),
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.pool.execute(updateQuery, [
      business_name,
      business_email,
      business_phone,
      business_type,
      tax_id,
      address ? JSON.stringify(address) : null,
      bank_details ? JSON.stringify(bank_details) : null,
      license,
      sellerId
    ]);
    
    res.status(200).json({
      message: 'Seller profile updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Update seller profile error:', error);
    res.status(500).json({ message: 'Server error while updating seller profile', error: error.message });
  }
};

// Get seller payouts
const getSellerPayouts = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const payoutQuery = `
      SELECT 
        sp.*,
        (SELECT SUM(oi.subtotal) FROM orders o JOIN order_items oi ON o.id = oi.order_id 
         WHERE oi.seller_id = ? AND o.status = 'delivered' 
         AND o.created_at < sp.period_end AND sp.status != 'paid') as previous_revenue
      FROM seller_payouts sp
      WHERE sp.seller_id = ?
      ORDER BY sp.period_start DESC
    `;
    
    const [payouts] = await db.pool.execute(payoutQuery, [userId, userId]);
    
    res.status(200).json({
      payouts: payouts.map(payout => ({
        ...payout,
        period_start: payout.period_start.toISOString(),
        period_end: payout.period_end.toISOString(),
        requested_at: payout.requested_at.toISOString(),
        processed_at: payout.processed_at ? payout.processed_at.toISOString() : null
      })),
      success: true
    });
  } catch (error) {
    console.error('Get seller payouts error:', error);
    res.status(500).json({ message: 'Server error while fetching seller payouts', error: error.message });
  }
};

// Create seller payout request
const createSellerPayout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, payout_method, bank_account } = req.body;
    
    // Calculate eligible amount (delivered orders only)
    const eligibleQuery = `
      SELECT SUM(oi.subtotal) as eligible_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.status = 'delivered'
        AND o.payment_status = 'paid'
        AND o.payout_status IS NULL
    `;
    
    const [eligible] = await db.pool.execute(eligibleQuery, [userId]);
    const eligibleAmount = parseFloat(eligible[0]?.eligible_amount || 0);
    
    if (!amount || amount > eligibleAmount) {
      return res.status(400).json({ 
        message: 'Invalid payout amount', 
        eligible_amount: eligibleAmount 
      });
    }
    
    // Create payout request
    const payoutQuery = `
      INSERT INTO seller_payouts (
        seller_id, amount, payout_method, bank_account, status, 
        period_start, period_end, requested_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, NOW())
    `;
    
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30); // Last 30 days
    
    await db.pool.execute(payoutQuery, [
      userId,
      amount,
      payout_method,
      bank_account ? JSON.stringify(bank_account) : null,
      periodStart,
      new Date()
    ]);
    
    // Mark orders as payout pending
    await db.pool.execute(`
      UPDATE orders o
      JOIN order_items oi ON o.id = oi.order_id
      SET o.payout_status = 'requested'
      WHERE oi.seller_id = ?
        AND o.status = 'delivered'
        AND o.payment_status = 'paid'
        AND o.payout_status IS NULL
    `, [userId]);
    
    res.status(201).json({
      message: 'Payout request submitted successfully',
      amount,
      status: 'pending',
      success: true
    });
  } catch (error) {
    console.error('Create seller payout error:', error);
    res.status(500).json({ message: 'Server error while creating seller payout', error: error.message });
  }
};

// Helper function to calculate stock status
const calculateStockStatus = (availableStock, soldQuantity) => {
  if (availableStock <= 0) return 'out_of_stock';
  if (availableStock <= 5) return 'critical_low';
  if (availableStock <= 10) return 'low_stock';
  if (soldQuantity > 0) {
    const turnoverRate = soldQuantity / (availableStock + soldQuantity);
    if (turnoverRate > 0.8) return 'fast_moving';
  }
  return 'in_stock';
};

// Helper function to parse date
const parseDate = (dateString) => {
  if (dateString === 'now') return new Date();
  if (dateString === '30 days ago') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (dateString === '7 days ago') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return new Date(dateString);
};

module.exports = {
  getSellerDashboard,
  getSellerProducts,
  getSellerOrders,
  getSellerAnalytics,
  getSellerProfile,
  updateSellerProfile,
  getSellerPayouts,
  createSellerPayout
};
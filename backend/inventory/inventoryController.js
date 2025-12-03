// inventoryController.js - Advanced inventory management
const db = require('../db');

// Get inventory for a seller
const getInventory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let whereClause = '';
    let params = [];
    
    if (userRole === 'admin') {
      // Admin can see all inventory
      whereClause = '';
    } else if (userRole === 'seller') {
      // Seller can only see their own inventory
      whereClause = 'WHERE p.created_by = ?';
      params.push(userId);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const inventoryQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        p.sku,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.reserved_quantity,
        p.sold_quantity,
        (p.stock_quantity - p.reserved_quantity) as available_stock,
        p.condition,
        c.name as category_name,
        b.name as brand_name,
        p.images,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY p.updated_at DESC
    `;
    
    const [inventory] = await db.pool.execute(inventoryQuery, params);
    
    const enhancedInventory = inventory.map(item => ({
      ...item,
      current_price: item.sale_price || item.price,
      available_stock: item.available_stock || 0,
      stock_status: calculateStockStatus(item.available_stock, item.sold_quantity),
      images: item.images ? JSON.parse(item.images) : [],
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString()
    }));
    
    res.status(200).json({
      inventory: enhancedInventory,
      total_items: enhancedInventory.length,
      success: true
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory', error: error.message });
  }
};

// Update inventory for a product
const updateInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { stock_quantity, reserved_quantity = null, adjustment_reason = null } = req.body;
    
    // Verify user has permission to update this product
    const productCheckQuery = 'SELECT created_by FROM products WHERE id = ?';
    const [products] = await db.pool.execute(productCheckQuery, [productId]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    
    if (userRole !== 'admin' && product.created_by !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Validate stock quantity
    if (stock_quantity < 0) {
      return res.status(400).json({ message: 'Stock quantity cannot be negative' });
    }
    
    // Update inventory
    const updateQuery = `
      UPDATE products 
      SET stock_quantity = ?, 
          reserved_quantity = COALESCE(?, reserved_quantity),
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.pool.execute(updateQuery, [stock_quantity, reserved_quantity, productId]);
    
    // Log inventory adjustment
    if (adjustment_reason) {
      const logQuery = `
        INSERT INTO inventory_logs (
          product_id, user_id, adjustment_type, old_quantity, new_quantity, 
          adjustment_reason, created_at
        ) VALUES (?, ?, 'manual', (SELECT stock_quantity FROM products WHERE id = ?), ?, ?, NOW())
      `;
      await db.pool.execute(logQuery, [
        productId, 
        userId, 
        productId, 
        stock_quantity, 
        adjustment_reason
      ]);
    }
    
    // Check if this update creates low stock alert
    await checkLowStockAlert(productId, stock_quantity);
    
    res.status(200).json({
      message: 'Inventory updated successfully',
      product_id: productId,
      new_stock_quantity: stock_quantity,
      success: true
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Server error while updating inventory', error: error.message });
  }
};

// Get low stock items
const getLowStockItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { threshold = 10 } = req.query; // Default threshold of 10
    
    let whereClause = 'WHERE (p.stock_quantity - p.reserved_quantity) <= ?';
    let params = [threshold];
    
    if (userRole === 'seller') {
      whereClause += ' AND p.created_by = ?';
      params.push(userId);
    }
    
    const lowStockQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        p.sku,
        p.price,
        p.stock_quantity,
        p.reserved_quantity,
        (p.stock_quantity - p.reserved_quantity) as available_stock,
        p.sold_quantity,
        c.name as category_name,
        (p.sold_quantity / 30) as avg_daily_sales, -- 30-day average
        ((p.stock_quantity - p.reserved_quantity) / GREATEST(p.sold_quantity / 30, 1)) * 30 as days_of_supply
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
        AND p.is_active = 1
      ORDER BY available_stock ASC
    `;
    
    const [lowStockItems] = await db.pool.execute(lowStockQuery, params);
    
    const enhancedItems = lowStockItems.map(item => ({
      ...item,
      available_stock: item.available_stock || 0,
      avg_daily_sales: parseFloat(item.avg_daily_sales || 0),
      days_of_supply: Math.round(item.days_of_supply || 0),
      stock_status: 'low_stock',
      reorder_suggestion: Math.ceil((item.avg_daily_sales || 0) * 14) // 14 days worth
    }));
    
    res.status(200).json({
      low_stock_items: enhancedItems,
      threshold: parseInt(threshold),
      total_items: enhancedItems.length,
      success: true
    });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Server error while fetching low stock items', error: error.message });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let whereClause = '';
    let params = [];
    
    if (userRole === 'seller') {
      whereClause = 'WHERE p.created_by = ?';
      params.push(userId);
    }
    
    // Overall inventory metrics
    const inventoryMetricsQuery = `
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock,
        SUM(reserved_quantity) as total_reserved,
        SUM(sold_quantity) as total_sold,
        COUNT(CASE WHEN (stock_quantity - reserved_quantity) <= 10 THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN (stock_quantity - reserved_quantity) <= 0 THEN 1 END) as out_of_stock_count,
        AVG(price) as average_price,
        SUM((stock_quantity - reserved_quantity) * price) as total_inventory_value
      FROM products p
      ${whereClause}
        AND p.is_active = 1
    `;
    
    const [inventoryMetrics] = await db.pool.execute(inventoryMetricsQuery, params);
    
    // Category-wise inventory
    const categoryQuery = `
      SELECT 
        c.name as category_name,
        COUNT(*) as product_count,
        SUM(p.stock_quantity) as total_stock,
        SUM(p.sold_quantity) as total_sold,
        AVG(p.price) as avg_price
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
        AND p.is_active = 1
      GROUP BY c.id
      ORDER BY total_stock DESC
    `;
    
    const [categoryAnalytics] = await db.pool.execute(categoryQuery, params);
    
    // Fast moving items (high turnover)
    const fastMovingQuery = `
      SELECT 
        p.name,
        p.stock_quantity,
        p.sold_quantity,
        (p.sold_quantity / GREATEST(p.stock_quantity + p.sold_quantity, 1)) * 100 as turnover_rate,
        p.price
      FROM products p
      ${whereClause}
        AND p.is_active = 1
        AND (p.stock_quantity + p.sold_quantity) > 0
      ORDER BY turnover_rate DESC
      LIMIT 10
    `;
    
    const [fastMovingItems] = await db.pool.execute(fastMovingQuery, params);
    
    res.status(200).json({
      analytics: {
        metrics: inventoryMetrics[0],
        by_category: categoryAnalytics,
        fast_moving: fastMovingItems,
        calculated_at: new Date().toISOString()
      },
      success: true
    });
  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory analytics', error: error.message });
  }
};

// Create inventory alert
const createInventoryAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { product_id, min_stock_level, max_stock_level, alert_type, enabled = true } = req.body;
    
    // Validate required fields
    if (!product_id || !alert_type) {
      return res.status(400).json({ message: 'Product ID and alert type are required' });
    }
    
    // Verify user has permission
    const productCheckQuery = 'SELECT created_by FROM products WHERE id = ?';
    const [products] = await db.pool.execute(productCheckQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    
    if (userRole !== 'admin' && product.created_by !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Create or update alert
    const alertQuery = `
      INSERT INTO inventory_alerts (
        product_id, user_id, min_stock_level, max_stock_level, 
        alert_type, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        min_stock_level = VALUES(min_stock_level),
        max_stock_level = VALUES(max_stock_level),
        alert_type = VALUES(alert_type),
        enabled = VALUES(enabled),
        updated_at = NOW()
    `;
    
    await db.pool.execute(alertQuery, [
      product_id,
      userId,
      min_stock_level || 5,
      max_stock_level || null,
      alert_type,
      enabled ? 1 : 0
    ]);
    
    res.status(201).json({
      message: 'Inventory alert created/updated successfully',
      product_id,
      alert_type,
      success: true
    });
  } catch (error) {
    console.error('Create inventory alert error:', error);
    res.status(500).json({ message: 'Server error while creating inventory alert', error: error.message });
  }
};

// Get inventory alerts
const getInventoryAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let whereClause = '';
    let params = [];
    
    if (userRole === 'seller') {
      whereClause = 'WHERE ia.user_id = ?';
      params.push(userId);
    }
    
    const alertsQuery = `
      SELECT 
        ia.*,
        p.name as product_name,
        p.sku,
        p.stock_quantity,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM inventory_alerts ia
      JOIN products p ON ia.product_id = p.id
      ${whereClause}
      ORDER BY ia.created_at DESC
    `;
    
    const [alerts] = await db.pool.execute(alertsQuery, params);
    
    res.status(200).json({
      alerts: alerts.map(alert => ({
        ...alert,
        enabled: alert.enabled === 1,
        available_stock: alert.available_stock || 0,
        created_at: alert.created_at.toISOString(),
        updated_at: alert.updated_at.toISOString()
      })),
      success: true
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory alerts', error: error.message });
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

// Helper function to check low stock alert
const checkLowStockAlert = async (productId, newStock) => {
  try {
    // Check if there are any active alerts for this product
    const alertCheckQuery = `
      SELECT * FROM inventory_alerts 
      WHERE product_id = ? AND enabled = 1 AND min_stock_level >= ?
    `;
    const [alerts] = await db.pool.execute(alertCheckQuery, [productId, newStock]);
    
    if (alerts.length > 0) {
      // Create low stock notification
      console.log(`Low stock alert triggered for product ${productId}, stock: ${newStock}`);
      // In a real implementation, this would send notifications
    }
  } catch (error) {
    console.error('Check low stock alert error:', error);
  }
};

// Bulk inventory update
const bulkUpdateInventory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { updates } = req.body; // Array of {product_id, stock_quantity, reason}
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: 'Updates must be an array' });
    }
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const update of updates) {
      try {
        // Verify user has permission for this product
        const productCheckQuery = 'SELECT created_by FROM products WHERE id = ?';
        const [products] = await db.pool.execute(productCheckQuery, [update.product_id]);
        
        if (products.length === 0) {
          results.push({ product_id: update.product_id, status: 'error', message: 'Product not found' });
          failCount++;
          continue;
        }
        
        const product = products[0];
        
        if (userRole !== 'admin' && product.created_by !== userId) {
          results.push({ product_id: update.product_id, status: 'error', message: 'Access denied' });
          failCount++;
          continue;
        }
        
        // Update inventory
        const updateQuery = `
          UPDATE products 
          SET stock_quantity = ?, updated_at = NOW()
          WHERE id = ?
        `;
        await db.pool.execute(updateQuery, [update.stock_quantity, update.product_id]);
        
        // Log inventory adjustment
        if (update.reason) {
          const logQuery = `
            INSERT INTO inventory_logs (
              product_id, user_id, adjustment_type, old_quantity, new_quantity, 
              adjustment_reason, created_at
            ) VALUES (?, ?, 'bulk_update', (SELECT stock_quantity FROM products WHERE id = ?), ?, ?, NOW())
          `;
          await db.pool.execute(logQuery, [
            update.product_id, 
            userId, 
            update.product_id, 
            update.stock_quantity, 
            update.reason
          ]);
        }
        
        results.push({ 
          product_id: update.product_id, 
          status: 'success', 
          new_quantity: update.stock_quantity 
        });
        successCount++;
      } catch (error) {
        results.push({ 
          product_id: update.product_id, 
          status: 'error', 
          message: error.message 
        });
        failCount++;
      }
    }
    
    res.status(200).json({
      message: `Bulk update completed. ${successCount} succeeded, ${failCount} failed.`,
      results,
      summary: {
        total: updates.length,
        successful: successCount,
        failed: failCount
      },
      success: true
    });
  } catch (error) {
    console.error('Bulk update inventory error:', error);
    res.status(500).json({ message: 'Server error during bulk inventory update', error: error.message });
  }
};

// Get inventory movement history
const getInventoryMovement = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { productId = null, start_date = null, end_date = null } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (userRole === 'seller') {
      whereClause = 'WHERE p.created_by = ?';
      params.push(userId);
    } else if (userRole === 'admin') {
      whereClause = 'WHERE 1=1';
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (productId) {
      if (whereClause) {
        whereClause += ' AND il.product_id = ?';
      } else {
        whereClause = 'WHERE il.product_id = ?';
      }
      params.push(productId);
    }
    
    if (start_date) {
      whereClause += ' AND il.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND il.created_at <= ?';
      params.push(end_date);
    }
    
    const movementQuery = `
      SELECT 
        il.*,
        p.name as product_name,
        p.sku,
        u.name as user_name
      FROM inventory_logs il
      JOIN products p ON il.product_id = p.id
      LEFT JOIN users u ON il.user_id = u.id
      ${whereClause}
      ORDER BY il.created_at DESC
      LIMIT 100
    `;
    
    const [movements] = await db.pool.execute(movementQuery, params);
    
    res.status(200).json({
      movements: movements.map(movement => ({
        ...movement,
        created_at: movement.created_at.toISOString()
      })),
      success: true
    });
  } catch (error) {
    console.error('Get inventory movement error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory movement', error: error.message });
  }
};

module.exports = {
  getInventory,
  updateInventory,
  getLowStockItems,
  getInventoryAnalytics,
  createInventoryAlert,
  getInventoryAlerts,
  bulkUpdateInventory,
  getInventoryMovement
};
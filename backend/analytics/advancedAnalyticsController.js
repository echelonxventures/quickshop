// advancedAnalyticsController.js - Advanced business intelligence and analytics
const db = require('../db');

// Comprehensive business dashboard analytics
const getBusinessDashboardAnalytics = async (req, res) => {
  try {
    const { 
      start_date = '30 days ago', 
      end_date = 'now',
      granularity = 'day', // day, week, month, year
      include_predictions = false
    } = req.query;
    
    // Parse dates
    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);
    
    // Get core business metrics
    const [
      salesData,
      customerData,
      productData,
      trafficData,
      conversionData,
      inventoryData
    ] = await Promise.all([
      getSalesAnalytics(startDate, endDate, granularity),
      getCustomerAnalytics(startDate, endDate, granularity),
      getProductAnalytics(startDate, endDate, granularity),
      getTrafficAnalytics(startDate, endDate, granularity),
      getConversionAnalytics(startDate, endDate, granularity),
      getInventoryAnalytics()
    ]);
    
    // Combine into comprehensive dashboard
    const dashboardData = {
      summary: {
        total_sales: salesData.summary.total_revenue,
        total_orders: salesData.summary.total_orders,
        total_customers: customerData.summary.total_customers,
        average_order_value: salesData.summary.average_order_value,
        conversion_rate: conversionData.summary.conversion_rate,
        customer_acquisition_cost: await calculateCAC(customerData.summary.total_customers),
        customer_lifetime_value: await calculateLTV()
      },
      sales: salesData,
      customers: customerData,
      products: productData,
      traffic: trafficData,
      conversions: conversionData,
      inventory: inventoryData,
      trends: await getTrendAnalysis(startDate, endDate),
      predictions: include_predictions ? await getPredictiveAnalytics(startDate, endDate) : null
    };
    
    res.status(200).json({
      data: dashboardData,
      meta: {
        start_date: startDate,
        end_date: endDate,
        granularity,
        include_predictions
      },
      success: true
    });
  } catch (error) {
    console.error('Business dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics', error: error.message });
  }
};

// Get sales analytics
const getSalesAnalytics = async (startDate, endDate, granularity = 'day') => {
  try {
    const groupByClause = getGroupByClause(granularity);
    
    const salesQuery = `
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as average_order_value,
        SUM(shipping_cost) as shipping_revenue,
        SUM(tax_amount) as tax_revenue,
        SUM(discount_amount) as discount_amount
      FROM orders
      WHERE created_at BETWEEN ? AND ?
        AND status IN ('delivered', 'shipped', 'confirmed')
        AND payment_status = 'paid'
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `;
    
    const [salesData] = await db.pool.execute(salesQuery, [startDate, endDate]);
    
    // Get additional metrics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        SUM(shipping_cost) as total_shipping,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discount
      FROM orders
      WHERE created_at BETWEEN ? AND ?
        AND status IN ('delivered', 'shipped', 'confirmed')
        AND payment_status = 'paid'
    `;
    
    const [summary] = await db.pool.execute(summaryQuery, [startDate, endDate]);
    
    return {
      data: salesData,
      summary: summary[0] ? {
        ...summary[0],
        total_revenue: parseFloat(summary[0].total_revenue || 0),
        average_order_value: parseFloat(summary[0].average_order_value || 0)
      } : {},
      metrics: {
        revenue_growth: calculateGrowthRate(salesData, 'revenue'),
        order_growth: calculateGrowthRate(salesData, 'order_count')
      }
    };
  } catch (error) {
    console.error('Sales analytics error:', error);
    throw error;
  }
};

// Get customer analytics
const getCustomerAnalytics = async (startDate, endDate, granularity = 'day') => {
  try {
    const groupByClause = getGroupByClause(granularity);
    
    // Customer acquisition and retention metrics
    const customerQuery = `
      SELECT 
        ${groupByClause} as period,
        COUNT(DISTINCT user_id) as new_customers,
        COUNT(DISTINCT CASE WHEN first_order_date = DATE(created_at) THEN user_id END) as first_time_customers,
        COUNT(DISTINCT CASE WHEN previous_order_date IS NOT NULL THEN user_id END) as returning_customers
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `;
    
    const [customerData] = await db.pool.execute(customerQuery, [startDate, endDate]);
    
    // Customer summary metrics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(DISTINCT CASE WHEN created_at BETWEEN ? AND ? THEN user_id END) as new_customers_period,
        AVG(CASE WHEN previous_order_date IS NOT NULL THEN 1 ELSE 0 END) as retention_rate,
        COUNT(DISTINCT CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN user_id END) as active_customers_30d,
        COUNT(DISTINCT CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN user_id END) as active_customers_7d
      FROM users
    `;
    
    const [summary] = await db.pool.execute(summaryQuery, [startDate, endDate]);
    
    // Customer value metrics
    const valueQuery = `
      SELECT 
        user_id,
        SUM(total_amount) as lifetime_value,
        COUNT(*) as order_count,
        AVG(total_amount) as average_order_value,
        MAX(created_at) as last_order_date,
        MIN(created_at) as first_order_date
      FROM orders
      WHERE created_at BETWEEN ? AND ?
        AND payment_status = 'paid'
      GROUP BY user_id
      ORDER BY lifetime_value DESC
      LIMIT 10
    `;
    
    const [topCustomers] = await db.pool.execute(valueQuery, [startDate, endDate]);
    
    return {
      data: customerData,
      summary: summary[0] || {},
      top_customers: topCustomers,
      metrics: {
        customer_acquisition_cost: await calculateCAC(summary[0]?.new_customers_period || 0),
        customer_lifetime_value: await calculateLTV(),
        churn_rate: await calculateChurnRate()
      }
    };
  } catch (error) {
    console.error('Customer analytics error:', error);
    throw error;
  }
};

// Get product analytics
const getProductAnalytics = async (startDate, endDate, granularity = 'day') => {
  try {
    // Top selling products
    const topProductsQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.subtotal) as average_price,
        (SELECT rating FROM products WHERE id = p.id) as rating,
        (SELECT review_count FROM products WHERE id = p.id) as review_count,
        p.images
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN ? AND ?
        AND o.status IN ('delivered', 'shipped', 'confirmed')
        AND o.payment_status = 'paid'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 20
    `;
    
    const [topProducts] = await db.pool.execute(topProductsQuery, [startDate, endDate]);
    
    // Product performance over time
    const performanceQuery = `
      SELECT 
        DATE(o.created_at) as date,
        p.id as product_id,
        p.name,
        SUM(oi.quantity) as units_sold,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN ? AND ?
        AND o.status IN ('delivered', 'shipped', 'confirmed')
        AND o.payment_status = 'paid'
      GROUP BY DATE(o.created_at), p.id
      ORDER BY date DESC, revenue DESC
    `;
    
    const [performance] = await db.pool.execute(performanceQuery, [startDate, endDate]);
    
    // Category performance
    const categoryQuery = `
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COUNT(DISTINCT p.id) as product_count,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.subtotal) as average_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN ? AND ?
        AND o.status IN ('delivered', 'shipped', 'confirmed')
        AND o.payment_status = 'paid'
      GROUP BY c.id
      ORDER BY total_revenue DESC
    `;
    
    const [categories] = await db.pool.execute(categoryQuery, [startDate, endDate]);
    
    // Product trends
    const trendsQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        SUM(oi.quantity) as current_period_sales,
        LAG(SUM(oi.quantity), 1, 0) OVER (PARTITION BY p.id ORDER BY DATE(o.created_at)) as previous_period_sales,
        (SUM(oi.quantity) - LAG(SUM(oi.quantity), 1, 0) OVER (PARTITION BY p.id ORDER BY DATE(o.created_at))) as sales_change
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN DATE_SUB(?, INTERVAL 60 DAY) AND ?
        AND o.status IN ('delivered', 'shipped', 'confirmed')
        AND o.payment_status = 'paid'
      GROUP BY p.id, DATE(o.created_at)
      ORDER BY sales_change DESC
      LIMIT 10
    `;
    
    const [trends] = await db.pool.execute(trendsQuery, [startDate, endDate]);
    
    return {
      top_products: topProducts.map(p => ({
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        rating: parseFloat(p.rating || 0),
        review_count: p.review_count || 0
      })),
      performance,
      categories,
      trends,
      metrics: {
        total_products_sold: topProducts.reduce((sum, p) => sum + p.total_sold, 0),
        total_product_revenue: topProducts.reduce((sum, p) => sum + parseFloat(p.total_revenue || 0), 0)
      }
    };
  } catch (error) {
    console.error('Product analytics error:', error);
    throw error;
  }
};

// Get traffic analytics
const getTrafficAnalytics = async (startDate, endDate, granularity = 'day') => {
  try {
    const groupByClause = getGroupByClause(granularity);
    
    // Traffic sources and user behavior
    const trafficQuery = `
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as page_views,
        COUNT(DISTINCT session_id) as unique_sessions,
        AVG(event_data->>"$.time_on_page") as avg_time_on_page,
        COUNT(CASE WHEN event_type = 'product_view' THEN 1 END) as product_views,
        COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) as add_to_cart_events,
        COUNT(CASE WHEN event_type = 'checkout_start' THEN 1 END) as checkout_starts
      FROM analytics
      WHERE created_at BETWEEN ? AND ?
        AND event_type IN ('page_view', 'product_view', 'add_to_cart', 'checkout_start')
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `;
    
    const [trafficData] = await db.pool.execute(trafficQuery, [startDate, endDate]);
    
    // Traffic sources
    const sourcesQuery = `
      SELECT 
        event_data->>"$.referrer" as referrer,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as page_views
      FROM analytics
      WHERE created_at BETWEEN ? AND ?
        AND event_type = 'page_view'
        AND event_data->>"$.referrer" IS NOT NULL
      GROUP BY event_data->>"$.referrer"
      ORDER BY sessions DESC
    `;
    
    const [trafficSources] = await db.pool.execute(sourcesQuery, [startDate, endDate]);
    
    // Device and browser analytics
    const deviceQuery = `
      SELECT 
        CASE 
          WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%' THEN 'Mobile'
          WHEN user_agent LIKE '%Tablet%' OR user_agent LIKE '%iPad%' THEN 'Tablet'
          ELSE 'Desktop'
        END as device_type,
        COUNT(DISTINCT session_id) as sessions
      FROM analytics
      WHERE created_at BETWEEN ? AND ?
      GROUP BY device_type
    `;
    
    const [deviceData] = await db.pool.execute(deviceQuery, [startDate, endDate]);
    
    return {
      data: trafficData,
      sources: trafficSources,
      devices: deviceData,
      metrics: {
        bounce_rate: await calculateBounceRate(),
        average_session_duration: await calculateAverageSessionDuration()
      }
    };
  } catch (error) {
    console.error('Traffic analytics error:', error);
    throw error;
  }
};

// Get conversion analytics
const getConversionAnalytics = async (startDate, endDate, granularity = 'day') => {
  try {
    const groupByClause = getGroupByClause(granularity);
    
    // Conversion funnel
    const funnelQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT CASE WHEN event_type = 'product_view' THEN session_id END) as product_views,
        COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart' THEN session_id END) as add_to_cart,
        COUNT(DISTINCT CASE WHEN event_type = 'checkout_start' THEN session_id END) as checkout_start,
        COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN session_id END) as purchases
      FROM analytics
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const [funnelData] = await db.pool.execute(funnelQuery, [startDate, endDate]);
    
    // Calculate conversion rates
    const conversionRates = funnelData.map(row => ({
      ...row,
      view_to_cart_rate: row.product_views > 0 ? (row.add_to_cart / row.product_views) * 100 : 0,
      cart_to_checkout_rate: row.add_to_cart > 0 ? (row.checkout_start / row.add_to_cart) * 100 : 0,
      checkout_to_purchase_rate: row.checkout_start > 0 ? (row.purchases / row.checkout_start) * 100 : 0,
      overall_conversion_rate: row.product_views > 0 ? (row.purchases / row.product_views) * 100 : 0
    }));
    
    // Get overall summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'product_view' THEN session_id END) as total_views,
        COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart' THEN session_id END) as total_add_to_cart,
        COUNT(DISTINCT CASE WHEN event_type = 'checkout_start' THEN session_id END) as total_checkout_start,
        COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN session_id END) as total_purchases,
        (COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN session_id END) / 
         COUNT(DISTINCT CASE WHEN event_type = 'product_view' THEN session_id END)) * 100 as overall_conversion_rate
      FROM analytics
      WHERE created_at BETWEEN ? AND ?
    `;
    
    const [summary] = await db.pool.execute(summaryQuery, [startDate, endDate]);
    
    return {
      funnel: conversionRates,
      summary: summary[0] ? {
        ...summary[0],
        overall_conversion_rate: parseFloat(summary[0].overall_conversion_rate || 0)
      } : {},
      metrics: {
        abandoned_cart_rate: await calculateAbandonedCartRate(),
        cart_recovery_rate: await calculateCartRecoveryRate()
      }
    };
  } catch (error) {
    console.error('Conversion analytics error:', error);
    throw error;
  }
};

// Get inventory analytics
const getInventoryAnalytics = async () => {
  try {
    // Low stock items
    const lowStockQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.reserved_quantity,
        (p.stock_quantity - p.reserved_quantity) as available_stock,
        p.sold_quantity,
        p.views,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE (p.stock_quantity - p.reserved_quantity) <= p.sold_quantity / 30 * 7
        AND (p.stock_quantity - p.reserved_quantity) > 0
      ORDER BY available_stock ASC
      LIMIT 20
    `;
    
    const [lowStockItems] = await db.pool.execute(lowStockQuery);
    
    // Out of stock items
    const outOfStockQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.sold_quantity,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE (p.stock_quantity - p.reserved_quantity) <= 0
      ORDER BY p.sold_quantity DESC
      LIMIT 20
    `;
    
    const [outOfStockItems] = await db.pool.execute(outOfStockQuery);
    
    // Fast moving items (high turnover)
    const fastMovingQuery = `
      SELECT 
        p.id as product_id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.sold_quantity,
        (p.sold_quantity / (p.stock_quantity + p.sold_quantity)) * 100 as turnover_rate,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity + p.sold_quantity > 0
      ORDER BY turnover_rate DESC
      LIMIT 20
    `;
    
    const [fastMovingItems] = await db.pool.execute(fastMovingQuery);
    
    // Inventory value
    const inventoryValueQuery = `
      SELECT 
        SUM(p.price * (p.stock_quantity - p.reserved_quantity)) as total_inventory_value,
        COUNT(*) as total_products,
        AVG(p.price) as average_product_value,
        SUM(CASE WHEN (p.stock_quantity - p.reserved_quantity) <= 0 THEN p.price ELSE 0 END) as value_out_of_stock,
        SUM(CASE WHEN (p.stock_quantity - p.reserved_quantity) <= p.sold_quantity / 30 * 7 THEN p.price ELSE 0 END) as value_low_stock
      FROM products p
      WHERE p.is_active = 1
    `;
    
    const [inventoryValue] = await db.pool.execute(inventoryValueQuery);
    
    return {
      low_stock: lowStockItems,
      out_of_stock: outOfStockItems,
      fast_moving: fastMovingItems,
      value: inventoryValue[0] || {},
      metrics: {
        days_of_supply: await calculateDaysOfSupply(),
        inventory_turnover: await calculateInventoryTurnover()
      }
    };
  } catch (error) {
    console.error('Inventory analytics error:', error);
    throw error;
  }
};

// Calculate customer acquisition cost
const calculateCAC = async (newCustomers) => {
  // In a real implementation, this would factor in marketing expenses
  // For now, using a simplified calculation
  const marketingSpend = 10000; // Placeholder - would come from marketing data
  return newCustomers > 0 ? marketingSpend / newCustomers : 0;
};

// Calculate customer lifetime value
const calculateLTV = async () => {
  // In a real implementation, this would use retention rates and average order value
  // For now, using a simplified calculation
  const avgOrderValue = await getAverageOrderValue();
  const avgOrderFrequency = 5; // Average orders per customer per year
  const customerLifespan = 3; // Average years as customer
  
  return avgOrderValue * avgOrderFrequency * customerLifespan;
};

// Get average order value
const getAverageOrderValue = async () => {
  const [result] = await db.pool.execute(`
    SELECT AVG(total_amount) as aov 
    FROM orders 
    WHERE payment_status = 'paid' AND status IN ('delivered', 'shipped', 'confirmed')
  `);
  return parseFloat(result[0]?.aov || 0);
};

// Calculate churn rate
const calculateChurnRate = async () => {
  const [result] = await db.pool.execute(`
    SELECT 
      (COUNT(CASE WHEN last_order_date < DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 1 END) / 
       COUNT(*)) * 100 as churn_rate
    FROM users
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
  `);
  return parseFloat(result[0]?.churn_rate || 0);
};

// Calculate bounce rate
const calculateBounceRate = async () => {
  // Simplified calculation - in real app would need more complex logic
  const [result] = await db.pool.execute(`
    SELECT 
      (COUNT(CASE WHEN (SELECT COUNT(*) FROM analytics a2 WHERE a2.session_id = a1.session_id) = 1 THEN 1 END) / 
       COUNT(DISTINCT session_id)) * 100 as bounce_rate
    FROM analytics a1
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);
  return parseFloat(result[0]?.bounce_rate || 0);
};

// Calculate average session duration
const calculateAverageSessionDuration = async () => {
  // Simplified - would need proper time tracking
  return 180; // 3 minutes average
};

// Calculate abandoned cart rate
const calculateAbandonedCartRate = async () => {
  const [result] = await db.pool.execute(`
    SELECT 
      (COUNT(CASE WHEN status = 'abandoned' THEN 1 END) / COUNT(*)) * 100 as abandoned_cart_rate
    FROM cart_sessions
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
  `);
  return parseFloat(result[0]?.abandoned_cart_rate || 0);
};

// Calculate cart recovery rate
const calculateCartRecoveryRate = async () => {
  // Simplified calculation
  const [result] = await db.pool.execute(`
    SELECT 
      (COUNT(CASE WHEN recovered_cart_id IS NOT NULL THEN 1 END) / 
       COUNT(*)) * 100 as cart_recovery_rate
    FROM cart_recovery_attempts
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `);
  return parseFloat(result[0]?.cart_recovery_rate || 0);
};

// Calculate days of supply
const calculateDaysOfSupply = async () => {
  const [result] = await db.pool.execute(`
    SELECT 
      AVG((p.stock_quantity - p.reserved_quantity) / GREATEST(p.sold_quantity / 30, 1)) * 30 as days_of_supply
    FROM products p
    WHERE p.sold_quantity > 0
  `);
  return Math.round(result[0]?.days_of_supply || 0);
};

// Calculate inventory turnover
const calculateInventoryTurnover = async () => {
  const [result] = await db.pool.execute(`
    SELECT 
      (SUM(oi.quantity) / AVG(p.stock_quantity)) as inventory_turnover
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
  `);
  return parseFloat(result[0]?.inventory_turnover || 0);
};

// Get trend analysis
const getTrendAnalysis = async (startDate, endDate) => {
  try {
    // Sales trends
    const salesTrendQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as daily_sales
      FROM orders
      WHERE created_at BETWEEN ? AND ?
        AND status IN ('delivered', 'shipped', 'confirmed')
        AND payment_status = 'paid'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const [salesTrend] = await db.pool.execute(salesTrendQuery, [startDate, endDate]);
    
    // Calculate trend line
    const trendData = calculateTrendLine(salesTrend.map(d => ({ x: new Date(d.date).getTime(), y: d.daily_sales })));
    
    return {
      sales: {
        data: salesTrend,
        trend_line: trendData,
        growth_rate: calculateGrowthRate(salesTrend, 'daily_sales')
      },
      // Add other trend analyses as needed
      customer_acquisition: await getCustomerTrend(startDate, endDate),
      product_performance: await getProductTrend(startDate, endDate)
    };
  } catch (error) {
    console.error('Trend analysis error:', error);
    return {};
  }
};

// Calculate trend line using linear regression
const calculateTrendLine = (data) => {
  if (data.length < 2) return [];
  
  // Simple linear regression calculation
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += data[i].x;
    sumY += data[i].y;
    sumXY += data[i].x * data[i].y;
    sumX2 += data[i].x * data[i].x;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map(point => ({
    x: point.x,
    y: slope * point.x + intercept
  }));
};

// Calculate growth rate
const calculateGrowthRate = (data, field) => {
  if (data.length < 2) return 0;
  
  const firstValue = parseFloat(data[0][field]) || 0;
  const lastValue = parseFloat(data[data.length - 1][field]) || 0;
  
  if (firstValue === 0) return lastValue > 0 ? Infinity : 0;
  
  return ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
};

// Get predictive analytics
const getPredictiveAnalytics = async (startDate, endDate) => {
  try {
    // Sales prediction using simple moving average
    const salesPrediction = await predictSales(startDate, endDate);
    
    // Customer acquisition prediction
    const customerPrediction = await predictCustomerAcquisition(startDate, endDate);
    
    // Inventory demand prediction
    const inventoryPrediction = await predictInventoryDemand();
    
    return {
      sales: salesPrediction,
      customers: customerPrediction,
      inventory: inventoryPrediction,
      confidence_level: 0.85 // Placeholder - would be calculated based on model accuracy
    };
  } catch (error) {
    console.error('Predictive analytics error:', error);
    return null;
  }
};

// Predict sales using historical data
const predictSales = async (startDate, endDate) => {
  // Simple prediction based on average growth
  const historyQuery = `
    SELECT 
      DATE(created_at) as date,
      SUM(total_amount) as daily_sales
    FROM orders
    WHERE created_at BETWEEN DATE_SUB(?, INTERVAL 6 MONTH) AND ?
      AND status IN ('delivered', 'shipped', 'confirmed')
      AND payment_status = 'paid'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
  
  const [history] = await db.pool.execute(historyQuery, [startDate, endDate]);
  
  // Calculate average daily sales and trend
  const avgDailySales = history.reduce((sum, day) => sum + (parseFloat(day.daily_sales) || 0), 0) / history.length;
  const growthRate = calculateGrowthRate(history, 'daily_sales');
  
  // Predict next 30 days
  const predictions = [];
  const predictionStart = new Date(endDate);
  predictionStart.setDate(predictionStart.getDate() + 1);
  
  for (let i = 0; i < 30; i++) {
    const predictionDate = new Date(predictionStart);
    predictionDate.setDate(predictionDate.getDate() + i);
    
    const predictedValue = avgDailySales * (1 + (growthRate / 100) * (i + 1));
    
    predictions.push({
      date: predictionDate.toISOString().split('T')[0],
      predicted_sales: predictedValue,
      scenario: 'optimistic' // Would have different scenarios in real implementation
    });
  }
  
  return {
    model_used: 'simple_trend',
    predictions: predictions,
    accuracy: 0.75 // Placeholder
  };
};

// Predict customer acquisition
const predictCustomerAcquisition = async (startDate, endDate) => {
  // Similar to sales prediction but for customers
  const customerHistoryQuery = `
    SELECT 
      DATE(created_at) as date,
      COUNT(DISTINCT user_id) as new_customers
    FROM orders
    WHERE created_at BETWEEN DATE_SUB(?, INTERVAL 6 MONTH) AND ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
  
  const [history] = await db.pool.execute(customerHistoryQuery, [startDate, endDate]);
  
  const avgDailyCustomers = history.reduce((sum, day) => sum + (day.new_customers || 0), 0) / history.length;
  
  // Predict next 30 days
  const predictions = [];
  const predictionStart = new Date(endDate);
  predictionStart.setDate(predictionStart.getDate() + 1);
  
  for (let i = 0; i < 30; i++) {
    const predictionDate = new Date(predictionStart);
    predictionDate.setDate(predictionDate.getDate() + i);
    
    predictions.push({
      date: predictionDate.toISOString().split('T')[0],
      predicted_customers: Math.round(avgDailyCustomers * (1 + 0.05 * i)) // 5% growth factor
    });
  }
  
  return {
    predictions: predictions
  };
};

// Predict inventory demand
const predictInventoryDemand = async () => {
  // Predict which items will be in high demand
  const demandQuery = `
    SELECT 
      p.id as product_id,
      p.name,
      p.sku,
      p.sold_quantity,
      p.stock_quantity,
      (p.sold_quantity / 30) as avg_daily_sales, -- assuming 30-day calculation
      (p.stock_quantity / GREATEST(p.sold_quantity / 30, 1)) as days_of_stock
    FROM products p
    WHERE p.is_active = 1
      AND p.sold_quantity > 0
    ORDER BY (p.sold_quantity / 30) DESC
    LIMIT 50
  `;
  
  const [demand] = await db.pool.execute(demandQuery);
  
  return demand.map(item => ({
    ...item,
    recommended_reorder: item.days_of_stock < 7, // Reorder if less than 7 days stock
    suggested_quantity: Math.ceil(item.avg_daily_sales * 14) // Suggest 14 days worth
  }));
};

// Parse date strings
const parseDate = (dateString) => {
  if (dateString === 'now') return new Date();
  if (dateString === '30 days ago') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (dateString === '7 days ago') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Try to parse as ISO format or SQL format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  return date;
};

// Get GROUP BY clause based on granularity
const getGroupByClause = (granularity) => {
  switch (granularity) {
    case 'year':
      return "DATE_FORMAT(created_at, '%Y')";
    case 'month':
      return "DATE_FORMAT(created_at, '%Y-%m')";
    case 'week':
      return "DATE_FORMAT(created_at, '%Y-%u')"; // %u is week number
    case 'day':
    default:
      return "DATE(created_at)";
  }
};

// Get seller-specific analytics
const getSellerAnalytics = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { 
      start_date = '30 days ago', 
      end_date = 'now',
      granularity = 'day'
    } = req.query;
    
    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);
    
    // Get seller's order items
    const salesQuery = `
      SELECT 
        o.id as order_id,
        o.order_number,
        o.status,
        o.total_amount,
        o.created_at,
        SUM(oi.subtotal) as seller_revenue,
        SUM(oi.quantity) as items_sold,
        u.name as customer_name,
        u.email as customer_email
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE oi.seller_id = ?
        AND o.created_at BETWEEN ? AND ?
        AND o.status IN ('delivered', 'shipped', 'confirmed')
        AND o.payment_status = 'paid'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    
    const [salesData] = await db.pool.execute(salesQuery, [sellerId, startDate, endDate]);
    
    // Get seller summary metrics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.subtotal) as average_order_value,
        SUM(oi.quantity) as total_items_sold,
        COUNT(DISTINCT o.user_id) as unique_customers
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.seller_id = ?
        AND o.created_at BETWEEN ? AND ?
        AND o.status IN ('delivered', 'shipped', 'confirmed')
        AND o.payment_status = 'paid'
    `;
    
    const [summary] = await db.pool.execute(summaryQuery, [sellerId, startDate, endDate]);
    
    // Commission analytics
    const commissionQuery = `
      SELECT 
        SUM(commission_amount) as total_commission,
        SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END) as approved_commission,
        SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_commission
      FROM affiliate_commissions
      WHERE order_id IN (SELECT o.id FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE oi.seller_id = ?)
        AND created_at BETWEEN ? AND ?
    `;
    
    const [commission] = await db.pool.execute(commissionQuery, [sellerId, startDate, endDate]);
    
    res.status(200).json({
      analytics: {
        sales: salesData,
        summary: summary[0] ? {
          ...summary[0],
          total_revenue: parseFloat(summary[0].total_revenue || 0),
          average_order_value: parseFloat(summary[0].average_order_value || 0)
        } : {},
        commission: commission[0] || {},
        top_products: await getSellerTopProducts(sellerId, startDate, endDate)
      },
      success: true
    });
  } catch (error) {
    console.error('Seller analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching seller analytics', error: error.message });
  }
};

// Get seller top products
const getSellerTopProducts = async (sellerId, startDate, endDate) => {
  const query = `
    SELECT 
      p.id as product_id,
      p.name,
      p.sku,
      SUM(oi.quantity) as total_sold,
      SUM(oi.subtotal) as total_revenue,
      AVG(oi.subtotal) as average_price
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.seller_id = ?
      AND o.created_at BETWEEN ? AND ?
      AND o.status IN ('delivered', 'shipped', 'confirmed')
      AND o.payment_status = 'paid'
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 10
  `;
  
  const [products] = await db.pool.execute(query, [sellerId, startDate, endDate]);
  return products;
};

// Get real-time analytics (for dashboard)
const getRealTimeAnalytics = async (req, res) => {
  try {
    // Last 24 hours data
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Recent orders
    const recentOrdersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        u.name as customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= ?
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    
    const [recentOrders] = await db.pool.execute(recentOrdersQuery, [last24Hours]);
    
    // Active customers
    const activeCustomersQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as active_customers,
        COUNT(*) as total_actions
      FROM analytics
      WHERE created_at >= ?
    `;
    
    const [activeData] = await db.pool.execute(activeCustomersQuery, [last24Hours]);
    
    // Sales in last hour
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const hourlySalesQuery = `
      SELECT SUM(total_amount) as hourly_sales
      FROM orders
      WHERE created_at >= ? AND status IN ('delivered', 'shipped', 'confirmed')
    `;
    
    const [hourlySales] = await db.pool.execute(hourlySalesQuery, [lastHour]);
    
    res.status(200).json({
      real_time: {
        recent_orders: recentOrders,
        active_customers: activeData[0]?.active_customers || 0,
        total_actions_last_24h: activeData[0]?.total_actions || 0,
        sales_last_hour: parseFloat(hourlySales[0]?.hourly_sales || 0),
        active_sellers: await getActiveSellersCount(lastHour)
      },
      timestamp: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching real-time analytics', error: error.message });
  }
};

// Get active sellers count
const getActiveSellersCount = async (since) => {
  const query = `
    SELECT COUNT(DISTINCT oi.seller_id) as active_sellers
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= ?
  `;
  
  const [result] = await db.pool.execute(query, [since]);
  return result[0]?.active_sellers || 0;
};

module.exports = {
  getBusinessDashboardAnalytics,
  getSellerAnalytics,
  getRealTimeAnalytics
};
// advancedProductController.js - Advanced product management with multi-vendor support
const db = require('../db');

// Advanced product search with AI recommendations
const searchProducts = async (req, res) => {
  try {
    const { 
      q, 
      page = 1, 
      limit = 10, 
      category, 
      minPrice, 
      maxPrice,
      brand,
      sortBy = 'relevance',
      sortOrder = 'DESC',
      filters = {},
      seller_id,
      condition = 'new', // new, used, refurbished
      free_shipping = null,
      in_stock = null
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.is_active = 1';
    let params = [];
    
    // Text search (name, description, brand, tags)
    if (q) {
      whereClause += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR b.name LIKE ?)`;
      const searchParam = `%${q}%`;
      params.push(searchParam, searchParam, `%${q}%`, searchParam);
    }
    
    // Category filter
    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }
    
    // Brand filter
    if (brand) {
      whereClause += ' AND p.brand_id = ?';
      params.push(brand);
    }
    
    // Price range
    if (minPrice) {
      whereClause += ' AND p.price >= ?';
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      whereClause += ' AND p.price <= ?';
      params.push(parseFloat(maxPrice));
    }
    
    // Seller filter (for marketplace)
    if (seller_id) {
      whereClause += ' AND p.created_by = ?';
      params.push(seller_id);
    }
    
    // Condition filter
    if (condition) {
      whereClause += ' AND p.condition = ?';
      params.push(condition);
    }
    
    // Free shipping filter
    if (free_shipping !== null) {
      whereClause += ' AND p.free_shipping = ?';
      params.push(free_shipping === 'true' ? 1 : 0);
    }
    
    // In stock filter
    if (in_stock !== null) {
      whereClause += ' AND (p.stock_quantity - p.reserved_quantity) > ?';
      params.push(in_stock === 'true' ? 0 : -1);
    }
    
    // Additional filters (coming from query or AI recommendations)
    if (filters.color) {
      whereClause += ' AND JSON_CONTAINS(p.specifications, ?) = 1';
      params.push(`{"color": "${filters.color}"}`);
    }
    if (filters.size) {
      whereClause += ' AND JSON_CONTAINS(p.specifications, ?) = 1';
      params.push(`{"size": "${filters.size}"}`);
    }
    if (filters.material) {
      whereClause += ' AND JSON_CONTAINS(p.specifications, ?) = 1';
      params.push(`{"material": "${filters.material}"}`);
    }
    
    // Advanced sorting options
    let orderByClause = '';
    switch (sortBy) {
      case 'price':
        orderByClause = `ORDER BY p.price ${sortOrder}`;
        break;
      case 'rating':
        orderByClause = `ORDER BY p.rating ${sortOrder}, p.review_count DESC`;
        break;
      case 'popularity':
        orderByClause = `ORDER BY p.sold_quantity ${sortOrder}, p.views DESC`;
        break;
      case 'newest':
        orderByClause = `ORDER BY p.created_at ${sortOrder}`;
        break;
      case 'relevance':
        // For relevance, we'll use custom scoring if query exists
        if (q) {
          orderByClause = `ORDER BY 
            CASE 
              WHEN p.name LIKE ? THEN 1
              WHEN p.description LIKE ? THEN 2
              WHEN p.tags LIKE ? THEN 3
              ELSE 4
            END,
            p.rating DESC, 
            p.sold_quantity DESC`;
          params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        } else {
          orderByClause = `ORDER BY p.created_at DESC`;
        }
        break;
      default:
        orderByClause = `ORDER BY p.created_at DESC`;
    }
    
    // Main query with joins
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        u.name as seller_name,
        u.id as seller_id,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as calculated_rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as calculated_review_count,
        (p.stock_quantity - p.reserved_quantity) as available_stock,
        CASE 
          WHEN EXISTS(SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = p.id) 
          THEN 1 
          ELSE 0 
        END as is_wishlisted
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    
    // Add user ID for wishlist check and pagination params
    params.push(req.user ? req.user.userId : 0); // user_id for wishlist check
    params.push(parseInt(limit), parseInt(offset));
    
    const [products] = await db.pool.execute(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause.replace('ORDER BY', 'AND')}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset params
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Calculate AI-powered recommendations if user is logged in
    let recommendations = [];
    if (req.user && q) {
      recommendations = await getPersonalizedRecommendations(req.user.userId, q, 5);
    }
    
    // Enhance products with additional data
    const enhancedProducts = products.map(product => ({
      ...product,
      calculated_rating: parseFloat(product.calculated_rating || product.rating || 0),
      calculated_review_count: product.calculated_review_count || product.review_count || 0,
      available_stock: product.available_stock || 0,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      seller_info: {
        id: product.seller_id,
        name: product.seller_name
      }
    }));
    
    res.status(200).json({
      products: enhancedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      recommendations,
      filters_applied: {
        q,
        category,
        minPrice,
        maxPrice,
        brand,
        condition,
        free_shipping,
        in_stock
      },
      success: true
    });
  } catch (error) {
    console.error('Advanced search products error:', error);
    res.status(500).json({ message: 'Server error while searching products', error: error.message });
  }
};

// Get personalized recommendations
const getPersonalizedRecommendations = async (userId, searchQuery, limit = 5) => {
  if (!userId) return [];

  try {
    // Get user's purchase history and browsing history
    let recommendationsQuery = `
      SELECT DISTINCT p.*, 
             (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id) as rating,
             (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id) as review_count
      FROM products p
      WHERE p.id != ?
        AND p.is_active = 1
        AND p.stock_quantity > p.reserved_quantity
    `;
    
    let params = [0]; // placeholder for main product ID, will be replaced based on logic
    
    // If user has purchase history, recommend similar products
    const orderItemsQuery = `
      SELECT DISTINCT oi.product_id 
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    const [orderItems] = await db.pool.execute(orderItemsQuery, [userId]);
    
    if (orderItems.length > 0) {
      // Get categories of previously purchased products
      const purchasedProductIds = orderItems.map(item => item.product_id);
      const categoryQuery = `
        SELECT DISTINCT p.category_id 
        FROM products p 
        WHERE p.id IN (${purchasedProductIds.map(() => '?').join(',')})
      `;
      const [categories] = await db.pool.execute(categoryQuery, purchasedProductIds);
      
      if (categories.length > 0) {
        const categoryIds = categories.map(cat => cat.category_id);
        recommendationsQuery += ` AND p.category_id IN (${categoryIds.map(() => '?').join(',')})`;
        params = params.concat(categoryIds);
      }
    } else {
      // If no purchase history, recommend trending products
      recommendationsQuery += ` ORDER BY p.sold_quantity DESC, p.views DESC, p.rating DESC`;
      params = []; // Remove the placeholder
    }
    
    recommendationsQuery += ` LIMIT ?`;
    params.push(limit);
    
    const [recommendedProducts] = await db.pool.execute(recommendationsQuery, params);
    
    // Calculate relevance score based on search query if provided
    if (searchQuery) {
      return recommendedProducts.sort((a, b) => {
        const aScore = calculateRelevanceScore(a, searchQuery);
        const bScore = calculateRelevanceScore(b, searchQuery);
        return bScore - aScore; // Higher score first
      });
    }
    
    return recommendedProducts;
  } catch (error) {
    console.error('Recommendation error:', error);
    return [];
  }
};

// Calculate relevance score for products
const calculateRelevanceScore = (product, query) => {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const lowerName = product.name.toLowerCase();
  const lowerDesc = product.description ? product.description.toLowerCase() : '';
  
  // Name match gets higher score
  if (lowerName.includes(lowerQuery)) {
    score += 100;
    // Bonus for exact match
    if (lowerName === lowerQuery) score += 50;
  }
  
  // Description match
  if (lowerDesc.includes(lowerQuery)) {
    score += 50;
  }
  
  // Rating bonus
  score += (product.rating || 0) * 10;
  
  // Sales volume bonus
  score += Math.log(product.sold_quantity + 1) * 5;
  
  // Freshness bonus (newer products)
  const daysSinceCreated = (new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 30 - daysSinceCreated); // Bonus for products created within 30 days
  
  return score;
};

// Create product with advanced features (multi-vendor, specifications, etc.)
const createProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      description,
      short_description,
      price,
      sale_price,
      category_id,
      brand_id,
      stock_quantity,
      sku,
      condition = 'new',
      free_shipping = false,
      weight,
      dimensions,
      images,
      specifications,
      tags,
      meta_title,
      meta_description,
      attributes = {}, // Additional product attributes
      variants = [], // Product variants (size, color, etc.)
      return_policy,
      warranty_info,
      shipping_info
    } = req.body;
    
    // Validate required fields
    if (!name || price === undefined || !category_id) {
      return res.status(400).json({ 
        message: 'Name, price, and category are required' 
      });
    }
    
    // Check user permissions
    const userQuery = 'SELECT role, company_id FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Only admins, super_sellers, and verified sellers can create products
    if (!['admin', 'seller'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    
    if (user.role === 'seller' && !user.company_id) {
      return res.status(403).json({ message: 'Seller account not associated with a company.' });
    }
    
    // Check if category exists
    const categoryCheckQuery = 'SELECT id FROM categories WHERE id = ? AND is_active = 1';
    const [categories] = await db.pool.execute(categoryCheckQuery, [category_id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found or inactive' });
    }
    
    // Check if brand exists (if provided)
    if (brand_id) {
      const brandCheckQuery = 'SELECT id FROM brands WHERE id = ?';
      const [brands] = await db.pool.execute(brandCheckQuery, [brand_id]);
      
      if (brands.length === 0) {
        return res.status(404).json({ message: 'Brand not found' });
      }
    }
    
    // Check for duplicate SKU
    if (sku) {
      const skuCheckQuery = 'SELECT id FROM products WHERE sku = ?';
      const [existingSkus] = await db.pool.execute(skuCheckQuery, [sku]);
      
      if (existingSkus.length > 0) {
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }
    
    // Start transaction for atomicity
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert product
      const productQuery = `
        INSERT INTO products (
          name, slug, description, short_description, sku, price, sale_price, 
          category_id, brand_id, stock_quantity, reserved_quantity, sold_quantity,
          weight, dimensions, images, specifications, tags, meta_title, meta_description,
          is_active, is_featured, is_new, rating, review_count, views, 
          created_by, created_at, updated_at, condition, free_shipping,
          attributes, return_policy, warranty_info, shipping_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // Generate slug from name
      const slug = generateSlug(name);
      
      const [result] = await connection.execute(productQuery, [
        name,
        slug,
        description,
        short_description,
        sku,
        parseFloat(price),
        sale_price ? parseFloat(sale_price) : null,
        category_id,
        brand_id,
        parseInt(stock_quantity) || 0,
        0, // reserved_quantity
        0, // sold_quantity
        weight ? parseFloat(weight) : null,
        dimensions,
        JSON.stringify(images || []),
        JSON.stringify(specifications || {}),
        JSON.stringify(tags || []),
        meta_title,
        meta_description,
        1, // is_active
        0, // is_featured
        1, // is_new (newly created)
        0, // rating
        0, // review_count
        0, // views
        userId, // created_by
        condition,
        free_shipping,
        JSON.stringify(attributes),
        return_policy,
        warranty_info,
        shipping_info
      ]);
      
      const productId = result.insertId;
      
      // Create product images records if provided
      if (images && Array.isArray(images)) {
        for (let i = 0; i < images.length; i++) {
          const imageQuery = `
            INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) 
            VALUES (?, ?, ?, ?, ?)
          `;
          await connection.execute(imageQuery, [
            productId,
            images[i].url || images[i],
            images[i].alt_text || '',
            i,
            i === 0 ? 1 : 0 // First image is primary
          ]);
        }
      }
      
      // Create product variants if provided
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          const variantQuery = `
            INSERT INTO product_variants (
              product_id, name, sku, price, sale_price, stock_quantity, 
              specifications, attributes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await connection.execute(variantQuery, [
            productId,
            variant.name,
            variant.sku,
            variant.price ? parseFloat(variant.price) : parseFloat(price),
            variant.sale_price ? parseFloat(variant.sale_price) : (sale_price ? parseFloat(sale_price) : null),
            variant.stock_quantity || 0,
            JSON.stringify(variant.specifications || {}),
            JSON.stringify(variant.attributes || {}),
            userId
          ]);
        }
      }
      
      // Update category product count
      await connection.execute(
        'UPDATE categories SET product_count = product_count + 1 WHERE id = ?',
        [category_id]
      );
      
      // Update seller product count
      if (user.company_id) {
        await connection.execute(
          'UPDATE companies SET product_count = product_count + 1 WHERE id = ?',
          [user.company_id]
        );
      }
      
      await connection.commit();
      connection.release();
      
      // Emit product creation event for analytics
      setTimeout(() => {
        console.log(`Product created event: ${productId} by user ${userId}`);
      }, 0);
      
      res.status(201).json({ 
        message: 'Product created successfully', 
        productId,
        product: {
          id: productId,
          name,
          slug,
          price: parseFloat(price),
          stock_quantity: parseInt(stock_quantity) || 0,
          status: 'active',
          created_at: new Date().toISOString()
        },
        success: true
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      message: 'Server error while creating product', 
      error: error.message 
    });
  }
};

// Update product with advanced features
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      name,
      description,
      short_description,
      price,
      sale_price,
      category_id,
      brand_id,
      stock_quantity,
      sku,
      condition,
      free_shipping,
      weight,
      dimensions,
      images,
      specifications,
      tags,
      meta_title,
      meta_description,
      attributes,
      variants,
      return_policy,
      warranty_info,
      shipping_info
    } = req.body;
    
    // Check if product exists and user has permission
    const productQuery = `
      SELECT p.*, u.role, u.company_id 
      FROM products p 
      JOIN users u ON p.created_by = u.id 
      WHERE p.id = ?
    `;
    const [products] = await db.pool.execute(productQuery, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    
    // Check permissions
    if (product.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You can only update products you created.' });
    }
    
    // Validate fields if they exist
    if (category_id) {
      const categoryCheckQuery = 'SELECT id FROM categories WHERE id = ?';
      const [categories] = await db.pool.execute(categoryCheckQuery, [category_id]);
      if (categories.length === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    
    // Check for duplicate SKU if changed
    if (sku && sku !== product.sku) {
      const skuCheckQuery = 'SELECT id FROM products WHERE sku = ? AND id != ?';
      const [existingSkus] = await db.pool.execute(skuCheckQuery, [sku, id]);
      if (existingSkus.length > 0) {
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }
    
    // Update query
    const updateQuery = `
      UPDATE products SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        price = COALESCE(?, price),
        sale_price = COALESCE(?, sale_price),
        category_id = COALESCE(?, category_id),
        brand_id = COALESCE(?, brand_id),
        stock_quantity = COALESCE(?, stock_quantity),
        sku = COALESCE(?, sku),
        condition = COALESCE(?, condition),
        free_shipping = COALESCE(?, free_shipping),
        weight = COALESCE(?, weight),
        dimensions = COALESCE(?, dimensions),
        images = COALESCE(?, images),
        specifications = COALESCE(?, specifications),
        tags = COALESCE(?, tags),
        meta_title = COALESCE(?, meta_title),
        meta_description = COALESCE(?, meta_description),
        attributes = COALESCE(?, attributes),
        return_policy = COALESCE(?, return_policy),
        warranty_info = COALESCE(?, warranty_info),
        shipping_info = COALESCE(?, shipping_info),
        updated_at = NOW()
      WHERE id = ?
    `;
    
    const [result] = await db.pool.execute(updateQuery, [
      name, 
      name ? generateSlug(name) : null, // Update slug if name changes
      description, 
      short_description, 
      price ? parseFloat(price) : null, 
      sale_price ? parseFloat(sale_price) : null, 
      category_id, 
      brand_id, 
      stock_quantity ? parseInt(stock_quantity) : null, 
      sku, 
      condition, 
      free_shipping, 
      weight ? parseFloat(weight) : null, 
      dimensions, 
      images ? JSON.stringify(images) : null, 
      specifications ? JSON.stringify(specifications) : null, 
      tags ? JSON.stringify(tags) : null, 
      meta_title, 
      meta_description, 
      attributes ? JSON.stringify(attributes) : null, 
      return_policy, 
      warranty_info, 
      shipping_info, 
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found or no changes made' });
    }
    
    // Update product images if provided
    if (images) {
      // Delete existing images
      await db.pool.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
      
      // Insert new images
      for (let i = 0; i < images.length; i++) {
        const imageQuery = `
          INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) 
          VALUES (?, ?, ?, ?, ?)
        `;
        await db.pool.execute(imageQuery, [
          id,
          images[i].url || images[i],
          images[i].alt_text || '',
          i,
          i === 0 ? 1 : 0
        ]);
      }
    }
    
    // Update variants if provided
    if (variants) {
      // This would be more complex in a real implementation with proper variant management
      // For now, we'll just log that variants need to be updated
      console.log(`Variants for product ${id} need to be updated`);
    }
    
    // Get updated product
    const [updatedProducts] = await db.pool.execute(
      'SELECT * FROM products WHERE id = ?', 
      [id]
    );
    
    res.status(200).json({ 
      message: 'Product updated successfully', 
      product: updatedProducts[0],
      success: true
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error while updating product', error: error.message });
  }
};

// Generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Get trending products
const getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10, days = 7, category_id } = req.query;
    
    let whereClause = 'WHERE p.is_active = 1';
    let params = [];
    
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as review_count,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
        AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY p.views DESC, p.sold_quantity DESC
      LIMIT ?
    `;
    
    params.push(parseInt(days), parseInt(limit));
    
    const [products] = await db.pool.execute(query, params);
    
    const enhancedProducts = products.map(product => ({
      ...product,
      rating: parseFloat(product.rating || product.rating || 0),
      review_count: product.review_count || product.review_count || 0,
      available_stock: product.available_stock || 0,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      attributes: product.attributes ? JSON.parse(product.attributes) : {}
    }));
    
    res.status(200).json({
      products: enhancedProducts,
      meta: {
        limit: parseInt(limit),
        days: parseInt(days),
        category_id: category_id || null
      },
      success: true
    });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({ message: 'Server error while fetching trending products', error: error.message });
  }
};

// Get best selling products
const getBestSellingProducts = async (req, res) => {
  try {
    const { limit = 10, days = 30, category_id } = req.query;
    
    let whereClause = 'WHERE p.is_active = 1';
    let params = [];
    
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        (SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON oi.order_id = o.id 
         WHERE oi.product_id = p.id AND o.status = 'delivered' 
         AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as total_sold,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as review_count,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY total_sold DESC, p.sold_quantity DESC
      LIMIT ?
    `;
    
    params.push(parseInt(days), parseInt(limit));
    
    const [products] = await db.pool.execute(query, params);
    
    const enhancedProducts = products.map(product => ({
      ...product,
      total_sold: product.total_sold || 0,
      rating: parseFloat(product.rating || 0),
      review_count: product.review_count || 0,
      available_stock: product.available_stock || 0,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      attributes: product.attributes ? JSON.parse(product.attributes) : {}
    }));
    
    res.status(200).json({
      products: enhancedProducts,
      meta: {
        limit: parseInt(limit),
        days: parseInt(days),
        category_id: category_id || null
      },
      success: true
    });
  } catch (error) {
    console.error('Get best selling products error:', error);
    res.status(500).json({ message: 'Server error while fetching best selling products', error: error.message });
  }
};

// Get product recommendations based on user behavior
const getProductRecommendations = async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;
    const { limit = 10, type = 'personalized' } = req.query;
    
    let products = [];
    
    if (type === 'personalized' && userId) {
      // Get personalized recommendations based on user behavior
      products = await getPersonalizedProductRecommendations(userId, limit);
    } else if (type === 'trending') {
      // Get trending products for all users
      const trendingQuery = `
        SELECT p.*, 
               (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating
        FROM products p
        WHERE p.is_active = 1
        ORDER BY p.views DESC, p.sold_quantity DESC
        LIMIT ?
      `;
      const [trendingProducts] = await db.pool.execute(trendingQuery, [limit]);
      products = trendingProducts;
    } else if (type === 'new_arrivals') {
      // Get new arrival products
      const newQuery = `
        SELECT p.*, 
               (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating
        FROM products p
        WHERE p.is_active = 1 AND p.is_new = 1
        ORDER BY p.created_at DESC
        LIMIT ?
      `;
      const [newProducts] = await db.pool.execute(newQuery, [limit]);
      products = newProducts;
    } else {
      // Default: mix of trending and personalized
      if (userId) {
        products = await getPersonalizedProductRecommendations(userId, Math.ceil(limit / 2));
        const trending = await db.pool.execute(
          `SELECT * FROM products WHERE is_active = 1 ORDER BY views DESC LIMIT ?`,
          [Math.floor(limit / 2)]
        );
        products = [...products, ...trending[0]];
      } else {
        const trendingQuery = `
          SELECT p.*, 
                 (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating
          FROM products p
          WHERE p.is_active = 1
          ORDER BY p.views DESC, p.rating DESC
          LIMIT ?
        `;
        const [trendingProducts] = await db.pool.execute(trendingQuery, [limit]);
        products = trendingProducts;
      }
    }
    
    const enhancedProducts = products.map(product => ({
      ...product,
      rating: parseFloat(product.rating || 0),
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      images: product.images ? JSON.parse(product.images) : [],
      attributes: product.attributes ? JSON.parse(product.attributes) : {}
    }));
    
    res.status(200).json({
      products: enhancedProducts,
      meta: {
        limit: parseInt(limit),
        type,
        user_id: userId
      },
      success: true
    });
  } catch (error) {
    console.error('Get product recommendations error:', error);
    res.status(500).json({ message: 'Server error while fetching recommendations', error: error.message });
  }
};

// Advanced recommendation algorithm
const getPersonalizedProductRecommendations = async (userId, limit) => {
  try {
    // 1. Based on user's purchase history
    const purchaseQuery = `
      SELECT DISTINCT p2.* 
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN order_items oi2 ON o.id = oi2.order_id
      JOIN products p2 ON oi2.product_id = p2.id
      WHERE o.user_id = ? AND p.id != p2.id AND p2.is_active = 1
      ORDER BY o.created_at DESC
      LIMIT ?
    `;
    const [purchaseBased] = await db.pool.execute(purchaseQuery, [userId, Math.ceil(limit / 2)]);
    
    // 2. Based on user's viewed products
    const viewQuery = `
      SELECT DISTINCT p.*, al.score
      FROM analytics a
      JOIN products p ON a.event_data->>"$.product_id" = p.id
      JOIN (
        SELECT event_data->>"$.product_id" as product_id, 
               COUNT(*) as score
        FROM analytics 
        WHERE user_id = ? AND event_type = 'product_view'
        GROUP BY event_data->>"$.product_id"
        ORDER BY score DESC
        LIMIT ?
      ) al ON p.id = al.product_id
      WHERE p.is_active = 1 AND p.id NOT IN (${purchaseBased.map(p => p.id).join(',')})
      ORDER BY al.score DESC
      LIMIT ?
    `;
    const viewLimit = Math.floor(limit / 2);
    const [viewBased] = await db.pool.execute(viewQuery, [userId, viewLimit, viewLimit]);
    
    // Combine and deduplicate
    const allRecommendations = [...purchaseBased, ...viewBased];
    const uniqueRecommendations = [];
    const seenIds = new Set();
    
    for (const product of allRecommendations) {
      if (!seenIds.has(product.id)) {
        uniqueRecommendations.push(product);
        seenIds.add(product.id);
      }
    }
    
    // Limit to requested amount
    return uniqueRecommendations.slice(0, limit);
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    return [];
  }
};

module.exports = {
  searchProducts,
  createProduct,
  updateProduct,
  getTrendingProducts,
  getBestSellingProducts,
  getProductRecommendations
};
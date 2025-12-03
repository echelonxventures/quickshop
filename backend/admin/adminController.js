// adminController.js - Advanced admin management
const db = require('../db');

// Get all users
const getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      role = null, 
      status = null, 
      search = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (role) {
      whereClause += ' AND u.role = ?';
      params.push(role);
    }
    
    if (status === 'verified') {
      whereClause += ' AND u.is_verified = 1';
    } else if (status === 'unverified') {
      whereClause += ' AND u.is_verified = 0';
    }
    
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const query = `
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id AND payment_status = 'paid') as total_spent,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as total_reviews
      FROM users u
      ${whereClause}
      ORDER BY u.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [users] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      users: users.map(user => ({
        ...user,
        is_verified: user.is_verified === 1,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.last_login ? user.last_login.toISOString() : null,
        stats: {
          total_orders: user.total_orders || 0,
          total_spent: parseFloat(user.total_spent || 0),
          total_reviews: user.total_reviews || 0
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        role,
        status,
        search,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users', error: error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const userQuery = `
      SELECT 
        u.*,
        up.language,
        up.currency,
        up.timezone,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id AND payment_status = 'paid') as total_spent,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as total_reviews
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = ?
    `;
    
    const [users] = await db.pool.execute(userQuery, [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        is_verified: user.is_verified === 1,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.last_login ? user.last_login.toISOString() : null,
        stats: {
          total_orders: user.total_orders || 0,
          total_spent: parseFloat(user.total_spent || 0),
          total_reviews: user.total_reviews || 0
        },
        preferences: {
          language: user.language || 'en',
          currency: user.currency || 'USD',
          timezone: user.timezone || 'UTC'
        }
      },
      success: true
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching user', error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_verified, phone, avatar } = req.body;
    
    // Check if user exists
    const checkQuery = 'SELECT id FROM users WHERE id = ?';
    const [existing] = await db.pool.execute(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is being changed and if it's already taken
    if (email) {
      const emailCheckQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
      const [existingEmails] = await db.pool.execute(emailCheckQuery, [email, id]);
      
      if (existingEmails.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }
    
    const updateQuery = `
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          is_verified = COALESCE(?, is_verified),
          phone = COALESCE(?, phone),
          avatar = COALESCE(?, avatar),
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.pool.execute(updateQuery, [name, email, role, is_verified ? 1 : 0, phone, avatar, id]);
    
    res.status(200).json({
      message: 'User updated successfully',
      user_id: id,
      success: true
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user', error: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const checkQuery = 'SELECT id FROM users WHERE id = ?';
    const [existing] = await db.pool.execute(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user (soft delete or hard delete based on requirements)
    // For now, we'll soft delete by setting role to 'deleted'
    await db.pool.execute('UPDATE users SET role = "deleted", updated_at = NOW() WHERE id = ?', [id]);
    
    res.status(200).json({
      message: 'User deleted successfully',
      user_id: id,
      success: true
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user', error: error.message });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = null, 
      payment_status = null, 
      user_id = null,
      start_date = null,
      end_date = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    if (payment_status) {
      whereClause += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
    
    if (user_id) {
      whereClause += ' AND o.user_id = ?';
      params.push(user_id);
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
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [orders] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      orders: orders.map(order => ({
        ...order,
        item_count: order.item_count || 0,
        total_items: order.total_items || 0,
        created_at: order.created_at.toISOString(),
        updated_at: order.updated_at.toISOString(),
        shipped_at: order.shipped_at ? order.shipped_at.toISOString() : null,
        delivered_at: order.delivered_at ? order.delivered_at.toISOString() : null,
        cancelled_at: order.cancelled_at ? order.cancelled_at.toISOString() : null
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
        user_id,
        start_date,
        end_date,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error while fetching orders', error: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const orderQuery = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        sa.first_name as shipping_first_name,
        sa.last_name as shipping_last_name,
        sa.address_line_1 as shipping_address_1,
        sa.city as shipping_city,
        sa.state as shipping_state,
        sa.postal_code as shipping_postal_code,
        sa.country as shipping_country,
        ba.first_name as billing_first_name,
        ba.last_name as billing_last_name,
        ba.address_line_1 as billing_address_1,
        ba.city as billing_city,
        ba.state as billing_state,
        ba.postal_code as billing_postal_code,
        ba.country as billing_country
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN addresses sa ON o.shipping_address_id = sa.id
      LEFT JOIN addresses ba ON o.billing_address_id = ba.id
      WHERE o.id = ?
    `;
    
    const [orders] = await db.pool.execute(orderQuery, [id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*,
        p.name as product_name,
        p.images as product_images
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    
    const [items] = await db.pool.execute(itemsQuery, [id]);
    
    res.status(200).json({
      order: {
        ...order,
        customer: {
          name: order.customer_name,
          email: order.customer_email
        },
        shipping_address: {
          first_name: order.shipping_first_name,
          last_name: order.shipping_last_name,
          address_line_1: order.shipping_address_1,
          city: order.shipping_city,
          state: order.shipping_state,
          postal_code: order.shipping_postal_code,
          country: order.shipping_country
        },
        billing_address: {
          first_name: order.billing_first_name,
          last_name: order.billing_last_name,
          address_line_1: order.billing_address_1,
          city: order.billing_city,
          state: order.billing_state,
          postal_code: order.billing_postal_code,
          country: order.billing_country
        },
        items: items.map(item => ({
          ...item,
          product_images: item.product_images ? JSON.parse(item.product_images) : []
        })),
        created_at: order.created_at.toISOString(),
        updated_at: order.updated_at.toISOString(),
        shipped_at: order.shipped_at ? order.shipped_at.toISOString() : null,
        delivered_at: order.delivered_at ? order.delivered_at.toISOString() : null,
        cancelled_at: order.cancelled_at ? order.cancelled_at.toISOString() : null
      },
      success: true
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching order', error: error.message });
  }
};

// Update order
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, shipped_at, delivered_at, notes } = req.body;
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid order status' });
      }
    }
    
    // Check if order exists
    const checkQuery = 'SELECT id FROM orders WHERE id = ?';
    const [existing] = await db.pool.execute(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const updateFields = [];
    const updateParams = [];
    
    if (status) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }
    
    if (tracking_number) {
      updateFields.push('tracking_number = ?');
      updateParams.push(tracking_number);
    }
    
    if (shipped_at) {
      updateFields.push('shipped_at = ?');
      updateParams.push(shipped_at);
    }
    
    if (delivered_at) {
      updateFields.push('delivered_at = ?');
      updateParams.push(delivered_at);
    }
    
    if (notes) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
    }
    
    updateFields.push('updated_at = NOW()');
    updateParams.push(id);
    
    const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.pool.execute(updateQuery, updateParams);
    
    res.status(200).json({
      message: 'Order updated successfully',
      order_id: id,
      new_status: status,
      success: true
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Server error while updating order', error: error.message });
  }
};

// Get all products
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category_id = null, 
      brand_id = null, 
      status = null,
      search = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    if (brand_id) {
      whereClause += ' AND p.brand_id = ?';
      params.push(brand_id);
    }
    
    if (status === 'active') {
      whereClause += ' AND p.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = 0';
    }
    
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        u.name as seller_name,
        u.email as seller_email,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
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
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
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
        attributes: product.attributes ? JSON.parse(product.attributes) : {},
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
        category_id,
        brand_id,
        status,
        search,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error while fetching products', error: error.message });
  }
};

// Create product (admin only)
const createProduct = async (req, res) => {
  try {
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
      attributes,
      return_policy,
      warranty_info,
      shipping_info,
      seller_id // If admin is creating for a seller
    } = req.body;
    
    // Validate required fields
    if (!name || price === undefined || !category_id) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }
    
    // Check if category exists
    const categoryCheckQuery = 'SELECT id FROM categories WHERE id = ?';
    const [categories] = await db.pool.execute(categoryCheckQuery, [category_id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if brand exists
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
    
    // Determine product creator
    const createdBy = seller_id || req.user.userId; // Admin can assign to specific seller
    
    // Create product
    const productQuery = `
      INSERT INTO products (
        name, slug, description, short_description, sku, price, sale_price,
        category_id, brand_id, stock_quantity, reserved_quantity, sold_quantity,
        weight, dimensions, images, specifications, tags, meta_title, meta_description,
        is_active, is_featured, is_new, rating, review_count, views,
        created_by, created_at, updated_at, condition, free_shipping,
        attributes, return_policy, warranty_info, shipping_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?)
    `;
    
    const slug = generateSlug(name);
    
    const [result] = await db.pool.execute(productQuery, [
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
      createdBy,
      condition,
      free_shipping,
      JSON.stringify(attributes || {}),
      return_policy,
      warranty_info,
      shipping_info
    ]);
    
    const productId = result.insertId;
    
    // Update category product count
    await db.pool.execute('UPDATE categories SET product_count = product_count + 1 WHERE id = ?', [category_id]);
    
    res.status(201).json({
      message: 'Product created successfully',
      product_id: productId,
      success: true
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error while creating product', error: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
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
      return_policy,
      warranty_info,
      shipping_info,
      is_active,
      is_featured
    } = req.body;
    
    // Check if product exists
    const checkQuery = 'SELECT id, category_id FROM products WHERE id = ?';
    const [existing] = await db.pool.execute(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const oldCategory = existing[0].category_id;
    
    const updateFields = [];
    const updateParams = [];
    
    if (name) {
      updateFields.push('name = ?', 'slug = ?');
      updateParams.push(name, generateSlug(name));
    }
    if (description) { updateFields.push('description = ?'); updateParams.push(description); }
    if (short_description) { updateFields.push('short_description = ?'); updateParams.push(short_description); }
    if (price !== undefined) { updateFields.push('price = ?'); updateParams.push(parseFloat(price)); }
    if (sale_price !== undefined) { updateFields.push('sale_price = ?'); updateParams.push(parseFloat(sale_price)); }
    if (category_id) { updateFields.push('category_id = ?'); updateParams.push(category_id); }
    if (brand_id) { updateFields.push('brand_id = ?'); updateParams.push(brand_id); }
    if (stock_quantity !== undefined) { updateFields.push('stock_quantity = ?'); updateParams.push(parseInt(stock_quantity)); }
    if (sku) { updateFields.push('sku = ?'); updateParams.push(sku); }
    if (condition) { updateFields.push('condition = ?'); updateParams.push(condition); }
    if (free_shipping !== undefined) { updateFields.push('free_shipping = ?'); updateParams.push(free_shipping ? 1 : 0); }
    if (weight !== undefined) { updateFields.push('weight = ?'); updateParams.push(parseFloat(weight)); }
    if (dimensions) { updateFields.push('dimensions = ?'); updateParams.push(dimensions); }
    if (images) { updateFields.push('images = ?'); updateParams.push(JSON.stringify(images)); }
    if (specifications) { updateFields.push('specifications = ?'); updateParams.push(JSON.stringify(specifications)); }
    if (tags) { updateFields.push('tags = ?'); updateParams.push(JSON.stringify(tags)); }
    if (meta_title) { updateFields.push('meta_title = ?'); updateParams.push(meta_title); }
    if (meta_description) { updateFields.push('meta_description = ?'); updateParams.push(meta_description); }
    if (attributes) { updateFields.push('attributes = ?'); updateParams.push(JSON.stringify(attributes)); }
    if (return_policy) { updateFields.push('return_policy = ?'); updateParams.push(return_policy); }
    if (warranty_info) { updateFields.push('warranty_info = ?'); updateParams.push(warranty_info); }
    if (shipping_info) { updateFields.push('shipping_info = ?'); updateParams.push(shipping_info); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); updateParams.push(is_active ? 1 : 0); }
    if (is_featured !== undefined) { updateFields.push('is_featured = ?'); updateParams.push(is_featured ? 1 : 0); }
    
    updateFields.push('updated_at = NOW()');
    updateParams.push(id);
    
    const updateQuery = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.pool.execute(updateQuery, updateParams);
    
    // If category changed, update counts for both old and new categories
    if (category_id && category_id !== oldCategory) {
      await db.pool.execute('UPDATE categories SET product_count = product_count - 1 WHERE id = ?', [oldCategory]);
      await db.pool.execute('UPDATE categories SET product_count = product_count + 1 WHERE id = ?', [category_id]);
    }
    
    res.status(200).json({
      message: 'Product updated successfully',
      product_id: id,
      success: true
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error while updating product', error: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const checkQuery = 'SELECT id, category_id FROM products WHERE id = ?';
    const [existing] = await db.pool.execute(checkQuery, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const category_id = existing[0].category_id;
    
    // Delete product
    await db.pool.execute('DELETE FROM products WHERE id = ?', [id]);
    
    // Update category product count
    await db.pool.execute('UPDATE categories SET product_count = product_count - 1 WHERE id = ?', [category_id]);
    
    res.status(200).json({
      message: 'Product deleted successfully',
      product_id: id,
      success: true
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error while deleting product', error: error.message });
  }
};

// Get system analytics
const getAnalytics = async (req, res) => {
  try {
    const { start_date = '30 days ago', end_date = 'now' } = req.query;
    
    // Parse dates
    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);
    
    // Get core metrics
    const [
      salesData,
      customerData,
      productData,
      orderData
    ] = await Promise.all([
      getSalesForAnalytics(startDate, endDate),
      getCustomersForAnalytics(startDate, endDate),
      getProductsForAnalytics(startDate, endDate),
      getOrdersForAnalytics(startDate, endDate)
    ]);
    
    res.status(200).json({
      analytics: {
        sales: salesData,
        customers: customerData,
        products: productData,
        orders: orderData,
        calculated_at: new Date().toISOString()
      },
      meta: {
        start_date: startDate,
        end_date: endDate
      },
      success: true
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics', error: error.message });
  }
};

// Get system configuration
const getSystemConfig = async (req, res) => {
  try {
    const configQuery = 'SELECT * FROM system_config ORDER BY config_key';
    const [config] = await db.pool.execute(configQuery);
    
    res.status(200).json({
      config: config.map(item => ({
        ...item,
        is_public: item.is_public === 1
      })),
      success: true
    });
  } catch (error) {
    console.error('Get system config error:', error);
    res.status(500).json({ message: 'Server error while fetching system config', error: error.message });
  }
};

// Update system configuration
const updateSystemConfig = async (req, res) => {
  try {
    const updates = req.body; // Object with key-value pairs for config
    
    for (const [key, value] of Object.entries(updates)) {
      // Check if config exists
      const checkQuery = 'SELECT config_key FROM system_config WHERE config_key = ?';
      const [existing] = await db.pool.execute(checkQuery, [key]);
      
      if (existing.length > 0) {
        // Update existing config
        const updateQuery = 'UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?';
        await db.pool.execute(updateQuery, [value, key]);
      } else {
        // Insert new config
        const insertQuery = 'INSERT INTO system_config (config_key, config_value, updated_at) VALUES (?, ?, NOW())';
        await db.pool.execute(insertQuery, [key, value]);
      }
    }
    
    res.status(200).json({
      message: 'System configuration updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Update system config error:', error);
    res.status(500).json({ message: 'Server error while updating system config', error: error.message });
  }
};

// Get admin-specific analytics
const getAdminAnalytics = async (req, res) => {
  try {
    // This would include admin-specific insights like:
    // - Revenue trends
    // - Top performing products
    // - Customer acquisition
    // - Conversion rates
    // - Support tickets
    
    const revenueQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as daily_revenue,
        COUNT(*) as daily_orders
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND payment_status = 'paid'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const [revenueData] = await db.pool.execute(revenueQuery);
    
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE payment_status = 'paid'
    `;
    
    const [summary] = await db.pool.execute(summaryQuery);
    
    res.status(200).json({
      admin_analytics: {
        revenue_trends: revenueData,
        summary: summary[0],
        calculated_at: new Date().toISOString()
      },
      success: true
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching admin analytics', error: error.message });
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

// Helper function to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to parse date
const parseDate = (dateString) => {
  if (dateString === 'now') return new Date();
  if (dateString === '30 days ago') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (dateString === '7 days ago') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return new Date(dateString);
};

// Helper functions for analytics
const getSalesForAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      SUM(total_amount) as total_revenue,
      COUNT(*) as total_orders,
      AVG(total_amount) as average_order_value,
      SUM(shipping_cost) as total_shipping,
      SUM(tax_amount) as total_tax
    FROM orders
    WHERE created_at BETWEEN ? AND ?
      AND payment_status = 'paid'
  `;
  
  const [results] = await db.pool.execute(query, [startDate, endDate]);
  return results[0];
};

const getCustomersForAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(*) as total_customers,
      COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END) as new_customers,
      AVG(total_spent) as avg_customer_value
    FROM users
  `;
  
  const [results] = await db.pool.execute(query, [startDate, endDate]);
  return results[0];
};

const getProductsForAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(*) as total_products,
      COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END) as new_products,
      AVG(price) as average_price
    FROM products
  `;
  
  const [results] = await db.pool.execute(query, [startDate, endDate]);
  return results[0];
};

const getOrdersForAnalytics = async (startDate, endDate) => {
  const query = `
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
      AVG(total_amount) as average_order_value
    FROM orders
    WHERE created_at BETWEEN ? AND ?
  `;
  
  const [results] = await db.pool.execute(query, [startDate, endDate]);
  return results[0];
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getOrders,
  getOrderById,
  updateOrder,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAnalytics,
  getSystemConfig,
  updateSystemConfig,
  getAdminAnalytics
};
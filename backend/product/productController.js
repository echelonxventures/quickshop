// Product controller with advanced features
const db = require('../db');

// Get all products with advanced filtering, search, and pagination
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category = null,
      brand = null,
      min_price = null,
      max_price = null,
      rating = null,
      in_stock = null,
      on_sale = null,
      sort_by = 'created_at',
      sort_order = 'DESC',
      search = null,
      seller = null,
      condition = null,
      tags = null,
      attributes = null
    } = req.query;

    const offset = (page - 1) * limit;
    
    let baseQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        u.name as seller_name,
        u.id as seller_id,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved = 1) as review_count,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved = 1) as calculated_rating,
        (SELECT COUNT(*) FROM wishlist_items WHERE product_id = p.id) as wishlist_count,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_active = 1
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_active = 1
    `;
    
    const params = [];
    
    // Apply filters
    if (category) {
      baseQuery += ' AND (c.id = ? OR c.parent_id = ?)';
      countQuery += ' AND (c.id = ? OR c.parent_id = ?)';
      params.push(category, category);
    }
    
    if (brand) {
      baseQuery += ' AND b.id = ?';
      countQuery += ' AND b.id = ?';
      params.push(brand);
    }
    
    if (min_price) {
      baseQuery += ' AND p.price >= ?';
      countQuery += ' AND p.price >= ?';
      params.push(min_price);
    }
    
    if (max_price) {
      baseQuery += ' AND p.price <= ?';
      countQuery += ' AND p.price <= ?';
      params.push(max_price);
    }
    
    if (rating) {
      baseQuery += ' AND (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved = 1) >= ?';
      countQuery += ' AND (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved = 1) >= ?';
      params.push(rating);
    }
    
    if (in_stock === 'true') {
      baseQuery += ' AND (p.stock_quantity - p.reserved_quantity) > 0';
      countQuery += ' AND (p.stock_quantity - p.reserved_quantity) > 0';
    }
    
    if (on_sale === 'true') {
      baseQuery += ' AND p.sale_price IS NOT NULL AND p.sale_price < p.price';
      countQuery += ' AND p.sale_price IS NOT NULL AND p.sale_price < p.price';
    }
    
    if (search) {
      baseQuery += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, `%${searchParam}%`);
    }
    
    if (seller) {
      baseQuery += ' AND p.created_by = ?';
      countQuery += ' AND p.created_by = ?';
      params.push(seller);
    }
    
    if (condition) {
      baseQuery += ' AND p.condition = ?';
      countQuery += ' AND p.condition = ?';
      params.push(condition);
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      tagArray.forEach(() => {
        baseQuery += ' AND JSON_CONTAINS(p.tags, ?)';
        countQuery += ' AND JSON_CONTAINS(p.tags, ?)';
        params.push(`"${tag}"`);
      });
    }
    
    // Sorting
    const validSortFields = ['created_at', 'price', 'rating', 'name', 'sold_quantity', 'views'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortByField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortOrderValue = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';
    
    baseQuery += ` ORDER BY p.${sortByField} ${sortOrderValue} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute queries
    const [products] = await db.pool.execute(baseQuery, params);
    const [countResult] = await db.pool.execute(countQuery, params.slice(0, -2)); // Remove limit and offset params
    const total = countResult[0].total;
    
    // Process products for frontend
    const processedProducts = products.map(product => ({
      ...product,
      calculated_rating: parseFloat(product.calculated_rating || 0),
      review_count: product.review_count || 0,
      wishlist_count: product.wishlist_count || 0,
      available_stock: product.available_stock || 0,
      stock_status: product.available_stock > 10 ? 'in_stock' : product.available_stock > 0 ? 'low_stock' : 'out_of_stock',
      images: product.images ? JSON.parse(product.images) : [],
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      attributes: product.attributes ? JSON.parse(product.attributes) : {},
      tags: product.tags ? JSON.parse(product.tags) : [],
      price: parseFloat(product.price),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
      created_at: product.created_at.toISOString(),
      updated_at: product.updated_at.toISOString()
    }));
    
    res.status(200).json({
      products: processedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        category,
        brand,
        min_price,
        max_price,
        rating,
        in_stock,
        on_sale,
        search,
        seller,
        condition
      },
      success: true
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching products', 
      error: error.message 
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId; // Optional - for tracking views
    
    // Get product with related information
    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        c.description as category_description,
        b.name as brand_name,
        b.description as brand_description,
        u.name as seller_name,
        u.email as seller_email,
        u.id as seller_id,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as calculated_rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as review_count,
        (SELECT COUNT(*) FROM wishlist_items WHERE product_id = p.id) as wishlist_count,
        (SELECT COUNT(*) FROM cart_items WHERE product_id = p.id) as cart_count,
        (SELECT COUNT(*) FROM product_questions WHERE product_id = p.id AND is_approved = 1) as question_count,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.is_active = 1
    `;
    
    const [products] = await db.pool.execute(productQuery, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    
    // Get product images
    const imagesQuery = 'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC';
    const [productImages] = await db.pool.execute(imagesQuery, [id]);
    
    // Get product specifications
    const specsQuery = 'SELECT * FROM product_specifications WHERE product_id = ? ORDER BY sort_order ASC';
    const [productSpecs] = await db.pool.execute(specsQuery, [id]);
    
    // Get product variants
    const variantsQuery = `
      SELECT * FROM product_variants 
      WHERE product_id = ? AND is_active = 1
      ORDER BY price ASC
    `;
    const [productVariants] = await db.pool.execute(variantsQuery, [id]);
    
    // Get related products
    const relatedQuery = `
      SELECT p.*, 
             (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating
      FROM products p
      WHERE p.category_id = ? 
        AND p.id != ?
        AND p.is_active = 1
        AND (p.stock_quantity - p.reserved_quantity) > 0
      ORDER BY p.view_count DESC
      LIMIT 4
    `;
    const [relatedProducts] = await db.pool.execute(relatedQuery, [product.category_id, id]);
    
    // Get product reviews
    const reviewsQuery = `
      SELECT r.*, u.name as customer_name, u.avatar as customer_avatar
      FROM product_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? AND r.is_approved = 1
      ORDER BY r.created_at DESC
      LIMIT 10
    `;
    const [productReviews] = await db.pool.execute(reviewsQuery, [id]);
    
    // Update product view count
    if (userId) {
      await db.pool.execute('UPDATE products SET views = views + 1 WHERE id = ?', [id]);
    }
    
    res.status(200).json({
      product: {
        ...product,
        calculated_rating: parseFloat(product.calculated_rating || 0),
        review_count: product.review_count || 0,
        wishlist_count: product.wishlist_count || 0,
        cart_count: product.cart_count || 0,
        question_count: product.question_count || 0,
        available_stock: product.available_stock || 0,
        stock_status: product.available_stock > 10 ? 'in_stock' : product.available_stock > 0 ? 'low_stock' : 'out_of_stock',
        images: productImages,
        specifications: productSpecs,
        variants: productVariants,
        related_products: relatedProducts.map(p => ({
          ...p,
          rating: parseFloat(p.rating || 0)
        })),
        reviews: productReviews.map(review => ({
          ...review,
          created_at: review.created_at.toISOString()
        })),
        specifications: product.specifications ? JSON.parse(product.specifications) : {},
        attributes: product.attributes ? JSON.parse(product.attributes) : {},
        tags: product.tags ? JSON.parse(product.tags) : [],
        price: parseFloat(product.price),
        sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
        created_at: product.created_at.toISOString(),
        updated_at: product.updated_at.toISOString()
      },
      success: true
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error while fetching product', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById
};
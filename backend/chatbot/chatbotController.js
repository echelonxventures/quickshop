// Chatbot controller with advanced NLP and AI features
const { Configuration, OpenAIApi } = require('openai');
const db = require('../db');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Advanced chatbot with NLP, context awareness, and product integration
const processChatbotMessage = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const { message, session_id, context = 'general' } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // Get conversation context
    const sessionId = session_id || `anon_${Date.now()}`;
    
    // Check for existing conversation
    let conversationQuery = `
      SELECT id FROM chatbot_conversations 
      WHERE session_id = ? 
      ${userId ? 'OR user_id = ?' : ''}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [conversations] = await db.pool.execute(conversationQuery, [sessionId, userId]);
    
    let conversationId;
    if (conversations.length > 0) {
      conversationId = conversations[0].id;
    } else {
      // Create new conversation
      const createConvQuery = `
        INSERT INTO chatbot_conversations (session_id, user_id, context, created_at, updated_at) 
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      const [convResult] = await db.pool.execute(createConvQuery, [sessionId, userId, context]);
      conversationId = convResult.insertId;
    }
    
    // Save user message
    await db.pool.execute(`
      INSERT INTO chatbot_messages (conversation_id, user_id, message, sender_type, created_at) 
      VALUES (?, ?, ?, 'user', NOW())
    `, [conversationId, userId, message]);
    
    // Get recent conversation history for context
    const historyQuery = `
      SELECT message, sender_type 
      FROM chatbot_messages 
      WHERE conversation_id = ?
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const [history] = await db.pool.execute(historyQuery, [conversationId]);
    const conversationContext = history.map(msg => `${msg.sender_type}: ${msg.message}`).join('\n');
    
    // Check for product-related queries
    const isProductQuery = await detectProductQuery(message);
    let aiResponse;
    
    if (isProductQuery) {
      // Get product information if it's a product query
      const productInfo = await getRelatedProductInfo(message);
      if (productInfo) {
        aiResponse = await generateProductSpecificResponse(message, productInfo, history);
      }
    }
    
    if (!aiResponse) {
      // Use AI for general response
      const aiQuery = `You are QuickShop's friendly AI assistant. Recent conversation:\n${conversationContext}\n\nUser: "${message}"\n\nAssistant:`;
      
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are QuickShop E-commerce AI assistant. Be helpful, friendly, and professional. Provide accurate information about products, orders, and policies. If user asks about specific products, suggest they use the search feature. For technical issues, recommend contacting support.' 
          },
          { 
            role: 'user', 
            content: message 
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });
      
      aiResponse = completion.data.choices[0].message.content.trim();
    }
    
    // Save AI response
    await db.pool.execute(`
      INSERT INTO chatbot_messages (conversation_id, user_id, message, sender_type, created_at) 
      VALUES (?, ?, ?, 'bot', NOW())
    `, [conversationId, userId, aiResponse]);
    
    res.status(200).json({
      response: aiResponse,
      session_id: sessionId,
      conversation_id: conversationId,
      context: context,
      timestamp: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ 
      message: 'Server error while processing chatbot message', 
      error: error.message 
    });
  }
};

// Detect if message is related to products
const detectProductQuery = async (message) => {
  const productKeywords = [
    'product', 'item', 'buy', 'purchase', 'order', 'price', 'cost', 'available', 
    'in stock', 'shipping', 'delivery', 'return', 'size', 'color', 'brand',
    'category', 'search', 'find', 'recommend', 'suggest', 'show me', 'want'
  ];
  
  const lowerMessage = message.toLowerCase();
  return productKeywords.some(keyword => lowerMessage.includes(keyword));
};

// Get related product information
const getRelatedProductInfo = async (message) => {
  try {
    // Extract keywords from message
    const keywords = message.toLowerCase()
      .replace(/[^\w\s]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    if (keywords.length === 0) return null;
    
    // Find products matching keywords
    const keywordMatches = keywords.map(k => `%${k}%`).join('%');
    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.is_active = 1
        AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR c.name LIKE ? OR b.name LIKE ?)
      ORDER BY p.views DESC
      LIMIT 3
    `;
    
    const [products] = await db.pool.execute(productQuery, [
      keywordMatches, keywordMatches, keywordMatches, keywordMatches, keywordMatches
    ]);
    
    return products.length > 0 ? products : null;
  } catch (error) {
    console.error('Product info error:', error);
    return null;
  }
};

// Generate product-specific response
const generateProductSpecificResponse = async (message, products, history) => {
  if (products.length === 0) {
    return "I couldn't find any products matching your description. Try using our search feature to find what you're looking for.";
  }
  
  const productList = products.map(p => 
    `- ${p.name}: $${p.price} (Rating: ${p.rating || 'N/A'}/5)`
  ).join('\n');
  
  return `I found ${products.length} product${products.length > 1 ? 's' : ''} matching your query:\n\n${productList}\n\nVisit our website to view full details and make a purchase!`;
};

// Get conversation history
const getConversationHistory = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { session_id, limit = 50 } = req.query;
    
    let whereClause;
    let params;
    
    if (session_id) {
      whereClause = 'WHERE cm.session_id = ?';
      params = [session_id];
    } else if (userId) {
      whereClause = 'WHERE cm.conversation_id IN (SELECT id FROM chatbot_conversations WHERE user_id = ?)';
      params = [userId];
    } else {
      return res.status(400).json({ message: 'Either session_id or userId required' });
    }
    
    const historyQuery = `
      SELECT cm.*, u.name as user_name
      FROM chatbot_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT ?
    `;
    
    const [messages] = await db.pool.execute(historyQuery, [...params, parseInt(limit)]);
    
    res.status(200).json({
      messages: messages.map(msg => ({
        ...msg,
        created_at: msg.created_at.toISOString()
      })),
      success: true
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching conversation history', 
      error: error.message 
    });
  }
};

// Get product recommendations using AI
const getProductRecommendations = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { context = 'homepage', product_id = null, category_id = null, limit = 5 } = req.query;
    
    let recommendations = [];
    
    if (userId) {
      // Get personalized recommendations based on user behavior
      recommendations = await getPersonalizedRecommendations(userId, context, product_id, category_id);
    } else {
      // Get generic recommendations based on popularity
      recommendations = await getPopularRecommendations(context, product_id, category_id);
    }
    
    // Limit results
    recommendations = recommendations.slice(0, parseInt(limit));
    
    res.status(200).json({
      recommendations: recommendations.map(product => ({
        ...product,
        price: parseFloat(product.price),
        sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
        rating: parseFloat(product.rating || 0),
        review_count: product.review_count || 0,
        available_stock: product.available_stock || 0,
        images: product.images ? JSON.parse(product.images) : []
      })),
      count: recommendations.length,
      context,
      success: true
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching recommendations', 
      error: error.message 
    });
  }
};

// Get personalized recommendations
const getPersonalizedRecommendations = async (userId, context, productId, categoryId) => {
  try {
    // Get user's purchase history
    const purchaseQuery = `
      SELECT p.* FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ? AND o.status = 'delivered'
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    const [purchases] = await db.pool.execute(purchaseQuery, [userId]);
    
    if (purchases.length > 0) {
      // Get similar products based on purchase history
      const purchaseIds = purchases.map(p => p.id);
      const similarQuery = `
        SELECT 
          p.*,
          (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating,
          (p.stock_quantity - p.reserved_quantity) as available_stock
        FROM products p
        WHERE p.category_id IN (SELECT DISTINCT category_id FROM products WHERE id IN (${purchaseIds.map(() => '?').join(',')}))
          AND p.id NOT IN (${purchaseIds.map(() => '?').join(',')})
          AND p.is_active = 1
          AND (p.stock_quantity - p.reserved_quantity) > 0
        ORDER BY p.views DESC
        LIMIT 10
      `;
      const [similarProducts] = await db.pool.execute(similarQuery, [...purchaseIds, ...purchaseIds]);
      return similarProducts;
    }
    
    // If no purchase history, fall back to popular products
    return getPopularRecommendations(context, productId, categoryId);
  } catch (error) {
    console.error('Personalized recs error:', error);
    return [];
  }
};

// Get popular recommendations
const getPopularRecommendations = async (context, productId, categoryId) => {
  try {
    let query = `
      SELECT 
        p.*,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as review_count,
        (p.stock_quantity - p.reserved_quantity) as available_stock
      FROM products p
      WHERE p.is_active = 1
        AND (p.stock_quantity - p.reserved_quantity) > 0
    `;
    
    const params = [];
    
    if (productId) {
      // Exclude the current product (for product page recommendations)
      query += ' AND p.id != ?';
      params.push(productId);
    }
    
    if (categoryId) {
      // Focus on same category (for category page recommendations)
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    
    query += ' ORDER BY p.views DESC, p.sold_quantity DESC LIMIT 10';
    
    const [products] = await db.pool.execute(query, params);
    return products;
  } catch (error) {
    console.error('Popular recs error:', error);
    return [];
  }
};

// Get AI-powered search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }
    
    // Get product suggestions
    const suggestionsQuery = `
      SELECT 
        p.name as suggestion,
        'product' as type,
        p.slug,
        p.price,
        p.images,
        (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = 1) as rating
      FROM products p
      WHERE p.name LIKE ? AND p.is_active = 1
        AND (p.stock_quantity - p.reserved_quantity) > 0
      UNION ALL
      SELECT 
        c.name as suggestion,
        'category' as type,
        c.slug,
        NULL as price,
        NULL as images,
        NULL as rating
      FROM categories c
      WHERE c.name LIKE ? AND c.is_active = 1
      ORDER BY suggestion ASC
      LIMIT ?
    `;
    
    const searchTerm = `%${q}%`;
    const [suggestions] = await db.pool.execute(suggestionsQuery, [searchTerm, searchTerm, parseInt(limit)]);
    
    res.status(200).json({
      suggestions: suggestions.map(suggestion => ({
        ...suggestion,
        price: suggestion.price ? parseFloat(suggestion.price) : null,
        rating: suggestion.rating ? parseFloat(suggestion.rating) : null,
        images: suggestion.images ? JSON.parse(suggestion.images) : null
      })),
      query: q,
      success: true
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching search suggestions', 
      error: error.message 
    });
  }
};

module.exports = {
  processChatbotMessage,
  getConversationHistory,
  getProductRecommendations,
  getSearchSuggestions
};
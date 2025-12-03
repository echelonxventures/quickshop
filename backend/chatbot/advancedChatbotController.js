const express = require('express');
const db = require('../db');
const { Configuration, OpenAIApi } = require('openai');

// Advanced AI/ML Chatbot Controller
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Advanced chat processing with context, sentiment, and intent recognition
const processAdvancedChat = async (req, res) => {
  try {
    const { message, session_id, user_id = null } = req.body;
    
    // Validate input
    if (!message || !session_id) {
      return res.status(400).json({ message: 'Message and session_id are required' });
    }
    
    // Get conversation context from database
    let conversation = await getConversation(session_id, user_id);
    
    // Analyze message for intent, entities, and sentiment
    const analysis = await analyzeMessage(message, conversation);
    
    // Generate response based on intent
    let response;
    if (analysis.intent.confidence > 0.7) {
      response = await generateIntentResponse(analysis, conversation);
    } else {
      response = await generateGeneralResponse(message, conversation);
    }
    
    // Save conversation to database
    await saveConversation(session_id, user_id, message, response, analysis);
    
    res.status(200).json({
      message: response,
      intent: analysis.intent,
      entities: analysis.entities,
      sentiment: analysis.sentiment,
      conversation_id: conversation.id,
      success: true
    });
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ message: 'Server error during chat processing', error: error.message });
  }
};

// Get or create conversation
const getConversation = async (session_id, user_id) => {
  // Try to get existing conversation
  const existingQuery = `
    SELECT * FROM chatbot_conversations 
    WHERE session_id = ? AND (? IS NULL OR user_id = ?)
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [existing] = await db.pool.execute(existingQuery, [session_id, user_id, user_id]);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create new conversation
  const insertQuery = `
    INSERT INTO chatbot_conversations (session_id, user_id) 
    VALUES (?, ?)
  `;
  const [result] = await db.pool.execute(insertQuery, [session_id, user_id]);
  
  return { id: result.insertId, session_id, user_id };
};

// Analyze message for intent, entities, and sentiment
const analyzeMessage = async (message, conversation) => {
  try {
    // Use OpenAI to analyze the message
    const analysisPrompt = `
      Analyze the following message and provide:
      1. Intent (product_inquiry, order_status, return_policy, complaint, greeting, goodbye, etc.)
      2. Entities (product names, order numbers, dates, etc.)
      3. Sentiment (positive, negative, neutral)
      4. Context keywords for follow-up
      5. Confidence score (0-1)
      
      Message: "${message}"
      
      Previous conversation context: "${conversation.history || 'No previous context'}"
      
      Respond in JSON format:
      {
        "intent": {"name": "intent_name", "confidence": 0.0},
        "entities": {"entity_type": "value", ...},
        "sentiment": "positive|negative|neutral",
        "keywords": ["keyword1", "keyword2"],
        "action_required": "follow_up|resolve|transfer_to_human"
      }
    `;
    
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are an advanced e-commerce chatbot assistant. Analyze messages accurately.' 
        },
        { 
          role: 'user', 
          content: analysisPrompt 
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });
    
    const analysisText = completion.data.choices[0].message.content.trim();
    
    // Parse JSON response (with error handling for malformed JSON)
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      // If JSON parsing fails, create basic analysis
      analysis = {
        intent: { name: 'general', confidence: 0.5 },
        entities: {},
        sentiment: 'neutral',
        keywords: message.toLowerCase().split(' ').slice(0, 3),
        action_required: 'follow_up'
      };
    }
    
    return analysis;
  } catch (error) {
    console.error('Message analysis error:', error);
    // Return basic analysis if AI analysis fails
    return {
      intent: { name: 'general', confidence: 0.5 },
      entities: {},
      sentiment: 'neutral',
      keywords: message.toLowerCase().split(' ').slice(0, 3),
      action_required: 'follow_up'
    };
  }
};

// Generate response based on intent
const generateIntentResponse = async (analysis, conversation) => {
  const intent = analysis.intent.name;
  
  switch (intent) {
    case 'greeting':
      return getGreetingResponse(analysis.sentiment);
      
    case 'product_inquiry':
      return await getProductInquiryResponse(analysis.entities);
      
    case 'order_status':
      return await getOrderStatusResponse(analysis.entities, conversation.user_id);
      
    case 'return_policy':
      return getReturnPolicyResponse();
      
    case 'complaint':
      return getComplaintResponse(analysis.sentiment);
      
    case 'goodbye':
      return getGoodbyeResponse();
      
    case 'payment_issue':
      return getPaymentIssueResponse();
      
    case 'shipping_inquiry':
      return getShippingInquiryResponse(analysis.entities);
      
    default:
      return await generateGeneralResponse(analysis.keywords.join(' '), conversation);
  }
};

// Generate general response using OpenAI
const generateGeneralResponse = async (message, conversation) => {
  try {
    const context = conversation.history ? 
      `Previous conversation: ${conversation.history}\n\n` : 
      '';
    
    const prompt = `
      ${context}
      Customer: "${message}"
      
      You are QuickShop's friendly AI assistant. Respond helpfully and professionally to the customer's message.
      Keep responses concise but informative. If applicable, suggest relevant products or actions.
      
      Response:
    `;
    
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `You are QuickShop's e-commerce assistant. Be friendly, helpful, and professional. 
          Focus on e-commerce related queries. If you can't help with something, suggest contacting human support.` 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    
    return completion.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('General response generation error:', error);
    return "I'm having trouble processing your request. Could you please rephrase or contact our support team?";
  }
};

// Intent-specific response functions
const getGreetingResponse = (sentiment) => {
  const greetings = {
    positive: "Hello! 😊 Thank you for reaching out. How can I assist you with your shopping today?",
    neutral: "Hi there! How can I help you today?",
    negative: "Hello! I hope I can make your day better. How can I assist you?"
  };
  
  return greetings[sentiment] || greetings.neutral;
};

const getProductInquiryResponse = async (entities) => {
  let productQuery = "SELECT * FROM products WHERE is_active = 1";
  let params = [];
  
  if (entities.product_name) {
    productQuery += " AND name LIKE ?";
    params.push(`%${entities.product_name}%`);
  } else if (entities.category) {
    productQuery += " AND category_id = (SELECT id FROM categories WHERE name = ?)";
    params.push(entities.category);
  }
  
  productQuery += " LIMIT 3";
  
  try {
    const [products] = await db.pool.execute(productQuery, params);
    
    if (products.length > 0) {
      const productList = products.map(p => 
        `• ${p.name} - $${p.price} (${p.rating}/5 stars)`
      ).join('\n');
      
      return `I found these products matching your request:\n${productList}\nWould you like more details about any of these?`;
    } else {
      return "I couldn't find products matching your request. Could you provide more specific details?";
    }
  } catch (error) {
    console.error('Product inquiry error:', error);
    return "I'm having trouble searching for products right now. Could you try again with different keywords?";
  }
};

const getOrderStatusResponse = async (entities, userId) => {
  if (!userId) {
    return "To check order status, you'll need to log in to your account. Would you like me to help you with the login process?";
  }
  
  let orderId = entities.order_id || entities.number;
  
  if (!orderId) {
    return "I can help you check your order status. Could you please provide your order number?";
  }
  
  try {
    const [orders] = await db.pool.execute(
      'SELECT * FROM orders WHERE order_number = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length > 0) {
      const order = orders[0];
      return `Order #${order.order_number} is currently ${order.status}. 
      Total: $${order.total_amount}. 
      ${order.tracking_number ? `Tracking: ${order.tracking_number}` : 'Tracking information not available yet.'}`;
    } else {
      return `I couldn't find order #${orderId}. Please double-check the order number or contact our support team.`;
    }
  } catch (error) {
    console.error('Order status error:', error);
    return "I'm having trouble accessing your order information. Please contact our support team for assistance.";
  }
};

const getReturnPolicyResponse = () => {
  return `Our return policy: You can return most items within 30 days of delivery for a full refund. 
  Items must be in original condition and packaging. Return shipping costs may apply. 
  For more details, visit our returns page or let me know if you'd like specific information.`;
};

const getComplaintResponse = (sentiment) => {
  const responses = {
    negative: "I'm sorry to hear about your experience. Let me connect you with our support team to resolve this issue.",
    neutral: "Thank you for bringing this to our attention. Let me see how I can help address your concern.",
    positive: "Thank you for your feedback. How can I assist in making your experience better?"
  };
  
  const baseResponse = responses[sentiment] || responses.neutral;
  
  // For high negative sentiment, suggest human support
  if (sentiment === 'negative') {
    return `${baseResponse} Would you like me to transfer you to a human representative?`;
  }
  
  return baseResponse;
};

const getGoodbyeResponse = () => {
  return "Thank you for chatting with us! If you need any more assistance, don't hesitate to reach out. Have a great day! 😊";
};

const getPaymentIssueResponse = () => {
  return `I understand you're having payment issues. Our support team can help you with payment processing and security. 
  Would you like me to transfer you to our payment support specialist?`;
};

const getShippingInquiryResponse = (entities) => {
  const orderNumber = entities.order_id || entities.number;
  
  if (orderNumber) {
    return `For order #${orderNumber}, shipping status is handled through our order tracking system. 
    I can help you check the current status if you're logged in to your account.`;
  }
  
  return `For shipping inquiries, I recommend checking our shipping information page or providing your order number 
  for specific tracking information.`;
};

// Save conversation to database
const saveConversation = async (session_id, user_id, user_message, bot_response, analysis) => {
  try {
    // Save the conversation message
    const messageQuery = `
      INSERT INTO chatbot_messages (
        conversation_id, sender, message, response, intent, entities, sentiment, created_at
      ) VALUES (
        (SELECT id FROM chatbot_conversations WHERE session_id = ? AND user_id = ?),
        'user', ?, ?, ?, ?, ?, NOW()
      )
    `;
    
    await db.pool.execute(messageQuery, [
      session_id,
      user_id,
      user_message,
      bot_response,
      analysis.intent.name,
      JSON.stringify(analysis.entities),
      analysis.sentiment
    ]);
    
    // Also save bot response as separate message
    const botMessageQuery = `
      INSERT INTO chatbot_messages (
        conversation_id, sender, message, intent, entities, sentiment, created_at
      ) VALUES (
        (SELECT id FROM chatbot_conversations WHERE session_id = ? AND user_id = ?),
        'bot', ?, ?, ?, ?, NOW()
      )
    `;
    
    await db.pool.execute(botMessageQuery, [
      session_id,
      user_id,
      bot_response,
      null, // No intent for bot response
      null, // No entities for bot response
      null  // No sentiment for bot response
    ]);
  } catch (error) {
    console.error('Error saving conversation:', error);
    // Don't throw error as it shouldn't affect the user experience
  }
};

// Get conversation history for context
const getConversationHistory = async (conversation_id, limit = 5) => {
  try {
    const query = `
      SELECT * FROM chatbot_messages 
      WHERE conversation_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const [messages] = await db.pool.execute(query, [conversation_id, limit]);
    
    // Format history for context
    return messages.map(msg => 
      `${msg.sender}: ${msg.message}`
    ).reverse().join('\n'); // Reverse to get chronological order
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return '';
  }
};

// Advanced product recommendations based on conversation
const getConversationRecommendations = async (conversation_id) => {
  try {
    // Get user's conversation history to suggest relevant products
    const history = await getConversationHistory(conversation_id);
    
    // Analyze conversation for product interests
    const analysisPrompt = `
      Based on this conversation history, identify potential product interests:
      
      ${history}
      
      Respond with an array of relevant product categories or specific product types.
    `;
    
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'Analyze conversation history to identify product interests.' 
        },
        { 
          role: 'user', 
          content: analysisPrompt 
        }
      ]
    });
    
    // Get relevant products based on interests
    const interests = completion.data.choices[0].message.content.trim();
    
    // Query database for related products
    const productQuery = `
      SELECT p.* FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE MATCH(p.name, p.description) AGAINST(? IN NATURAL LANGUAGE MODE)
      AND p.is_active = 1
      LIMIT 5
    `;
    
    const [products] = await db.pool.execute(productQuery, [interests]);
    
    return products;
  } catch (error) {
    console.error('Recommendation error:', error);
    return [];
  }
};

// Get conversation analytics
const getConversationAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (start_date) {
      whereClause += ' AND cm.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND cm.created_at <= ?';
      params.push(end_date);
    }
    
    if (user_id) {
      whereClause += ' AND cc.user_id = ?';
      params.push(user_id);
    }
    
    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT cc.session_id) as unique_sessions,
        AVG(cm.sentiment = 'positive') as positive_sentiment_rate,
        AVG(cm.sentiment = 'negative') as negative_sentiment_rate,
        AVG(cm.sentiment = 'neutral') as neutral_sentiment_rate,
        COUNT(CASE WHEN cm.intent = 'complaint' THEN 1 END) as complaints,
        COUNT(CASE WHEN cm.intent = 'order_status' THEN 1 END) as order_queries,
        COUNT(CASE WHEN cm.intent = 'product_inquiry' THEN 1 END) as product_inquiries,
        AVG(CHAR_LENGTH(cm.message)) as avg_message_length
      FROM chatbot_messages cm
      JOIN chatbot_conversations cc ON cm.conversation_id = cc.id
      ${whereClause}
    `;
    
    const [analytics] = await db.pool.execute(analyticsQuery, params);
    
    res.status(200).json({
      analytics: analytics[0],
      success: true
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics', error: error.message });
  }
};

// Transfer to human support when needed
const transferToHuman = async (req, res) => {
  try {
    const { session_id, user_id, reason } = req.body;
    
    // Create support ticket
    const ticketQuery = `
      INSERT INTO support_tickets (user_id, subject, message, priority, category, status)
      VALUES (?, ?, ?, 'medium', 'chatbot', 'open')
    `;
    
    await db.pool.execute(ticketQuery, [
      user_id,
      `Chatbot Transfer - ${reason}`,
      `Conversation transfer from chatbot. Session: ${session_id}`,
      user_id ? 'medium' : 'low' // Registered users get higher priority
    ]);
    
    res.status(200).json({
      message: 'Transferred to human support. A representative will assist you shortly.',
      ticket_created: true,
      success: true
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error during transfer', error: error.message });
  }
};

// Get frequently asked questions and their responses
const getFAQ = async (req, res) => {
  try {
    const faqQuery = `
      SELECT question, response, category, usage_count
      FROM chatbot_faqs
      WHERE is_active = 1
      ORDER BY usage_count DESC
      LIMIT 10
    `;
    
    const [faqs] = await db.pool.execute(faqQuery);
    
    res.status(200).json({
      faqs,
      success: true
    });
  } catch (error) {
    console.error('FAQ error:', error);
    res.status(500).json({ message: 'Server error while fetching FAQs', error: error.message });
  }
};

// Update FAQ or learn from conversation
const learnFromConversation = async (req, res) => {
  try {
    const { question, answer, category = 'general' } = req.body;
    const userId = req.user.userId;
    
    // Only allow admin users to update FAQs
    const userQuery = 'SELECT role FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0 || users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update FAQs' });
    }
    
    // Insert or update FAQ
    const faqQuery = `
      INSERT INTO chatbot_faqs (question, response, category, created_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        response = VALUES(response),
        category = VALUES(category),
        updated_at = NOW()
    `;
    
    await db.pool.execute(faqQuery, [question, answer, category, userId]);
    
    res.status(200).json({
      message: 'FAQ updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({ message: 'Server error during learning', error: error.message });
  }
};

module.exports = {
  processAdvancedChat,
  getConversationAnalytics,
  transferToHuman,
  getFAQ,
  learnFromConversation
};
const express = require('express');
const router = express.Router();
const {
  processChatMessage,
  getConversationHistory,
  createNewConversation,
  getAIRecommendations,
  handleIntent,
  trainModel
} = require('./advancedChatbotController');

// Process chat message
router.post('/message', processChatMessage);

// Get conversation history
router.get('/history/:conversationId', getConversationHistory);

// Start new conversation
router.post('/start', createNewConversation);

// Get AI product recommendations
router.get('/recommendations', getAIRecommendations);

// Handle specific intent
router.post('/intent', handleIntent);

// Train the chatbot model (admin only)
router.post('/train', trainModel);

module.exports = router;
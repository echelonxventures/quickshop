const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  closeTicket,
  getSupportAgents,
  assignTicket
} = require('./advancedSupportController');

// Create a new support ticket
router.post('/tickets', createTicket);

// Get all tickets for a user
router.get('/tickets', getTickets);

// Get ticket by ID
router.get('/tickets/:id', getTicketById);

// Update ticket status
router.put('/tickets/:id', updateTicket);

// Close ticket
router.put('/tickets/:id/close', closeTicket);

// Get support agents
router.get('/agents', getSupportAgents);

// Assign ticket to agent
router.put('/tickets/:id/assign', assignTicket);

module.exports = router;
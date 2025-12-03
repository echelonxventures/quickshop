const express = require('express');
const db = require('../db');

// Advanced support system with multi-channel support
const createSupportTicket = async (req, res) => {
  try {
    const { 
      subject, 
      message, 
      priority = 'medium', 
      category = 'general',
      attachments = [],
      order_id = null,
      product_id = null
    } = req.body;
    
    const userId = req.user ? req.user.userId : null;
    
    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority level' });
    }
    
    // Validate category
    const validCategories = [
      'technical', 'billing', 'account', 'product', 'order', 
      'shipping', 'return', 'security', 'general', 'feedback'
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Check if user has an existing open ticket
    if (userId) {
      const existingTicketQuery = `
        SELECT id FROM support_tickets 
        WHERE user_id = ? AND status = 'open' 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const [existingTickets] = await db.pool.execute(existingTicketQuery, [userId]);
      
      if (existingTickets.length > 0) {
        return res.status(409).json({ 
          message: 'You already have an open ticket. Please wait for a response before creating another one.',
          existing_ticket_id: existingTickets[0].id
        });
      }
    }
    
    // Create the ticket
    const ticketQuery = `
      INSERT INTO support_tickets (
        user_id, subject, message, priority, category, status, 
        created_at, updated_at, attachments, order_id, product_id
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)
    `;
    
    const [result] = await db.pool.execute(ticketQuery, [
      userId,
      subject,
      message,
      priority,
      category,
      'open',
      JSON.stringify(attachments),
      order_id,
      product_id
    ]);
    
    const ticketId = result.insertId;
    
    // Send notification to support team
    await sendSupportNotification(ticketId, subject, priority, userId);
    
    // For registered users, send confirmation email
    if (userId) {
      await sendTicketConfirmation(userId, ticketId, subject);
    }
    
    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket_id: ticketId,
      ticket_number: `TKT-${String(ticketId).padStart(6, '0')}`,
      priority,
      category,
      status: 'open',
      created_at: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ message: 'Server error while creating support ticket', error: error.message });
  }
};

// Get user's tickets
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 10, 
      status = null, 
      category = null, 
      priority = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE st.user_id = ?';
    let params = [userId];
    
    if (status) {
      whereClause += ' AND st.status = ?';
      params.push(status);
    }
    
    if (category) {
      whereClause += ' AND st.category = ?';
      params.push(category);
    }
    
    if (priority) {
      whereClause += ' AND st.priority = ?';
      params.push(priority);
    }
    
    const query = `
      SELECT 
        st.id as ticket_id,
        st.ticket_number,
        st.subject,
        st.message,
        st.priority,
        st.category,
        st.status,
        st.created_at,
        st.updated_at,
        st.assigned_to,
        st.resolved_at,
        u.name as assigned_agent_name,
        (SELECT COUNT(*) FROM support_replies WHERE ticket_id = st.id) as reply_count,
        (SELECT message FROM support_replies WHERE ticket_id = st.id ORDER BY created_at DESC LIMIT 1) as last_reply
      FROM support_tickets st
      LEFT JOIN users u ON st.assigned_to = u.id
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [tickets] = await db.pool.execute(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM support_tickets st 
      ${whereClause.replace('ORDER BY', 'AND')}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Format tickets
    const formattedTickets = tickets.map(ticket => ({
      ...ticket,
      ticket_number: ticket.ticket_number || `TKT-${String(ticket.ticket_id).padStart(6, '0')}`,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
      resolved_at: ticket.resolved_at ? ticket.resolved_at.toISOString() : null
    }));
    
    res.status(200).json({
      tickets: formattedTickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        status,
        category,
        priority,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ message: 'Server error while fetching tickets', error: error.message });
  }
};

// Get ticket details with replies
const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    
    // Get ticket with user info
    const ticketQuery = `
      SELECT 
        st.*,
        u.name as assigned_agent_name,
        u.email as assigned_agent_email,
        u.avatar as assigned_agent_avatar,
        (SELECT COUNT(*) FROM support_replies WHERE ticket_id = st.id) as reply_count
      FROM support_tickets st
      LEFT JOIN users u ON st.assigned_to = u.id
      WHERE st.id = ? AND st.user_id = ?
    `;
    
    const [tickets] = await db.pool.execute(ticketQuery, [ticketId, userId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found or does not belong to user' });
    }
    
    const ticket = tickets[0];
    
    // Get ticket replies
    const repliesQuery = `
      SELECT 
        sr.*,
        u.name as reply_author_name,
        u.avatar as reply_author_avatar,
        u.role as reply_author_role
      FROM support_replies sr
      LEFT JOIN users u ON sr.user_id = u.id
      WHERE sr.ticket_id = ?
      ORDER BY sr.created_at ASC
    `;
    
    const [replies] = await db.pool.execute(repliesQuery, [ticketId]);
    
    // Format the response
    const ticketDetails = {
      ...ticket,
      ticket_number: ticket.ticket_number || `TKT-${String(ticket.id).padStart(6, '0')}`,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
      resolved_at: ticket.resolved_at ? ticket.resolved_at.toISOString() : null,
      replies: replies.map(reply => ({
        ...reply,
        created_at: reply.created_at.toISOString(),
        is_internal: reply.is_internal || false
      })),
      attachments: ticket.attachments ? JSON.parse(ticket.attachments) : []
    };
    
    res.status(200).json({
      ticket: ticketDetails,
      success: true
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({ message: 'Server error while fetching ticket details', error: error.message });
  }
};

// Reply to support ticket
const replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, is_internal = false } = req.body;
    const userId = req.user.userId;
    
    // Validate input
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // Check if ticket belongs to user
    const ticketQuery = 'SELECT user_id, status FROM support_tickets WHERE id = ?';
    const [tickets] = await db.pool.execute(ticketQuery, [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
    // Only allow replies if ticket is not resolved or closed
    if (['resolved', 'closed'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Cannot reply to resolved or closed tickets' });
    }
    
    // Verify user has permission to reply (either user or assigned agent)
    const hasPermission = (
      ticket.user_id === userId || 
      req.user.role === 'admin' || 
      (req.user.role === 'support_agent' && ticket.assigned_to === userId)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Insert reply
    const replyQuery = `
      INSERT INTO support_replies (ticket_id, user_id, message, is_internal, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    await db.pool.execute(replyQuery, [ticketId, userId, message, is_internal]);
    
    // Update ticket timestamp
    await db.pool.execute(
      'UPDATE support_tickets SET updated_at = NOW() WHERE id = ?',
      [ticketId]
    );
    
    // If user replied, mark ticket as waiting for agent response
    if (ticket.user_id === userId && !is_internal) {
      await db.pool.execute(
        'UPDATE support_tickets SET status = "in_progress" WHERE id = ?',
        [ticketId]
      );
    }
    
    // Send notification to other party
    await sendReplyNotification(ticketId, userId, message, is_internal);
    
    res.status(200).json({
      message: 'Reply added successfully',
      success: true
    });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({ message: 'Server error while adding reply', error: error.message });
  }
};

// Advanced support agent functions
const getAgentTickets = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const agentRole = req.user.role;
    
    // Only allow support agents and admins
    if (!['admin', 'support_agent'].includes(agentRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { 
      page = 1, 
      limit = 10, 
      status = null, 
      category = null, 
      priority = null,
      assigned_to = null,
      sort_by = 'updated_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    // Agents can only see tickets assigned to them or unassigned
    if (agentRole === 'support_agent') {
      whereClause += ' AND (st.assigned_to = ? OR st.assigned_to IS NULL)';
      params.push(agentId);
    }
    
    if (status) {
      whereClause += ' AND st.status = ?';
      params.push(status);
    }
    
    if (category) {
      whereClause += ' AND st.category = ?';
      params.push(category);
    }
    
    if (priority) {
      whereClause += ' AND st.priority = ?';
      params.push(priority);
    }
    
    if (assigned_to !== undefined && assigned_to !== null) {
      if (assigned_to === 'unassigned') {
        whereClause += ' AND st.assigned_to IS NULL';
      } else {
        whereClause += ' AND st.assigned_to = ?';
        params.push(assigned_to);
      }
    }
    
    const query = `
      SELECT 
        st.*,
        u.name as customer_name,
        u.email as customer_email,
        ua.name as assigned_agent_name,
        (SELECT COUNT(*) FROM support_replies WHERE ticket_id = st.id) as reply_count,
        (SELECT sr.created_at FROM support_replies sr WHERE sr.ticket_id = st.id ORDER BY sr.created_at DESC LIMIT 1) as last_reply_at
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN users ua ON st.assigned_to = ua.id
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [tickets] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN users ua ON st.assigned_to = ua.id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Format tickets
    const formattedTickets = tickets.map(ticket => ({
      ...ticket,
      ticket_number: ticket.ticket_number || `TKT-${String(ticket.id).padStart(6, '0')}`,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
      last_reply_at: ticket.last_reply_at ? ticket.last_reply_at.toISOString() : null
    }));
    
    res.status(200).json({
      tickets: formattedTickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      success: true
    });
  } catch (error) {
    console.error('Get agent tickets error:', error);
    res.status(500).json({ message: 'Server error while fetching agent tickets', error: error.message });
  }
};

// Assign ticket to agent
const assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { agent_id } = req.body;
    const currentAgentId = req.user.userId;
    const currentAgentRole = req.user.role;
    
    // Only admins and team leads can assign tickets
    if (!['admin', 'support_agent'].includes(currentAgentRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Verify ticket exists
    const ticketQuery = 'SELECT * FROM support_tickets WHERE id = ?';
    const [tickets] = await db.pool.execute(ticketQuery, [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
    // Check if agent exists and is a support agent
    const agentQuery = 'SELECT role FROM users WHERE id = ?';
    const [agents] = await db.pool.execute(agentQuery, [agent_id]);
    
    if (agents.length === 0 || agents[0].role !== 'support_agent') {
      return res.status(400).json({ message: 'Invalid support agent' });
    }
    
    // Update ticket assignment
    const updateQuery = 'UPDATE support_tickets SET assigned_to = ?, updated_at = NOW() WHERE id = ?';
    await db.pool.execute(updateQuery, [agent_id, ticketId]);
    
    // Add assignment note
    const noteQuery = `
      INSERT INTO support_replies (ticket_id, user_id, message, is_internal, created_at)
      VALUES (?, ?, ?, 1, NOW())
    `;
    await db.pool.execute(noteQuery, [
      ticketId,
      currentAgentId,
      `Ticket assigned to agent: ${agent_id}`
    ]);
    
    // Send notification to assigned agent
    await sendAssignmentNotification(ticketId, agent_id, ticket.subject);
    
    res.status(200).json({
      message: 'Ticket assigned successfully',
      ticket_id: ticketId,
      assigned_to: agent_id,
      success: true
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ message: 'Server error while assigning ticket', error: error.message });
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, resolution_note = null } = req.body;
    const agentId = req.user.userId;
    const agentRole = req.user.role;
    
    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed', 'pending_customer'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check permissions
    if (!['admin', 'support_agent'].includes(agentRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get ticket to check permissions
    const ticketQuery = 'SELECT user_id, assigned_to, status FROM support_tickets WHERE id = ?';
    const [tickets] = await db.pool.execute(ticketQuery, [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
    // Check if agent can update this ticket
    const canUpdate = (
      agentRole === 'admin' ||
      agentId === ticket.assigned_to ||
      (agentRole === 'support_agent' && ticket.assigned_to === agentId)
    );
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this ticket' });
    }
    
    // Prepare update fields
    const updateFields = ['status = ?, updated_at = NOW()'];
    const updateParams = [status];
    
    // Set resolved_at if status is resolved
    if (status === 'resolved') {
      updateFields.push('resolved_at = NOW()');
      updateFields.push('resolution_note = ?');
      updateParams.push(resolution_note);
    } else if (['open', 'in_progress'].includes(status)) {
      // Clear resolved_at if reopening
      updateFields.push('resolved_at = NULL');
      updateFields.push('resolution_note = NULL');
    }
    
    const updateQuery = `
      UPDATE support_tickets 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;
    updateParams.push(ticketId);
    
    await db.pool.execute(updateQuery, updateParams);
    
    // Add status change note
    if (status !== ticket.status) {
      const noteQuery = `
        INSERT INTO support_replies (ticket_id, user_id, message, is_internal, created_at)
        VALUES (?, ?, ?, 1, NOW())
      `;
      await db.pool.execute(noteQuery, [
        ticketId,
        agentId,
        `Status changed from ${ticket.status} to ${status}`
      ]);
    }
    
    // Send notification to customer
    if (status === 'resolved') {
      await sendResolutionNotification(ticketId, ticket.user_id);
    }
    
    res.status(200).json({
      message: 'Ticket status updated successfully',
      ticket_id: ticketId,
      new_status: status,
      success: true
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ message: 'Server error while updating ticket status', error: error.message });
  }
};

// Get support statistics and analytics
const getSupportAnalytics = async (req, res) => {
  try {
    const { 
      start_date = '30 days ago', 
      end_date = 'now',
      group_by = 'day'
    } = req.query;
    
    // Parse dates
    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);
    
    // Get basic analytics
    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        AVG(DATEDIFF(resolved_at, created_at)) as avg_resolution_time_days,
        COUNT(DISTINCT user_id) as unique_customers,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets
      FROM support_tickets
      WHERE created_at BETWEEN ? AND ?
    `;
    
    const [analytics] = await db.pool.execute(analyticsQuery, [startDate, endDate]);
    
    // Get tickets over time
    const timeQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM support_tickets
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const [timeData] = await db.pool.execute(timeQuery, [startDate, endDate]);
    
    // Get category breakdown
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        AVG(DATEDIFF(resolved_at, created_at)) as avg_resolution_days
      FROM support_tickets
      WHERE created_at BETWEEN ? AND ? AND resolved_at IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
    
    const [categoryData] = await db.pool.execute(categoryQuery, [startDate, endDate]);
    
    // Get agent performance (for admin access)
    let agentData = [];
    if (req.user.role === 'admin') {
      const agentQuery = `
        SELECT 
          u.name as agent_name,
          COUNT(st.id) as tickets_handled,
          COUNT(CASE WHEN st.status = 'resolved' THEN 1 END) as tickets_resolved,
          AVG(DATEDIFF(st.resolved_at, st.created_at)) as avg_resolution_time,
          AVG(sr.rating) as avg_rating
        FROM support_tickets st
        LEFT JOIN users u ON st.assigned_to = u.id
        LEFT JOIN (
          SELECT ticket_id, rating FROM ticket_ratings WHERE created_at BETWEEN ? AND ?
        ) sr ON st.id = sr.ticket_id
        WHERE st.created_at BETWEEN ? AND ? AND st.assigned_to IS NOT NULL
        GROUP BY u.id
        ORDER BY tickets_handled DESC
      `;
      
      const [agents] = await db.pool.execute(agentQuery, [startDate, endDate, startDate, endDate]);
      agentData = agents;
    }
    
    res.status(200).json({
      analytics: analytics[0],
      time_data: timeData,
      category_breakdown: categoryData,
      agent_performance: agentData,
      meta: {
        start_date: startDate,
        end_date: endDate,
        group_by
      },
      success: true
    });
  } catch (error) {
    console.error('Support analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics', error: error.message });
  }
};

// Send support notification to team
const sendSupportNotification = async (ticketId, subject, priority, userId) => {
  // In a real implementation, this would send email/Slack notifications to support team
  console.log(`New support ticket: #${ticketId} - ${subject} (Priority: ${priority})`);
  
  // This could integrate with:
  // - Email service (SendGrid, AWS SES)
  // - Slack/Teams webhook
  // - Internal support system
  // - Push notifications
};

// Send ticket confirmation to user
const sendTicketConfirmation = async (userId, ticketId, subject) => {
  // In a real implementation, send email confirmation to user
  console.log(`Ticket confirmation sent to user ${userId} for ticket ${ticketId}`);
};

// Send reply notification
const sendReplyNotification = async (ticketId, userId, message, isInternal) => {
  if (isInternal) return; // Internal notes don't notify customers
  
  // Get ticket info
  const ticketQuery = `
    SELECT st.*, u.email as customer_email 
    FROM support_tickets st 
    JOIN users u ON st.user_id = u.id 
    WHERE st.id = ?
  `;
  const [tickets] = await db.pool.execute(ticketQuery, [ticketId]);
  
  if (tickets.length > 0) {
    // Send notification to customer
    console.log(`Reply notification sent to customer for ticket ${ticketId}`);
  }
};

// Send assignment notification
const sendAssignmentNotification = async (ticketId, agentId, subject) => {
  // Get agent email
  const agentQuery = 'SELECT email FROM users WHERE id = ?';
  const [agents] = await db.pool.execute(agentQuery, [agentId]);
  
  if (agents.length > 0) {
    // Send assignment notification to agent
    console.log(`Assignment notification sent to agent ${agentId} for ticket ${ticketId}`);
  }
};

// Send resolution notification
const sendResolutionNotification = async (ticketId, userId) => {
  if (!userId) return;
  
  // Get customer info
  const customerQuery = 'SELECT email FROM users WHERE id = ?';
  const [customers] = await db.pool.execute(customerQuery, [userId]);
  
  if (customers.length > 0) {
    // Send resolution notification to customer
    console.log(`Resolution notification sent to customer ${userId} for ticket ${ticketId}`);
  }
};

// Parse date strings
const parseDate = (dateString) => {
  if (dateString === 'now') return new Date();
  if (dateString === '30 days ago') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (dateString === '7 days ago') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return new Date(dateString);
};

// Create ticket rating
const rateTicketResolution = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, feedback = null } = req.body;
    const userId = req.user.userId;
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if user can rate this ticket
    const ticketQuery = `
      SELECT user_id, status 
      FROM support_tickets 
      WHERE id = ? AND user_id = ? AND status = 'resolved'
    `;
    const [tickets] = await db.pool.execute(ticketQuery, [ticketId, userId]);
    
    if (tickets.length === 0) {
      return res.status(400).json({ message: 'Cannot rate this ticket' });
    }
    
    // Insert rating
    const ratingQuery = `
      INSERT INTO ticket_ratings (ticket_id, user_id, rating, feedback, created_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        rating = VALUES(rating), 
        feedback = VALUES(feedback), 
        updated_at = NOW()
    `;
    
    await db.pool.execute(ratingQuery, [ticketId, userId, rating, feedback]);
    
    res.status(200).json({
      message: 'Ticket rated successfully',
      success: true
    });
  } catch (error) {
    console.error('Rate ticket error:', error);
    res.status(500).json({ message: 'Server error while rating ticket', error: error.message });
  }
};

// Get agent dashboard
const getAgentDashboard = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const agentRole = req.user.role;
    
    // Only allow support agents and admins
    if (!['admin', 'support_agent'].includes(agentRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get agent's stats
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        AVG(CASE WHEN status = 'resolved' THEN DATEDIFF(resolved_at, created_at) END) as avg_resolution_time,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_this_week
      FROM support_tickets
      WHERE assigned_to = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)
    `;
    
    const [agentStats] = await db.pool.execute(statsQuery, [agentId]);
    
    // Get priority tickets
    const priorityQuery = `
      SELECT id, subject, priority, created_at, user_id
      FROM support_tickets
      WHERE assigned_to = ? 
        AND priority IN ('high', 'urgent')
        AND status != 'resolved'
      ORDER BY created_at ASC
      LIMIT 10
    `;
    
    const [priorityTickets] = await db.pool.execute(priorityQuery, [agentId]);
    
    res.status(200).json({
      dashboard: {
        stats: agentStats[0],
        priority_tickets: priorityTickets.map(ticket => ({
          ...ticket,
          created_at: ticket.created_at.toISOString()
        })),
        agent_id: agentId
      },
      success: true
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard', error: error.message });
  }
};

// Auto-close resolved tickets after inactivity
const autoCloseTickets = async () => {
  try {
    // Close tickets that have been resolved for more than 7 days with no customer response
    const updateQuery = `
      UPDATE support_tickets 
      SET status = 'closed', updated_at = NOW()
      WHERE status = 'resolved' 
        AND updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    
    const [result] = await db.pool.execute(updateQuery);
    
    console.log(`Auto-closed ${result.affectedRows} tickets`);
  } catch (error) {
    console.error('Auto-close tickets error:', error);
  }
};

// Schedule auto-close job (in production, use a proper job scheduler)
setInterval(autoCloseTickets, 24 * 60 * 60 * 1000); // Run daily

module.exports = {
  createSupportTicket,
  getUserTickets,
  getTicketDetails,
  replyToTicket,
  getAgentTickets,
  assignTicket,
  updateTicketStatus,
  getSupportAnalytics,
  rateTicketResolution,
  getAgentDashboard
};
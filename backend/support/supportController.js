// Advanced Support System Controller
const db = require('../db');

// Create support ticket with advanced features
const createSupportTicket = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      subject, 
      message, 
      priority = 'medium', 
      category = 'general', 
      department = 'support',
      attachments = [],
      related_order_id = null,
      related_product_id = null,
      severity_level = 'low',
      expected_resolution_time = '7 days',
      tags = [],
      custom_fields = {}
    } = req.body;
    
    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriority.includes(priority)) {
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
    
    // Validate department
    const validDepartments = ['support', 'sales', 'technical', 'billing', 'compliance', 'customer_success'];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({ message: 'Invalid department' });
    }
    
    // Sanitize and validate custom fields
    const sanitizedCustomFields = validateCustomFields(custom_fields);
    
    // Generate unique ticket number
    const ticketNumber = generateTicketNumber();
    
    // Check for related entities
    if (related_order_id) {
      const orderCheckQuery = 'SELECT id FROM orders WHERE id = ? AND user_id = ?';
      const [orders] = await db.pool.execute(orderCheckQuery, [related_order_id, userId]);
      
      if (orders.length === 0) {
        return res.status(404).json({ message: 'Related order not found or does not belong to user' });
      }
    }
    
    if (related_product_id) {
      const productCheckQuery = 'SELECT id FROM products WHERE id = ?';
      const [products] = await db.pool.execute(productCheckQuery, [related_product_id]);
      
      if (products.length === 0) {
        return res.status(404).json({ message: 'Related product not found' });
      }
    }
    
    // Create ticket
    const ticketQuery = `
      INSERT INTO support_tickets (
        ticket_number, user_id, subject, message, priority, category, department,
        status, severity_level, expected_resolution_time, attachments, related_order_id, 
        related_product_id, tags, custom_fields, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await db.pool.execute(ticketQuery, [
      ticketNumber,
      userId,
      subject,
      message,
      priority,
      category,
      department,
      severity_level,
      expected_resolution_time,
      JSON.stringify(attachments),
      related_order_id,
      related_product_id,
      JSON.stringify(tags),
      JSON.stringify(sanitizedCustomFields),
      userId
    ]);
    
    const ticketId = result.insertId;
    
    // Add initial system note
    await addTicketNote(ticketId, 'SYSTEM', 'Ticket created by customer', userId);
    
    // Send notification to support team
    await sendSupportNotification(ticketId, subject, priority, userId);
    
    // If high priority, escalate immediately
    if (priority === 'urgent') {
      await escalateTicket(ticketId);
    }
    
    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket_id: ticketId,
      ticket_number: ticketNumber,
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
      department = null,
      sort_by = 'created_at',
      sort_order = 'DESC',
      search = null
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
    
    if (department) {
      whereClause += ' AND st.department = ?';
      params.push(department);
    }
    
    if (search) {
      whereClause += ' AND (st.subject LIKE ? OR st.message LIKE ? OR st.ticket_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const baseQuery = `
      SELECT 
        st.*,
        u.name as customer_name,
        (SELECT COUNT(*) FROM support_replies WHERE ticket_id = st.id) as reply_count,
        (SELECT created_at FROM support_replies WHERE ticket_id = st.id ORDER BY created_at DESC LIMIT 1) as last_reply_date,
        (SELECT u.name FROM support_replies sr JOIN users u ON sr.user_id = u.id WHERE sr.ticket_id = st.id ORDER BY sr.created_at DESC LIMIT 1) as last_replier
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
    `;
    
    const query = `${baseQuery} ${whereClause} ORDER BY st.${sort_by} ${sort_order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [tickets] = await db.pool.execute(query, params);
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM support_tickets st ${whereClause.replace('ORDER BY', 'AND')}`;
    const countParams = params.slice(0, -2); // Remove limit and offset params
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      tickets: tickets.map(ticket => ({
        ...ticket,
        created_at: ticket.created_at.toISOString(),
        updated_at: ticket.updated_at.toISOString(),
        last_reply_at: ticket.last_reply_at ? ticket.last_reply_at.toISOString() : null,
        reply_count: ticket.reply_count || 0,
        priority: ticket.priority,
        status: ticket.status,
        category: ticket.category
      })),
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
        department,
        search,
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

// Get ticket by ID with full thread
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if ticket belongs to user or user is support agent
    const ticketQuery = `
      SELECT 
        st.*,
        u.name as customer_name,
        u.email as customer_email,
        (SELECT name FROM users WHERE id = st.assigned_to) as assigned_agent_name,
        (SELECT email FROM users WHERE id = st.assigned_to) as assigned_agent_email
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      WHERE st.id = ? AND (st.user_id = ? OR EXISTS(SELECT 1 FROM users ur WHERE ur.id = ? AND ur.role IN ('admin', 'support_agent')))
    `;
    
    const [tickets] = await db.pool.execute(ticketQuery, [id, userId, userId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found or access denied' });
    }
    
    const ticket = tickets[0];
    
    // Get ticket replies
    const repliesQuery = `
      SELECT 
        sr.*,
        u.name as author_name,
        u.email as author_email,
        u.avatar as author_avatar,
        u.role as author_role
      FROM support_replies sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.ticket_id = ?
      ORDER BY sr.created_at ASC
    `;
    
    const [replies] = await db.pool.execute(repliesQuery, [id]);
    
    // Get ticket history (status changes, assignments, etc.)
    const historyQuery = `
      SELECT 
        th.*,
        u.name as changed_by_name
      FROM ticket_history th
      LEFT JOIN users u ON th.changed_by = u.id
      WHERE th.ticket_id = ?
      ORDER BY th.created_at DESC
    `;
    
    const [history] = await db.pool.execute(historyQuery, [id]);
    
    res.status(200).json({
      ticket: {
        ...ticket,
        created_at: ticket.created_at.toISOString(),
        updated_at: ticket.updated_at.toISOString(),
        assigned_at: ticket.assigned_at ? ticket.assigned_at.toISOString() : null,
        resolved_at: ticket.resolved_at ? ticket.resolved_at.toISOString() : null,
        closed_at: ticket.closed_at ? ticket.closed_at.toISOString() : null,
        last_updated_at: ticket.last_updated_at ? ticket.last_updated_at.toISOString() : null,
        attachments: ticket.attachments ? JSON.parse(ticket.attachments) : [],
        tags: ticket.tags ? JSON.parse(ticket.tags) : [],
        custom_fields: ticket.custom_fields ? JSON.parse(ticket.custom_fields) : {},
        priority: ticket.priority,
        status: ticket.status,
        category: ticket.category,
        department: ticket.department
      },
      replies: replies.map(reply => ({
        ...reply,
        created_at: reply.created_at.toISOString(),
        is_internal: reply.is_internal === 1,
        author_role: reply.author_role,
        reply_type: reply.type || 'message'
      })),
      history: history.map(record => ({
        ...record,
        created_at: record.created_at.toISOString()
      })),
      success: true
    });
  } catch (error) {
    console.error('Get ticket by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching ticket', error: error.message });
  }
};

// Reply to ticket
const replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { message, is_internal = false, reply_type = 'reply', attachments = [] } = req.body;
    const userRole = req.user.role;
    
    if (!message) {
      return res.status(400).json({ message: 'Reply message is required' });
    }
    
    // Get ticket to verify access and current status
    const ticketQuery = `
      SELECT st.*, u.role as customer_role, 
             (SELECT name FROM users WHERE id = st.assigned_to) as assigned_agent_name
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      WHERE st.id = ?
    `;
    const [tickets] = await db.pool.execute(ticketQuery, [id]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
    // Check permissions
    const hasPermission = (
      userRole === 'admin' ||
      userRole === 'support_agent' ||
      ticket.user_id === userId
    );
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if ticket can be replied to
    if (['closed', 'resolved'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Cannot reply to a closed/resolved ticket. Please reopen if needed.' });
    }
    
    // Insert reply
    const replyQuery = `
      INSERT INTO support_replies (
        ticket_id, user_id, message, is_internal, type, attachments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    await db.pool.execute(replyQuery, [
      id,
      userId,
      message,
      is_internal ? 1 : 0,
      reply_type,
      JSON.stringify(attachments)
    ]);
    
    // Update ticket last reply time
    await db.pool.execute('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [id]);
    
    // If customer replied to an open ticket, move to "in progress"
    if (ticket.user_id === userId && ticket.status === 'open' && !is_internal) {
      await db.pool.execute('UPDATE support_tickets SET status = "in_progress", updated_at = NOW() WHERE id = ?', [id]);
      ticket.status = 'in_progress'; // Update for notification
    }
    
    // Send reply notification
    await sendReplyNotification(id, userId, message, ticket, is_internal);
    
    res.status(200).json({
      message: 'Reply added successfully',
      ticket_id: id,
      reply_type,
      is_internal,
      success: true
    });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({ message: 'Server error while adding reply', error: error.message });
  }
};

// Update ticket (admin/support only)
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { status, assigned_to, priority, department, category, resolution_notes } = req.body;
    
    // Check permissions
    if (!['admin', 'support_agent'].includes(userRole)) {
      return res.status(403).json({ message: 'Unauthorized to update tickets' });
    }
    
    // Get current ticket
    const [currentTickets] = await db.pool.execute('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (currentTickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const currentTicket = currentTickets[0];
    
    // Validate new values if provided
    if (status) {
      const validStatuses = ['open', 'in_progress', 'pending_customer', 'pending_resolution', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid ticket status' });
      }
    }
    
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority level' });
      }
    }
    
    if (assigned_to) {
      // Verify assignee is a support agent
      const [agents] = await db.pool.execute(
        'SELECT role FROM users WHERE id = ? AND role IN (?, ?)', 
        [assigned_to, 'admin', 'support_agent']
      );
      if (agents.length === 0) {
        return res.status(400).json({ message: 'Assigned user is not a support agent' });
      }
    }
    
    // Prepare update fields
    const updateFields = [];
    const updateParams = [];
    
    if (status) {
      updateFields.push('status = ?', 'updated_at = NOW()');
      updateParams.push(status);
    }
    
    if (assigned_to !== undefined) {
      updateFields.push('assigned_to = ?', 'assigned_at = NOW()');
      updateParams.push(assigned_to);
    }
    
    if (priority) {
      updateFields.push('priority = ?');
      updateParams.push(priority);
    }
    
    if (department) {
      updateFields.push('department = ?');
      updateParams.push(department);
    }
    
    if (category) {
      updateFields.push('category = ?');
      updateParams.push(category);
    }
    
    if (resolution_notes) {
      updateFields.push('resolution_notes = ?');
      updateParams.push(resolution_notes);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const updateQuery = `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`;
    updateParams.push(id);
    
    await db.pool.execute(updateQuery, updateParams);
    
    // Add ticket history entry
    const historyQuery = `
      INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by, change_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    // Record changes in history
    if (status && status !== currentTicket.status) {
      await db.pool.execute(historyQuery, [id, 'status', currentTicket.status, status, userId, 'Status updated by support agent']);
    }
    
    if (assigned_to !== undefined && assigned_to !== currentTicket.assigned_to) {
      const oldAgentName = currentTicket.assigned_agent_name || 'Unassigned';
      const newAgentName = assigned_to ? (await db.pool.execute('SELECT name FROM users WHERE id = ?', [assigned_to]))[0]?.name || 'Unknown' : 'Unassigned';
      await db.pool.execute(historyQuery, [id, 'assigned_to', oldAgentName, newAgentName, userId, 'Ticket reassigned']);
    }
    
    // Send notification about ticket update
    await sendUpdateNotification(id, status, assigned_to, resolution_notes);
    
    res.status(200).json({
      message: 'Ticket updated successfully',
      ticket_id: id,
      changes: {
        status: status || currentTicket.status,
        assigned_to: assigned_to !== undefined ? assigned_to : currentTicket.assigned_to,
        priority: priority || currentTicket.priority,
        department: department || currentTicket.department,
        category: category || currentTicket.category
      },
      success: true
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error while updating ticket', error: error.message });
  }
};

// Get support dashboard analytics (admin/support only)
const getSupportDashboardAnalytics = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;
    
    if (!['admin', 'support_agent'].includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { 
      start_date = '30 days ago', 
      end_date = 'now',
      agent_id = null,
      department_filter = null
    } = req.query;
    
    const startDate = parseDate(start_date);
    const endDate = parseDate(end_date);
    
    // Ticket metrics
    let ticketWhereClause = 'WHERE st.created_at BETWEEN ? AND ?';
    const ticketParams = [startDate, endDate];
    
    if (agent_id) {
      ticketWhereClause += ' AND st.assigned_to = ?';
      ticketParams.push(agent_id);
    }
    
    if (department_filter) {
      ticketWhereClause += ' AND st.department = ?';
      ticketParams.push(department_filter);
    }
    
    const ticketMetricsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN st.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN st.status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN st.status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN st.status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN st.priority = 'urgent' THEN 1 END) as urgent_tickets,
        COUNT(CASE WHEN st.priority = 'high' THEN 1 END) as high_priority_tickets,
        COUNT(CASE WHEN st.category = 'technical' THEN 1 END) as technical_tickets,
        COUNT(CASE WHEN st.category = 'billing' THEN 1 END) as billing_tickets,
        AVG(TIMESTAMPDIFF(HOUR, st.created_at, st.resolved_at)) as average_resolution_time_hours,
        MIN(TIMESTAMPDIFF(HOUR, st.created_at, st.resolved_at)) as fastest_resolution_time_hours,
        MAX(TIMESTAMPDIFF(HOUR, st.created_at, st.resolved_at)) as slowest_resolution_time_hours
      FROM support_tickets st
      ${ticketWhereClause}
    `;
    
    const [ticketMetrics] = await db.pool.execute(ticketMetricsQuery, ticketParams);
    
    // Agent performance (for admin users)
    let agentPerformance = [];
    if (userRole === 'admin') {
      const agentQuery = `
        SELECT 
          u.id as agent_id,
          u.name as agent_name,
          COUNT(st.id) as total_tickets,
          COUNT(CASE WHEN st.status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN st.status = 'closed' THEN 1 END) as closed_tickets,
          AVG(TIMESTAMPDIFF(HOUR, st.created_at, st.resolved_at)) as avg_resolution_hours,
          AVG(srating.rating) as avg_customer_rating
        FROM users u
        LEFT JOIN support_tickets st ON u.id = st.assigned_to
        LEFT JOIN support_ratings srating ON st.id = srating.ticket_id
        WHERE u.role IN ('admin', 'support_agent')
          AND st.created_at BETWEEN ? AND ?
        GROUP BY u.id
        ORDER BY total_tickets DESC
      `;
      
      const [agentResults] = await db.pool.execute(agentQuery, [startDate, endDate]);
      agentPerformance = agentResults.map(agent => ({
        ...agent,
        total_tickets: parseInt(agent.total_tickets),
        resolved_tickets: parseInt(agent.resolved_tickets || 0),
        closed_tickets: parseInt(agent.closed_tickets || 0),
        avg_resolution_hours: parseFloat(agent.avg_resolution_hours || 0),
        avg_customer_rating: parseFloat(agent.avg_customer_rating || 0).toFixed(2)
      }));
    }
    
    // Ticket trends over time
    const trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as daily_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_daily,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_daily
      FROM support_tickets
      WHERE created_at BETWEEN ? AND ?
        AND created_at >= DATE_SUB(?, INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const [trends] = await db.pool.execute(trendQuery, [startDate, endDate, endDate]);
    
    res.status(200).json({
      dashboard: {
        metrics: ticketMetrics[0] ? {
          ...ticketMetrics[0],
          total_tickets: parseInt(ticketMetrics[0].total_tickets),
          open_tickets: parseInt(ticketMetrics[0].open_tickets),
          in_progress_tickets: parseInt(ticketMetrics[0].in_progress_tickets),
          resolved_tickets: parseInt(ticketMetrics[0].resolved_tickets),
          closed_tickets: parseInt(ticketMetrics[0].closed_tickets),
          urgent_tickets: parseInt(ticketMetrics[0].urgent_tickets),
          high_priority_tickets: parseInt(ticketMetrics[0].high_priority_tickets),
          technical_tickets: parseInt(ticketMetrics[0].technical_tickets),
          billing_tickets: parseInt(ticketMetrics[0].billing_tickets),
          average_resolution_time_hours: parseFloat(ticketMetrics[0].average_resolution_time_hours || 0).toFixed(2),
          fastest_resolution_time_hours: parseFloat(ticketMetrics[0].fastest_resolution_time_hours || 0),
          slowest_resolution_time_hours: parseFloat(ticketMetrics[0].slowest_resolution_time_hours || 0)
        } : {},
        agent_performance: agentPerformance,
        trends: trends.map(trend => ({
          ...trend,
          date: trend.date,
          daily_tickets: parseInt(trend.daily_tickets),
          resolved_daily: parseInt(trend.resolved_daily || 0),
          urgent_daily: parseInt(trend.urgent_daily || 0)
        })),
        calculated_at: new Date().toISOString(),
        period: {
          start_date: startDate,
          end_date: endDate
        },
        filters: {
          agent_id,
          department: department_filter
        }
      },
      success: true
    });
  } catch (error) {
    console.error('Support dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching support analytics', error: error.message });
  }
};

// Get agent workload (for distribution)
const getAgentWorkload = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (!['admin', 'support_agent'].includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const workloadQuery = `
      SELECT 
        u.id as agent_id,
        u.name as agent_name,
        u.email as agent_email,
        COUNT(st.id) as total_assigned_tickets,
        COUNT(CASE WHEN st.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN st.status = 'in_progress' THEN 1 END) as in_progress_tickets,
        AVG(TIMESTAMPDIFF(HOUR, st.created_at, st.updated_at)) as avg_response_time_hours
      FROM users u
      LEFT JOIN support_tickets st ON u.id = st.assigned_to
      WHERE u.role IN ('admin', 'support_agent')
        AND (st.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR st.id IS NULL)
      GROUP BY u.id
      ORDER BY total_assigned_tickets ASC
    `;
    
    const [workload] = await db.pool.execute(workloadQuery);
    
    res.status(200).json({
      workload: workload.map(agent => ({
        ...agent,
        total_assigned_tickets: parseInt(agent.total_assigned_tickets),
        open_tickets: parseInt(agent.open_tickets || 0),
        in_progress_tickets: parseInt(agent.in_progress_tickets || 0),
        avg_response_time_hours: parseFloat(agent.avg_response_time_hours || 0).toFixed(2)
      })),
      calculated_at: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Agent workload error:', error);
    res.status(500).json({ message: 'Server error while fetching agent workload', error: error.message });
  }
};

// Add internal note to ticket
const addInternalNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { note, visibility = 'team' } = req.body;
    
    if (!['admin', 'support_agent'].includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (!note) {
      return res.status(400).json({ message: 'Note content is required' });
    }
    
    // Verify ticket exists
    const [tickets] = await db.pool.execute('SELECT id FROM support_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Add internal note (similar to reply but marked as internal)
    const noteQuery = `
      INSERT INTO support_replies (
        ticket_id, user_id, message, is_internal, type, visibility, created_at
      ) VALUES (?, ?, ?, 1, 'internal_note', ?, NOW())
    `;
    
    await db.pool.execute(noteQuery, [id, userId, note, visibility]);
    
    res.status(200).json({
      message: 'Internal note added successfully',
      ticket_id: id,
      note_type: 'internal_note',
      visibility,
      success: true
    });
  } catch (error) {
    console.error('Add internal note error:', error);
    res.status(500).json({ message: 'Server error while adding internal note', error: error.message });
  }
};

// Generate ticket number
const generateTicketNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `QS-${timestamp.slice(-8)}-${random}`;
};

// Validate custom fields
const validateCustomFields = (fields) => {
  // In a real implementation, you would validate against predefined field schemas
  // For now, just sanitize the input
  return typeof fields === 'object' && fields !== null ? fields : {};
};

// Add ticket note helper
const addTicketNote = async (ticketId, authorType, message, userId) => {
  const noteQuery = `
    INSERT INTO support_replies (ticket_id, user_id, message, is_internal, type, created_at)
    VALUES (?, ?, ?, 1, 'system_note', NOW())
  `;
  await db.pool.execute(noteQuery, [ticketId, userId, message]);
};

// Escalate ticket helper
const escalateTicket = async (ticketId) => {
  // Notify senior support team
  console.log(`URGENT TICKET ESCALATION: Ticket ID ${ticketId} marked as urgent`);
  
  // In a real implementation, this would send notifications to senior team
  // and possibly assign to a senior agent
};

// Helper function to send notifications
const sendSupportNotification = async (ticketId, subject, priority, userId) => {
  // This would integrate with email, SMS, or in-app notification services
  console.log(`Support notification sent for ticket ${ticketId}: ${subject} (Priority: ${priority})`);
};

const sendReplyNotification = async (ticketId, userId, message, ticket, isInternal) => {
  if (isInternal) return; // Don't notify for internal notes
  
  // Notify customer about the reply
  console.log(`Reply notification sent to customer for ticket ${ticketId}`);
};

const sendUpdateNotification = async (ticketId, status, assignedAgentId, resolutionNotes) => {
  // Notify customer about ticket status updates
  console.log(`Update notification sent for ticket ${ticketId} - Status: ${status}`);
};

// Helper function to parse date strings
const parseDate = (dateString) => {
  if (dateString === 'now') return new Date();
  if (dateString === '30 days ago') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (dateString === '7 days ago') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return new Date(dateString);
};

const getGroupByClause = (granularity) => {
  switch (granularity) {
    case 'year':
      return 'DATE_FORMAT(created_at, "%Y")';
    case 'month':
      return 'DATE_FORMAT(created_at, "%Y-%m")';
    case 'week':
      return 'YEARWEEK(created_at)';
    case 'day':
    default:
      return 'DATE(created_at)';
  }
};

module.exports = {
  createSupportTicket,
  getUserTickets,
  getTicketById,
  replyToTicket,
  updateTicket,
  getSupportDashboardAnalytics,
  getAgentWorkload,
  addInternalNote
};
// userController.js - Advanced user management
const db = require('../db');

// Get user profile with comprehensive details
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userQuery = `
      SELECT 
        u.*,
        up.language,
        up.currency,
        up.timezone,
        up.notifications_enabled,
        up.email_notifications,
        up.sms_notifications,
        up.marketing_communications,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = u.id AND payment_status = 'paid') as total_spent,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as review_count,
        (SELECT COUNT(*) FROM wishlist WHERE user_id = u.id) as wishlist_count,
        (SELECT COUNT(*) FROM cart WHERE user_id = u.id) as cart_item_count,
        (SELECT COUNT(*) FROM support_tickets WHERE user_id = u.id) as support_tickets_count
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = ?
    `;
    
    const [users] = await db.pool.execute(userQuery, [userId]);
    
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
          order_count: user.order_count,
          total_spent: parseFloat(user.total_spent || 0),
          review_count: user.review_count,
          wishlist_count: user.wishlist_count,
          cart_item_count: user.cart_item_count,
          support_tickets_count: user.support_tickets_count
        },
        preferences: {
          language: user.language || 'en',
          currency: user.currency || 'USD',
          timezone: user.timezone || 'UTC',
          notifications_enabled: user.notifications_enabled === 1,
          email_notifications: user.email_notifications === 1,
          sms_notifications: user.sms_notifications === 1,
          marketing_communications: user.marketing_communications === 1
        }
      },
      success: true
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile', error: error.message });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, phone, avatar } = req.body;
    
    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const emailCheckQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
      const [existingEmails] = await db.pool.execute(emailCheckQuery, [email, userId]);
      
      if (existingEmails.length > 0) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }
    
    const updateQuery = `
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          avatar = COALESCE(?, avatar),
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.pool.execute(updateQuery, [name, email, phone, avatar, userId]);
    
    res.status(200).json({
      message: 'Profile updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile', error: error.message });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 10, 
      status = null, 
      start_date = null, 
      end_date = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (start_date) {
      whereClause += ' AND created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND created_at <= ?';
      params.push(end_date);
    }
    
    const query = `
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_items
      FROM orders o
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const [orders] = await db.pool.execute(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      orders: orders.map(order => ({
        ...order,
        total_items: order.total_items || 0,
        item_count: order.item_count || 0,
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
        start_date,
        end_date,
        sort_by,
        sort_order
      },
      success: true
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Server error while fetching orders', error: error.message });
  }
};

// Get user addresses
const getUserAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const addressQuery = 'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC';
    const [addresses] = await db.pool.execute(addressQuery, [userId]);
    
    res.status(200).json({
      addresses: addresses.map(address => ({
        ...address,
        is_default: address.is_default === 1,
        created_at: address.created_at.toISOString(),
        updated_at: address.updated_at.toISOString()
      })),
      success: true
    });
  } catch (error) {
    console.error('Get user address error:', error);
    res.status(500).json({ message: 'Server error while fetching addresses', error: error.message });
  }
};

// Add user address
const addUserAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      type = 'both',
      first_name,
      last_name,
      company = null,
      address_line_1,
      address_line_2 = null,
      city,
      state,
      postal_code,
      country,
      phone = null,
      is_default = false
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !address_line_1 || !city || !state || !postal_code || !country) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }
    
    // If setting as default, update existing defaults to false
    if (is_default) {
      await db.pool.execute(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    } else if (is_default === undefined) {
      // If no default specified, check if user has no addresses and set as default
      const countQuery = 'SELECT COUNT(*) as count FROM addresses WHERE user_id = ?';
      const [countResult] = await db.pool.execute(countQuery, [userId]);
      
      if (countResult[0].count === 0) {
        is_default = true;
      }
    }
    
    const insertQuery = `
      INSERT INTO addresses (
        user_id, type, first_name, last_name, company, address_line_1, 
        address_line_2, city, state, postal_code, country, phone, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await db.pool.execute(insertQuery, [
      userId, type, first_name, last_name, company, address_line_1,
      address_line_2, city, state, postal_code, country, phone, is_default ? 1 : 0
    ]);
    
    res.status(201).json({
      message: 'Address added successfully',
      address_id: result.insertId,
      success: true
    });
  } catch (error) {
    console.error('Add user address error:', error);
    res.status(500).json({ message: 'Server error while adding address', error: error.message });
  }
};

// Update user address
const updateUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      type,
      first_name,
      last_name,
      company,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      phone,
      is_default
    } = req.body;
    
    // Check if address belongs to user
    const addressCheckQuery = 'SELECT id FROM addresses WHERE id = ? AND user_id = ?';
    const [addresses] = await db.pool.execute(addressCheckQuery, [id, userId]);
    
    if (addresses.length === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to user' });
    }
    
    // If setting as default, update existing defaults to false
    if (is_default) {
      await db.pool.execute(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }
    
    const updateQuery = `
      UPDATE addresses 
      SET 
        type = COALESCE(?, type),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        company = COALESCE(?, company),
        address_line_1 = COALESCE(?, address_line_1),
        address_line_2 = COALESCE(?, address_line_2),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        country = COALESCE(?, country),
        phone = COALESCE(?, phone),
        is_default = COALESCE(?, is_default),
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    
    await db.pool.execute(updateQuery, [
      type, first_name, last_name, company, address_line_1,
      address_line_2, city, state, postal_code, country,
      phone, is_default ? 1 : 0, id, userId
    ]);
    
    res.status(200).json({
      message: 'Address updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Update user address error:', error);
    res.status(500).json({ message: 'Server error while updating address', error: error.message });
  }
};

// Delete user address
const deleteUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if address belongs to user
    const addressCheckQuery = 'SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?';
    const [addresses] = await db.pool.execute(addressCheckQuery, [id, userId]);
    
    if (addresses.length === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to user' });
    }
    
    const address = addresses[0];
    
    // Cannot delete default address if it's the only one
    const countQuery = 'SELECT COUNT(*) as count FROM addresses WHERE user_id = ?';
    const [countResult] = await db.pool.execute(countQuery, [userId]);
    
    if (countResult[0].count === 1 && address.is_default) {
      return res.status(400).json({ message: 'Cannot delete the only address when it\'s set as default' });
    }
    
    await db.pool.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
    
    res.status(200).json({
      message: 'Address deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Delete user address error:', error);
    res.status(500).json({ message: 'Server error while deleting address', error: error.message });
  }
};

// Get user preferences
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const prefQuery = 'SELECT * FROM user_preferences WHERE user_id = ?';
    const [preferences] = await db.pool.execute(prefQuery, [userId]);
    
    if (preferences.length === 0) {
      // Create default preferences if none exist
      await db.pool.execute(
        'INSERT INTO user_preferences (user_id) VALUES (?)',
        [userId]
      );
      
      return res.status(200).json({
        preferences: {
          language: 'en',
          currency: 'USD',
          timezone: 'UTC',
          notifications_enabled: true,
          email_notifications: true,
          sms_notifications: false,
          marketing_communications: false
        },
        success: true
      });
    }
    
    const pref = preferences[0];
    
    res.status(200).json({
      preferences: {
        language: pref.language || 'en',
        currency: pref.currency || 'USD',
        timezone: pref.timezone || 'UTC',
        notifications_enabled: pref.notifications_enabled === 1,
        email_notifications: pref.email_notifications === 1,
        sms_notifications: pref.sms_notifications === 1,
        marketing_communications: pref.marketing_communications === 1
      },
      success: true
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({ message: 'Server error while fetching preferences', error: error.message });
  }
};

// Update user preferences
const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      language,
      currency,
      timezone,
      notifications_enabled,
      email_notifications,
      sms_notifications,
      marketing_communications
    } = req.body;
    
    // Check if preferences exist
    const checkQuery = 'SELECT user_id FROM user_preferences WHERE user_id = ?';
    const [existing] = await db.pool.execute(checkQuery, [userId]);
    
    if (existing.length === 0) {
      // Create preferences
      const insertQuery = `
        INSERT INTO user_preferences (
          user_id, language, currency, timezone, notifications_enabled, 
          email_notifications, sms_notifications, marketing_communications
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.pool.execute(insertQuery, [
        userId,
        language || 'en',
        currency || 'USD',
        timezone || 'UTC',
        notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : 1,
        email_notifications !== undefined ? (email_notifications ? 1 : 0) : 1,
        sms_notifications !== undefined ? (sms_notifications ? 1 : 0) : 0,
        marketing_communications !== undefined ? (marketing_communications ? 1 : 0) : 0
      ]);
    } else {
      // Update preferences
      const updateQuery = `
        UPDATE user_preferences SET
          language = COALESCE(?, language),
          currency = COALESCE(?, currency),
          timezone = COALESCE(?, timezone),
          notifications_enabled = COALESCE(?, notifications_enabled),
          email_notifications = COALESCE(?, email_notifications),
          sms_notifications = COALESCE(?, sms_notifications),
          marketing_communications = COALESCE(?, marketing_communications),
          updated_at = NOW()
        WHERE user_id = ?
      `;
      await db.pool.execute(updateQuery, [
        language, currency, timezone,
        notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : undefined,
        email_notifications !== undefined ? (email_notifications ? 1 : 0) : undefined,
        sms_notifications !== undefined ? (sms_notifications ? 1 : 0) : undefined,
        marketing_communications !== undefined ? (marketing_communications ? 1 : 0) : undefined,
        userId
      ]);
    }
    
    res.status(200).json({
      message: 'Preferences updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({ message: 'Server error while updating preferences', error: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserOrders,
  getUserAddress,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserPreferences,
  updateUserPreferences
};
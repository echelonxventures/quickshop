const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Advanced authentication with multi-tenant support
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'customer', company_id = null, brand_info = null } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    const [existingUsers] = await db.pool.execute(checkUserQuery, [email]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for security
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Handle company registration for multi-vendor
    let companyId = company_id;
    if (role === 'seller' && !company_id && brand_info) {
      // Create new company entry
      const createCompanyQuery = `
        INSERT INTO companies (name, brand_info, tax_id, business_type, status) 
        VALUES (?, ?, ?, ?, ?)
      `;
      const [companyResult] = await db.pool.execute(createCompanyQuery, [
        brand_info.company_name,
        JSON.stringify(brand_info),
        brand_info.tax_id || null,
        brand_info.business_type || 'retail',
        'pending' // Need admin approval
      ]);
      companyId = companyResult.insertId;
    }
    
    // Insert user with company association
    const userQuery = `
      INSERT INTO users (name, email, password, role, company_id, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const [userResult] = await db.pool.execute(userQuery, [
      name, 
      email, 
      hashedPassword, 
      role, 
      companyId || null
    ]);
    
    // Create user preferences
    const preferencesQuery = `
      INSERT INTO user_preferences (user_id, language, currency, timezone) 
      VALUES (?, 'en', 'USD', 'UTC')
    `;
    await db.pool.execute(preferencesQuery, [userResult.insertId]);
    
    // Generate JWT token with additional claims
    const token = jwt.sign(
      { 
        userId: userResult.insertId, 
        email, 
        role,
        companyId: companyId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    // Send welcome email (async)
    setTimeout(() => {
      // Email service would be called here
      console.log(`Welcome email queued for: ${email}`);
    }, 0);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { 
        id: userResult.insertId, 
        name, 
        email, 
        role,
        company_id: companyId,
        created_at: new Date().toISOString()
      },
      success: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, company_code = null } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user in database with company info
    const query = `
      SELECT u.*, c.name as company_name, c.status as company_status 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.email = ?
    `;
    const [users] = await db.pool.execute(query, [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Check company status for sellers
    if (user.role === 'seller' && user.company_status === 'suspended') {
      return res.status(403).json({ message: 'Company account is suspended' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login time
    await db.pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?', 
      [user.id]
    );
    
    // Generate JWT token with additional claims
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        companyId: user.company_id,
        permissions: await getUserPermissions(user.id, user.role)
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        company_name: user.company_name,
        permissions: await getUserPermissions(user.id, user.role),
        created_at: user.created_at.toISOString(),
        last_login: user.last_login ? user.last_login.toISOString() : null
      },
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: error.message 
    });
  }
};

// Get user permissions based on role and company
const getUserPermissions = async (userId, role) => {
  // This would typically come from a permissions table
  const basePermissions = {
    customer: ['read_profile', 'update_profile', 'view_products', 'place_orders', 'view_orders'],
    seller: ['read_profile', 'update_profile', 'manage_products', 'view_orders', 'manage_inventory', 'view_sales'],
    admin: ['read_profile', 'update_profile', 'manage_users', 'manage_products', 'manage_orders', 'view_reports', 'system_settings'],
    support_agent: ['view_tickets', 'manage_tickets', 'view_users', 'view_orders']
  };
  
  return basePermissions[role] || basePermissions.customer;
};

// Advanced profile management with company details
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    // Get user with related company info
    const userQuery = `
      SELECT u.*, c.name as company_name, c.brand_info, c.status as company_status,
             up.language, up.currency, up.timezone
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = ?
    `;
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Get additional user stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE user_id = ?) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = ? AND payment_status = 'paid') as total_spent,
        (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews
    `;
    const [stats] = await db.pool.execute(statsQuery, [userId, userId, userId]);
    
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        company_name: user.company_name,
        company_status: user.company_status,
        brand_info: user.brand_info ? JSON.parse(user.brand_info) : null,
        preferences: {
          language: user.language,
          currency: user.currency,
          timezone: user.timezone
        },
        stats: stats[0],
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        permissions: req.user.permissions
      },
      success: true
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, company_info, preferences } = req.body;
    
    // Start transaction for atomic updates
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update user profile
      if (name || email) {
        const updateProfileQuery = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
        await connection.execute(updateProfileQuery, [name || req.user.name, email || req.user.email, userId]);
      }
      
      // Update company info if user is a seller
      if (company_info && req.user.role === 'seller') {
        const updateCompanyQuery = 'UPDATE companies SET ? WHERE id = ?';
        await connection.execute(updateCompanyQuery, [company_info, req.user.companyId]);
      }
      
      // Update user preferences
      if (preferences) {
        const updatePrefsQuery = `
          INSERT INTO user_preferences (user_id, language, currency, timezone) 
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE language = VALUES(language), currency = VALUES(currency), timezone = VALUES(timezone)
        `;
        await connection.execute(updatePrefsQuery, [
          userId,
          preferences.language || 'en',
          preferences.currency || 'USD',
          preferences.timezone || 'UTC'
        ]);
      }
      
      await connection.commit();
      connection.release();
      
      res.status(200).json({ 
        message: 'Profile updated successfully',
        success: true 
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Multi-vendor company management
const createCompany = async (req, res) => {
  try {
    const { 
      name, 
      brand_info, 
      tax_id, 
      business_type, 
      address, 
      bank_details 
    } = req.body;
    
    const userId = req.user.userId;
    
    // Only allow sellers to create companies
    if (req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can create companies' });
    }
    
    const query = `
      INSERT INTO companies (name, brand_info, tax_id, business_type, address, bank_details, created_by, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.pool.execute(query, [
      name,
      JSON.stringify(brand_info),
      tax_id,
      business_type,
      JSON.stringify(address),
      JSON.stringify(bank_details),
      userId,
      'pending' // Requires admin approval
    ]);
    
    // Associate company with user
    await db.pool.execute('UPDATE users SET company_id = ? WHERE id = ?', [result.insertId, userId]);
    
    res.status(201).json({ 
      message: 'Company created successfully. Awaiting admin approval.',
      company_id: result.insertId,
      success: true
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Seller registration process
const sellerRegistration = async (req, res) => {
  try {
    const { 
      business_name, 
      business_email, 
      business_phone, 
      business_address, 
      tax_id, 
      business_type,
      bank_account_details,
      business_license
    } = req.body;
    
    const userId = req.user.userId;
    
    // Verify user role
    const userQuery = 'SELECT role, company_id FROM users WHERE id = ?';
    const [users] = await db.pool.execute(userQuery, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (users[0].role !== 'customer') {
      return res.status(400).json({ message: 'User already has a role' });
    }
    
    // Create company record
    const companyQuery = `
      INSERT INTO companies (name, email, phone, address, tax_id, business_type, bank_details, license, created_by, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [companyResult] = await db.pool.execute(companyQuery, [
      business_name,
      business_email,
      business_phone,
      JSON.stringify(business_address),
      tax_id,
      business_type,
      JSON.stringify(bank_account_details),
      business_license,
      userId,
      'pending_verification'
    ]);
    
    // Update user role and company association
    await db.pool.execute('UPDATE users SET role = ?, company_id = ? WHERE id = ?', ['seller', companyResult.insertId, userId]);
    
    // Send notification to admin for verification
    setTimeout(() => {
      console.log(`Seller registration notification sent to admin for user: ${userId}`);
    }, 0);
    
    res.status(201).json({
      message: 'Seller registration submitted successfully. Awaiting verification.',
      company_id: companyResult.insertId,
      success: true
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  createCompany,
  sellerRegistration
};
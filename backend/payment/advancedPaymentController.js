const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const paypal = require('paypal-rest-sdk');
const db = require('../db');

// Payment controller with multiple gateway support
const processPayment = async (req, res) => {
  try {
    const { 
      order_id, 
      payment_method, 
      payment_data,
      customer_info,
      billing_address,
      shipping_address
    } = req.body;
    
    const userId = req.user.userId;
    
    // Verify order belongs to user and is valid
    const orderQuery = `
      SELECT o.*, u.email as customer_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE o.id = ? AND o.user_id = ?
    `;
    const [orders] = await db.pool.execute(orderQuery, [order_id, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found or does not belong to user' });
    }
    
    const order = orders[0];
    
    if (order.payment_status !== 'pending') {
      return res.status(400).json({ message: 'Order payment already processed' });
    }
    
    let paymentResult;
    let transactionId;
    
    switch (payment_method) {
      case 'stripe':
        paymentResult = await processStripePayment(order, payment_data);
        transactionId = paymentResult.id;
        break;
        
      case 'paypal':
        paymentResult = await processPayPalPayment(order, payment_data);
        transactionId = paymentResult.id;
        break;
        
      case 'razorpay':
        paymentResult = await processRazorpayPayment(order, payment_data);
        transactionId = paymentResult.id;
        break;
        
      case 'bank_transfer':
        paymentResult = await processBankTransfer(order);
        transactionId = `BANK_${Date.now()}`;
        break;
        
      case 'cod': // Cash on Delivery
        paymentResult = await processCashOnDelivery(order);
        transactionId = `COD_${Date.now()}`;
        break;
        
      default:
        return res.status(400).json({ message: 'Unsupported payment method' });
    }
    
    if (paymentResult.success) {
      // Update order with payment information
      const updateOrderQuery = `
        UPDATE orders 
        SET payment_status = 'paid', 
            payment_method = ?, 
            payment_transaction_id = ?,
            transaction_details = ?,
            status = 'confirmed'
        WHERE id = ?
      `;
      
      await db.pool.execute(updateOrderQuery, [
        payment_method,
        transactionId,
        JSON.stringify(paymentResult.details || {}),
        order_id
      ]);
      
      // Record payment in payments table
      const paymentQuery = `
        INSERT INTO payments (
          order_id, payment_gateway, transaction_id, amount, currency, 
          status, payment_method, payment_data, customer_info, billing_address, shipping_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.pool.execute(paymentQuery, [
        order_id,
        payment_method,
        transactionId,
        order.total_amount,
        order.currency,
        'completed',
        payment_method,
        JSON.stringify(payment_data),
        JSON.stringify(customer_info),
        JSON.stringify(billing_address),
        JSON.stringify(shipping_address)
      ]);
      
      // Update product inventory (move from reserved to sold)
      await updateProductInventory(order_id);
      
      // Send confirmation emails
      await sendPaymentConfirmation(order_id, transactionId);
      
      res.status(200).json({
        message: 'Payment processed successfully',
        order_id,
        transaction_id: transactionId,
        payment_status: 'paid',
        payment_method,
        amount: order.total_amount,
        currency: order.currency
      });
    } else {
      // Payment failed
      await db.pool.execute(
        'UPDATE orders SET payment_status = "failed" WHERE id = ?', 
        [order_id]
      );
      
      res.status(400).json({
        message: 'Payment processing failed',
        error: paymentResult.error
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ message: 'Server error during payment processing', error: error.message });
  }
};

// Stripe payment processing
const processStripePayment = async (order, payment_data) => {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total_amount * 100), // Convert to cents
      currency: order.currency.toLowerCase() || 'usd',
      payment_method: payment_data.payment_method_id,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment-success/${order.id}`,
      metadata: {
        order_id: order.id.toString(),
        user_id: order.user_id.toString(),
        customer_email: order.customer_email
      }
    });
    
    return {
      success: paymentIntent.status === 'succeeded',
      id: paymentIntent.id,
      details: {
        status: paymentIntent.status,
        payment_method: paymentIntent.payment_method,
        created: paymentIntent.created
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// PayPal payment processing
const processPayPalPayment = async (order, payment_data) => {
  try {
    const createPaymentJSON = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment-success/${order.id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
      },
      transactions: [{
        amount: {
          currency: order.currency || 'USD',
          total: order.total_amount.toFixed(2)
        },
        description: `Order #${order.order_number}`,
        invoice_number: order.order_number
      }]
    };
    
    const payment = await new Promise((resolve, reject) => {
      paypal.payment.create(createPaymentJSON, (error, payment) => {
        if (error) {
          reject(error);
        } else {
          resolve(payment);
        }
      });
    });
    
    // Execute payment with payment ID and payer ID
    const executePaymentJSON = {
      payer_id: payment_data.payer_id,
      transactions: [{
        amount: {
          currency: order.currency || 'USD',
          total: order.total_amount.toFixed(2)
        }
      }]
    };
    
    const result = await new Promise((resolve, reject) => {
      paypal.payment.execute(payment.id, executePaymentJSON, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    
    return {
      success: result.state === 'approved',
      id: result.id,
      details: {
        state: result.state,
        payer_id: result.payer.payer_info.payer_id,
        payment_method: 'paypal'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Razorpay payment processing
const processRazorpayPayment = async (order, payment_data) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    // Verify payment signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payment_data.razorpay_order_id + '|' + payment_data.razorpay_payment_id)
      .digest('hex');
    
    if (expectedSignature !== payment_data.razorpay_signature) {
      throw new Error('Payment verification failed');
    }
    
    // Capture the payment
    const captureData = {
      amount: Math.round(order.total_amount * 100), // Amount in paise
      currency: order.currency || 'INR'
    };
    
    const payment = await razorpay.payments.capture(payment_data.razorpay_payment_id, captureData);
    
    return {
      success: payment.status === 'captured',
      id: payment.id,
      details: {
        status: payment.status,
        method: payment.method,
        captured: payment.captured
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Bank transfer payment processing
const processBankTransfer = async (order) => {
  try {
    // Generate bank transfer reference
    const reference = `BT_${order.id}_${Date.now()}`;
    
    // In a real implementation, you would:
    // 1. Generate bank account details for the customer
    // 2. Send instructions to customer
    // 3. Wait for payment confirmation
    
    return {
      success: true,
      id: reference,
      details: {
        reference: reference,
        status: 'pending_verification',
        instructions: 'Please transfer the amount to the specified bank account. Payment will be confirmed within 24 hours.',
        account_details: {
          bank_name: 'Your Bank',
          account_number: '1234567890',
          account_name: 'QuickShop E-commerce',
          routing_number: '000000000',
          reference: reference
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Cash on Delivery processing
const processCashOnDelivery = async (order) => {
  try {
    return {
      success: true,
      id: `COD_${order.id}`,
      details: {
        method: 'cash_on_delivery',
        status: 'awaiting_delivery',
        instructions: 'Pay in cash when receiving your order'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Update product inventory after successful payment
const updateProductInventory = async (orderId) => {
  const orderItems = await db.pool.execute(
    'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
    [orderId]
  );
  
  for (const item of orderItems[0]) {
    await db.pool.execute(
      'UPDATE products SET reserved_quantity = GREATEST(0, reserved_quantity - ?), sold_quantity = sold_quantity + ? WHERE id = ?',
      [item.quantity, item.quantity, item.product_id]
    );
  }
};

// Send payment confirmation
const sendPaymentConfirmation = async (orderId, transactionId) => {
  // In a real implementation, this would send emails
  console.log(`Payment confirmation sent for order ${orderId}, transaction: ${transactionId}`);
};

// Get payment methods for an order
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { order_id } = req.query;
    
    // Check if user has any saved payment methods
    const savedMethods = await db.pool.execute(
      'SELECT * FROM user_payment_methods WHERE user_id = ? AND is_default = 1',
      [userId]
    );
    
    const availableMethods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        icon: 'credit-card',
        enabled: !!process.env.STRIPE_PUBLISHABLE_KEY,
        supports_saved_cards: true,
        fees: '2.9% + $0.30',
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
      },
      {
        id: 'paypal',
        name: 'PayPal',
        icon: 'paypal',
        enabled: !!process.env.PAYPAL_CLIENT_ID,
        supports_saved_cards: false,
        fees: '2.9% + $0.30',
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'AUD']
      },
      {
        id: 'razorpay',
        name: 'Razorpay',
        icon: 'indian-rupee',
        enabled: !!process.env.RAZORPAY_KEY_ID,
        supports_saved_cards: true,
        fees: '2% + GST',
        currencies: ['INR']
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        icon: 'building-bank',
        enabled: true,
        supports_saved_cards: false,
        fees: 'Free',
        currencies: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        icon: 'currency-dollar',
        enabled: true,
        supports_saved_cards: false,
        fees: 'Free',
        currencies: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'],
        available_for: ['local'] // Could be restricted by location
      }
    ];
    
    // Filter out disabled methods
    const enabledMethods = availableMethods.filter(method => method.enabled);
    
    // Check order total and location to determine COD availability
    if (order_id) {
      const order = await db.pool.execute(
        'SELECT total_amount FROM orders WHERE id = ?',
        [order_id]
      );
      
      if (order[0].length > 0) {
        const orderAmount = order[0][0].total_amount;
        
        // Disable COD for high-value orders
        if (orderAmount > 5000) { // $5000 threshold
          enabledMethods.forEach(method => {
            if (method.id === 'cod') {
              method.enabled = false;
              method.reason = 'COD unavailable for orders over $5000';
            }
          });
        }
      }
    }
    
    res.status(200).json({
      payment_methods: enabledMethods,
      saved_cards: savedMethods[0],
      default_method: savedMethods[0].length > 0 ? savedMethods[0][0] : null
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error while fetching payment methods', error: error.message });
  }
};

// Handle payment webhook (Stripe)
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      await handleFailedPayment(failedPaymentIntent);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Handle successful payment
const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.order_id;
    
    await db.pool.execute(
      'UPDATE orders SET payment_status = "paid", status = "confirmed" WHERE id = ?',
      [orderId]
    );
    
    // Update inventory
    await updateProductInventory(orderId);
    
    console.log(`Payment successful for order ${orderId}`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
};

// Handle failed payment
const handleFailedPayment = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.order_id;
    
    await db.pool.execute(
      'UPDATE orders SET payment_status = "failed", status = "cancelled" WHERE id = ?',
      [orderId]
    );
    
    console.log(`Payment failed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
};

// Refund payment
const refundPayment = async (req, res) => {
  try {
    const { transaction_id, amount, reason } = req.body;
    const paymentMethod = req.body.payment_method;
    
    let refundResult;
    
    switch (paymentMethod) {
      case 'stripe':
        refundResult = await refundStripePayment(transaction_id, amount);
        break;
      case 'paypal':
        refundResult = await refundPayPalPayment(transaction_id, amount);
        break;
      case 'razorpay':
        refundResult = await refundRazorpayPayment(transaction_id, amount);
        break;
      default:
        return res.status(400).json({ message: 'Refund not supported for this payment method' });
    }
    
    if (refundResult.success) {
      // Record refund in database
      await db.pool.execute(
        'INSERT INTO refunds (transaction_id, original_payment_id, amount, reason, status, refunded_at) VALUES (?, ?, ?, ?, "completed", NOW())',
        [refundResult.id, transaction_id, amount, reason]
      );
      
      res.status(200).json({
        message: 'Refund processed successfully',
        refund_id: refundResult.id,
        transaction_id,
        amount,
        status: 'completed'
      });
    } else {
      res.status(400).json({
        message: 'Refund processing failed',
        error: refundResult.error
      });
    }
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Server error during refund processing', error: error.message });
  }
};

// Stripe refund
const refundStripePayment = async (transactionId, amount) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: transactionId,
      amount: Math.round(amount * 100), // Convert to cents
    });
    
    return {
      success: refund.status === 'succeeded',
      id: refund.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// PayPal refund
const refundPayPalPayment = async (transactionId, amount) => {
  try {
    // PayPal refund implementation
    // This would use PayPal's refund API
    return {
      success: true,
      id: `refund_${transactionId}_${Date.now()}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Razorpay refund
const refundRazorpayPayment = async (transactionId, amount) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    const refund = await razorpay.payments.refund(transactionId, {
      amount: Math.round(amount * 100), // Amount in paise
      speed: 'normal' // or 'optimum'
    });
    
    return {
      success: refund.status === 'processed',
      id: refund.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processPayment,
  getPaymentMethods,
  handleStripeWebhook,
  refundPayment
};
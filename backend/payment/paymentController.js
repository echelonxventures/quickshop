// Payment controller with multiple gateway support
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const paypal = require('paypal-rest-sdk');
const db = require('../db');

// Process payment with various gateways
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
    
    // Validate order
    const orderQuery = `
      SELECT o.*, u.email as customer_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE o.id = ? AND o.user_id = ?
    `;
    const [orders] = await db.pool.execute(orderQuery, [order_id, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orders[0];
    
    if (order.payment_status !== 'pending') {
      return res.status(400).json({ message: 'Order payment already processed' });
    }
    
    let paymentResult;
    
    switch (payment_method) {
      case 'stripe':
        paymentResult = await processStripePayment(order, payment_data);
        break;
        
      case 'paypal':
        paymentResult = await processPayPalPayment(order, payment_data);
        break;
        
      case 'razorpay':
        paymentResult = await processRazorpayPayment(order, payment_data);
        break;
        
      case 'cod':
        paymentResult = await processCashOnDelivery(order);
        break;
        
      default:
        return res.status(400).json({ message: 'Unsupported payment method' });
    }
    
    if (paymentResult.success) {
      // Update order with payment information
      await db.pool.execute(`
        UPDATE orders 
        SET payment_status = 'paid', 
            status = 'confirmed',
            payment_method = ?,
            payment_transaction_id = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [payment_method, paymentResult.transaction_id, order_id]);
      
      // Record payment
      await db.pool.execute(`
        INSERT INTO payments (
          order_id, payment_gateway, transaction_id, amount, currency, 
          status, payment_method, payment_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order_id,
        payment_method,
        paymentResult.transaction_id,
        order.total_amount,
        order.currency || 'USD',
        'completed',
        payment_method,
        JSON.stringify(payment_data)
      ]);
      
      res.status(200).json({
        message: 'Payment processed successfully',
        transaction_id: paymentResult.transaction_id,
        order_id,
        payment_method,
        amount: order.total_amount,
        success: true
      });
    } else {
      res.status(400).json({
        message: 'Payment processing failed',
        error: paymentResult.error
      });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Server error while processing payment', error: error.message });
  }
};

// Stripe payment processing
const processStripePayment = async (order, payment_data) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total_amount * 100), // Convert to smallest currency unit
      currency: order.currency.toLowerCase() || 'usd',
      payment_method: payment_data.payment_method_id,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment-success`,
      metadata: {
        order_id: order.id.toString(),
        user_id: order.user_id.toString()
      }
    });
    
    return {
      success: paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture',
      transaction_id: paymentIntent.id,
      details: paymentIntent
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
    const payment = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
      },
      transactions: [{
        amount: {
          currency: order.currency || 'USD',
          total: order.total_amount.toFixed(2)
        },
        description: `Order #${order.order_number}`
      }]
    };
    
    const result = await new Promise((resolve, reject) => {
      paypal.payment.create(payment, (error, payment) => {
        if (error) {
          reject(error);
        } else {
          // Execute the payment
          const paymentExecute = {
            payer_id: payment_data.payer_id,
            transactions: [{
              amount: {
                currency: order.currency || 'USD',
                total: order.total_amount.toFixed(2)
              }
            }]
          };
          
          paypal.payment.execute(payment.id, paymentExecute, (executeError, executeResult) => {
            if (executeError) {
              reject(executeError);
            } else {
              resolve(executeResult);
            }
          });
        }
      });
    });
    
    return {
      success: result.state === 'approved',
      transaction_id: result.id,
      details: result
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
      return {
        success: false,
        error: 'Payment verification failed'
      };
    }
    
    // Capture the payment
    const capturedPayment = await razorpay.payments.capture(
      payment_data.razorpay_payment_id,
      Math.round(order.total_amount * 100), // Amount in paise
      order.currency || 'INR'
    );
    
    return {
      success: capturedPayment.status === 'captured',
      transaction_id: capturedPayment.id,
      details: capturedPayment
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Cash on delivery processing
const processCashOnDelivery = async (order) => {
  try {
    return {
      success: true,
      transaction_id: `COD_${order.id}_${Date.now()}`,
      details: {
        method: 'cash_on_delivery',
        status: 'pending',
        message: 'Cash on delivery order created'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Get available payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // In a real implementation, this would check user eligibility for different payment methods
    const paymentMethods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        icon: 'credit-card',
        enabled: !!process.env.STRIPE_PUBLISHABLE_KEY,
        supports_saved_cards: true,
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
      },
      {
        id: 'paypal',
        name: 'PayPal',
        icon: 'paypal',
        enabled: !!process.env.PAYPAL_CLIENT_ID,
        supports_saved_cards: false,
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
      },
      {
        id: 'razorpay',
        name: 'Razorpay',
        icon: 'razorpay',
        enabled: !!process.env.RAZORPAY_KEY_ID,
        supports_saved_cards: true,
        currencies: ['INR']
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        icon: 'cash',
        enabled: true,
        supports_saved_cards: false,
        currencies: ['USD', 'INR', 'EUR'],
        available_for: ['local'] // Could be restricted by location
      }
    ];
    
    res.status(200).json({
      payment_methods: paymentMethods.filter(method => method.enabled),
      success: true
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching payment methods', 
      error: error.message 
    });
  }
};

module.exports = {
  processPayment,
  getPaymentMethods
};
const express = require('express');
const router = express.Router();
const { 
  getInventory, 
  updateInventory, 
  getLowStockItems,
  getInventoryAnalytics,
  createInventoryAlert,
  getInventoryAlerts
} = require('./inventoryController');

// Get inventory for a seller
router.get('/', getInventory);

// Update inventory for a product
router.put('/:productId', updateInventory);

// Get low stock items
router.get('/low-stock', getLowStockItems);

// Get inventory analytics
router.get('/analytics', getInventoryAnalytics);

// Create inventory alert
router.post('/alerts', createInventoryAlert);

// Get inventory alerts
router.get('/alerts', getInventoryAlerts);

module.exports = router;
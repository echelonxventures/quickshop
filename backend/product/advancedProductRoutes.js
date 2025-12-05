const express = require('express');
const { generateRecommendations } = require('./advancedRecommendationController');
const { getSearchResults } = require('./advancedSearchController');
const { getTrendingProducts, getNewArrivals, getOnSaleProducts } = require('./productAnalyticsController');

const router = express.Router();

// Get advanced search results
router.get('/search', getSearchResults);

// Get product recommendations
router.get('/recommendations', generateRecommendations);

// Get trending products
router.get('/trending', getTrendingProducts);

// Get new arrivals
router.get('/new-arrivals', getNewArrivals);

// Get on sale products
router.get('/on-sale', getOnSaleProducts);

module.exports = router;
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Get dashboard statistics (no auth required)
router.get('/stats', dashboardController.getDashboardStats);

// Get message history (no auth required)
router.get('/message-history', dashboardController.getMessageHistory);

module.exports = router;

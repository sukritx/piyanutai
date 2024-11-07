const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getCurrentUser } = require('../controllers/userController');

const router = express.Router();

router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
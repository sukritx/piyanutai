const express = require('express');
const passport = require('passport');
const { signup, signin, logout, googleAuth, handleGoogleCallback } = require('../controllers/authController');
const { googleCallback } = require('../utils/googleAuthUtils');
const crypto = require('crypto');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

require('dotenv').config();
require('../config/passport')(passport);

const router = express.Router();

// Routes
router.post('/signup', csrfProtection, signup);
router.post('/signin', csrfProtection, signin);
router.post('/logout', csrfProtection, logout);
router.get('/google', googleAuth);

router.get('/google/callback', handleGoogleCallback);

router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;

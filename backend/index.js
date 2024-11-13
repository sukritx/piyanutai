const express = require("express");
const cors = require("cors");
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const connectDB = require('./config/database');
const authRouter = require('./routes/authRouter');
const userRouter = require('./routes/userRouter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const NodeCache = require("node-cache");
const chatRouter = require('./routes/chatRouter');
const finetuneRouter = require('./routes/finetuneRouter');

dotenv.config();

// Initialize NodeCache
const stateCache = new NodeCache({ stdTTL: 300 }); // Cache expires in 5 minutes

// Handling uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handling unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = express();

// Make stateCache available to all routes
app.use((req, res, next) => {
  req.stateCache = stateCache;
  
  // Only set no-cache headers for auth endpoints
  if (req.path.startsWith('/api/v1/auth/')) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  next();
});

// Database connection
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = process.env.FRONTEND_URL.split(',');

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Security middleware
app.use(helmet());
const csrfProtection = csrf({ 
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax',
        httpOnly: true
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req) => {
        return req.headers['x-csrf-token'];
    }
});
app.use(csrfProtection);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/v1/auth', authLimiter);

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/finetune', finetuneRouter);

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  res.status(403).json({ message: 'Invalid CSRF token' });
});

// General error handler
app.use(errorHandler);

// HTTPS redirect for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
    reportUri: '/api/v1/csp-report',
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: []
  },
  reportOnly: false
}));

// Add CSP violation reporting endpoint if you want to monitor violations
app.post('/api/v1/csp-report', (req, res) => {
  if (req.body) {
    logger.warn('CSP Violation:', req.body);
  }
  res.status(204).end();
});

// Add after CSRF middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.path === '/api/v1/auth/csrf-token') {
    logger.info('CSRF Token requested', {
      headers: req.headers,
      cookies: req.cookies
    });
  }
  next();
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server is listening on port ${PORT}`);
});
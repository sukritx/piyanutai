const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  // Handling specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }

  // ... other specific error handling

  // Generic error response
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
};

module.exports = errorHandler;
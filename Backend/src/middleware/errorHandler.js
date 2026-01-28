/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and logging
 */

/**
 * Custom Error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Catches all errors and sends appropriate responses
 */
export const errorHandler = (err, req, res, next) => {
  let { statusCode, message, details } = err;

  // Default to 500 if statusCode not set
  statusCode = statusCode || 500;

  // Log error details (in production, use proper logging service)
  const errorLog = {
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };

  // Log to console (in production, use Winston/Morgan/etc)
  if (process.env.NODE_ENV === "development") {
    console.error("ERROR:", errorLog);
  } else {
    // In production, only log error message and code
    console.error(`[${errorLog.timestamp}] ${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  // Don't leak error details in production
  const response = {
    success: false,
    message: process.env.NODE_ENV === "production" && statusCode === 500
      ? "An error occurred while processing your request"
      : message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details,
    }),
  };

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    404,
    `Route not found: ${req.method} ${req.originalUrl}`
  );
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: asyncHandler(async (req, res) => { ... })
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler for Mongoose
 */
export const handleValidationError = (err) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return new ApiError(400, "Validation Error", errors);
  }
  return err;
};

/**
 * MongoDB duplicate key error handler
 */
export const handleDuplicateKeyError = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return new ApiError(409, message);
  }
  return err;
};

/**
 * Cast error handler (invalid MongoDB ObjectId)
 */
export const handleCastError = (err) => {
  if (err.name === "CastError") {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }
  return err;
};

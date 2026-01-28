/**
 * Application-wide constants and configuration
 * Centralized for easy maintenance and consistency
 */

// Rate Limiting
export const RATE_LIMITS = {
  // General API (15 minutes window)
  API_WINDOW_MS: 15 * 60 * 1000,
  API_MAX_REQUESTS_PROD: 100,
  API_MAX_REQUESTS_DEV: 1000,

  // Auth endpoints (stricter)
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_ATTEMPTS_PROD: 5,
  AUTH_MAX_ATTEMPTS_DEV: 50,

  // Uploads
  UPLOAD_WINDOW_MS: 15 * 60 * 1000,
  UPLOAD_MAX_REQUESTS_PROD: 20,
  UPLOAD_MAX_REQUESTS_DEV: 200,
};

// Message Limits
export const MESSAGE_LIMITS = {
  MAX_TEXT_LENGTH: 5000,
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  PAGINATION_DEFAULT_LIMIT: 50,
  BATCH_DELETE_MAX: 100,
};

// Timeouts (seconds)
export const TIMEOUTS = {
  DEFAULT_REQUEST: 30,
  IMAGE_UPLOAD: 60,
  AUTH_REQUEST: 10,
};

// JWT
export const JWT_CONFIG = {
  EXPIRY: '7d',
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// Security
export const SECURITY = {
  MIN_PASSWORD_LENGTH: 6,
  JWT_SECRET_MIN_LENGTH: 32,
  BCRYPT_ROUNDS: 10,
};

// Socket.io events
export const SOCKET_EVENTS = {
  NEW_MESSAGE: 'newMessage',
  USER_TYPING: 'userTyping',
  USER_STOPPED_TYPING: 'userStoppedTyping',
  MESSAGE_DELETED: 'messageDeleted',
  MESSAGES_READ: 'messagesRead',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
};

export default {
  RATE_LIMITS,
  MESSAGE_LIMITS,
  TIMEOUTS,
  JWT_CONFIG,
  SECURITY,
  SOCKET_EVENTS,
};

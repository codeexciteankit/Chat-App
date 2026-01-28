/**
 * Application Configuration Constants
 * Centralized configuration for consistency across the app
 */

// UI Constants
export const APP_CONFIG = {
  // Assets
  DEFAULT_AVATAR: "/avatar.png",

  // File Limits
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_MESSAGE_LENGTH: 5000,
  MAX_BIO_LENGTH: 500,
  MAX_NAME_LENGTH: 50,

  // Timing (milliseconds)
  TYPING_TIMEOUT: 1000, // 1 second
  MESSAGE_RETRY_DELAY: 3000, // 3 seconds
  DEBOUNCE_DELAY: 500, // 500ms
  TOAST_DURATION: 3000, // 3 seconds

  // Socket
  SOCKET_URL:
    import.meta.env.VITE_SOCKET_URL || "http://localhost:5001",

  // API
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",

  // Pagination
  MESSAGES_PER_PAGE: 50,
  USERS_PER_PAGE: 20,
};

// Error Messages
export const ERROR_MESSAGES = {
  // User/Auth Errors
  NO_USER_SELECTED: "No user selected",
  EMAIL_REQUIRED: "Email is required",
  PASSWORD_REQUIRED: "Password is required",
  NAME_REQUIRED: "Name is required",
  INVALID_CREDENTIALS: "Invalid email or password",

  // Message Errors
  EMPTY_MESSAGE: "Please enter a message or select an image",
  MESSAGE_TOO_LONG: `Message cannot exceed ${APP_CONFIG.MAX_MESSAGE_LENGTH} characters`,

  // Image Errors
  IMAGE_TOO_LARGE: `Image size must be less than ${APP_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
  INVALID_IMAGE: "Please select a valid image file",
  IMAGE_READ_FAILED: "Failed to read image file",
  IMAGE_UPLOAD_FAILED: "Failed to upload image. Please try again.",

  // Network Errors
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  REQUEST_TIMEOUT: "Request timed out. Please try again.",
  TOO_MANY_REQUESTS: "Too many requests. Please slow down.",

  // Generic
  UNKNOWN_ERROR: "An unexpected error occurred",
  TRY_AGAIN: "Please try again",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Signed in successfully",
  SIGNUP_SUCCESS: "Account created successfully!",
  LOGOUT_SUCCESS: "Logged out successfully",
  PROFILE_UPDATED: "Profile updated successfully!",
  MESSAGE_SENT: "Message sent!",
  IMAGE_UPLOADED: "Image uploaded successfully",
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-()]{10,}$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
};

// File Types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Local Storage Keys
export const STORAGE_KEYS = {
  USER: "user",
  THEME: "theme",
  REMEMBER_ME: "rememberMe",
};

// Route Paths
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  PROFILE: "/profile",
  SETTINGS: "/settings",
};

// Toast Configuration
export const TOAST_CONFIG = {
  position: "top-center",
  duration: APP_CONFIG.TOAST_DURATION,
  style: {
    background: "var(--base-100)",
    color: "var(--base-content)",
  },
  success: {
    style: {
      background: "var(--success)",
      color: "var(--success-content)",
    },
  },
  error: {
    style: {
      background: "var(--error)",
      color: "var(--error-content)",
    },
  },
};

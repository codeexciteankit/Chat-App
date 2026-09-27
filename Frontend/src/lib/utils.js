import { ALLOWED_IMAGE_TYPES, APP_CONFIG, VALIDATION } from "../constants/config";

/**
 * Format message time (HH:MM)
 */
export const formatMessageTime = (date) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Format message date (MMM DD, YYYY)
 */
export const formatMessageDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Debounce function - delays execution until after wait time has elapsed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = APP_CONFIG.DEBOUNCE_DELAY) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function - ensures function is called at most once per specified time
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 1000) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  return VALIDATION.EMAIL_REGEX.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  return !phone || VALIDATION.PHONE_REGEX.test(phone);
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export const validateImage = (file) => {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Please select an image." };
  }

  if (file.size > APP_CONFIG.MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image size must be less than ${APP_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
};

/**
 * Generate a unique ID (simple UUID v4)
 * @returns {string} Unique ID
 */
export const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Format file size to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

/**
 * Sanitize text to prevent XSS attacks
 * Escapes HTML entities to prevent script injection
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
  if (!text) return text;
  
  // Remove inline event handlers (e.g. onclick="...") and javascript: URLs
  const cleaned = text
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '');

  const div = document.createElement('div');
  div.textContent = cleaned;
  return div.innerHTML;
};

/**
 * Safe HTML display (use this in dangerouslySetInnerHTML)
 * @param {string} html - HTML content to display
 * @returns {object} Object with __html property
 */
export const createSafeHTML = (html) => {
  // Simple sanitization: removes script tags and event handlers
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
  
  return { __html: sanitized };
};


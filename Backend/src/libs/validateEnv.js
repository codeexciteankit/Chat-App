/**
 * Environment Variable Validation
 * Ensures all required environment variables are set
 */

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  NODE_ENV: "development",
  PORT: "5001",
  FRONTEND_URL: "http://localhost:5173",
};

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
export const validateEnv = () => {
  const missing = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n  - ${missing.join("\n  - ")}\n\n` +
        `Please set these variables in your .env file.`
    );
  }

  // Set defaults for optional variables
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      console.log(`ℹ️  Using default for ${varName}: ${defaultValue}`);
    }
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  WARNING: JWT_SECRET should be at least 32 characters long for production!");
  }

  // Validate MongoDB URI format
  if (!process.env.MONGODB_URI.startsWith("mongodb")) {
    throw new Error("❌ MONGODB_URI must be a valid MongoDB connection string");
  }

  console.log("✅ Environment variables validated successfully");
  console.log(`📝 Running in ${process.env.NODE_ENV} mode`);
};

/**
 * Get environment variable with type safety
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value
 */
export const getEnv = (key, defaultValue = "") => {
  return process.env[key] || defaultValue;
};

/**
 * Check if running in production
 * @returns {boolean} True if in production
 */
export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};

/**
 * Check if running in development
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === "development";
};

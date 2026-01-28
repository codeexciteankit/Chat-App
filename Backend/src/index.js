import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { connectDB } from "./libs/db.js";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import { initSocket } from "./libs/socket.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import { validateEnv } from "./libs/validateEnv.js";
import path from "path";
import { fileURLToPath } from "url";
import { requestTimeout } from "./middleware/timeout.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validate environment variables before starting
validateEnv();

const app = express();
const server = http.createServer(app);

// Use PORT from env or 5001
const PORT = process.env.PORT || 5001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Security headers
app.use(helmet());

// General API rate limiter
// Development: 1000 requests / 15 min (very lenient)
// Production: 100 requests / 15 min (strict)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000, // Much higher limit in dev
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !IS_PRODUCTION, // Disable in development if you want
});

// Strict rate limiter for auth endpoints
// Development: 50 attempts / 15 min (lenient for testing)
// Production: 5 attempts / 15 min (strict for security)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 5 : 50, // 10x more attempts in dev
  skipSuccessfulRequests: true, // Don't count successful logins
  message: IS_PRODUCTION
    ? "Too many authentication attempts, please try again later."
    : "Too many authentication attempts (dev mode - limit is higher). Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for uploads/messages
// Development: 200 uploads / 15 min (lenient)
// Production: 20 uploads / 15 min (strict)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 20 : 200, // 10x more uploads in dev
  message: "Too many uploads, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Global timeout (30 seconds)
app.use(requestTimeout(30));

// Health check endpoint (no rate limit)
app.get("/", (req, res) => res.json({ status: "OK", message: "API running" }));
app.get("/health", (req, res) =>
  res.json({ status: "healthy", timestamp: new Date().toISOString() })
);

// Apply rate limiters
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/messages", uploadLimiter, messageRoutes);

// Initialize Socket.io
initSocket(server);

// Deployment Configuration (Serve Frontend)
if (IS_PRODUCTION) {
  // Serve static files from frontend build
  const frontendPath = path.join(__dirname, "../../Frontend/dist");
  app.use(express.static(frontendPath));

  // Handle SPA routing (fallback to index.html)
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(frontendPath, "index.html"));
  });
}

// 404 Handler (only if not in production or route not found above)
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  connectDB();
});

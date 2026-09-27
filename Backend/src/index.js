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
import friendRoutes from "./routes/friends.routes.js";
import blockRoutes from "./routes/block.routes.js";
import { initSocket } from "./libs/socket.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
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
// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "res.cloudinary.com",
          "cdn.jsdelivr.net",
        ], // Allow images from Cloudinary & Emojis
        connectSrc: [
          "'self'",
          "http://localhost:*",
          "ws://localhost:*",
          "wss://*",
        ], // Allow WebSocket connections
      },
    },
  }),
);

// General API rate limiter
// Development: 1000 requests / 15 min (very lenient)
// Production: 100 requests / 15 min (strict)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: IS_PRODUCTION ? 200 : 1000,
  message: "Too many requests, please try again in a minute.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !IS_PRODUCTION,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: IS_PRODUCTION ? 10 : 50,
  skipSuccessfulRequests: true,
  message: IS_PRODUCTION
    ? "Too many attempts, please try again in a minute."
    : "Too many attempts. Please try again later.",
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
  }),
);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Global timeout (30 seconds)
app.use(requestTimeout(30));

// Health check endpoint (no rate limit)
// app.get("/", (req, res) => res.json({ status: "OK", message: "API running" }));
app.get("/health", (req, res) =>
  res.json({ status: "healthy", timestamp: new Date().toISOString() }),
);

// Apply rate limiters
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/users", blockRoutes);

// Initialize Socket.io
initSocket(server);

// Deployment Configuration (Serve Frontend)
if (IS_PRODUCTION) {
  // Serve static files from frontend build
  const frontendPath = path.join(__dirname, "../../Frontend/dist");
  app.use(express.static(frontendPath));

  // Handle SPA routing (fallback to index.html)
  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(frontendPath, "index.html"));
  });
}

// 404 Handler (only if not in production or route not found above)
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Connect to the database before accepting requests that depend on it.
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error(`❌ Server startup aborted: MongoDB is unavailable (${err.message}).`);
    console.error("👉 Please ensure MongoDB is running (e.g. run 'net start MongoDB' in an Admin terminal or verify MONGODB_URI in Backend/.env).");
    process.exitCode = 1;
  }
};

startServer();

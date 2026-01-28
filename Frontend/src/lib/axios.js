import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../Store/useAuthStore";
import { APP_CONFIG, ERROR_MESSAGES } from "../constants/config";

const API_URL = 
  import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === "production" ? "/api" : "http://localhost:5001/api");

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing token to avoid multiple parallel refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      toast.error(ERROR_MESSAGES.NETWORK_ERROR);
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle 401 - Unauthorized
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Try to check auth status
      try {
        await axiosInstance.get("/auth/checkAuth");
        processQueue(null, true);
        isRefreshing = false;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Session expired - logout
        const authStore = useAuthStore.getState();
        authStore.logout();
        localStorage.removeItem("user");
        
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);

        return Promise.reject(refreshError);
      }
    }

    // Handle 403 - Forbidden
    if (status === 403) {
      toast.error("Access denied. You don't have permission to perform this action.");
      return Promise.reject(error);
    }

    // Handle 404 - Not Found
    if (status === 404) {
      toast.error("Resource not found.");
      return Promise.reject(error);
    }

    // Handle 429 - Too Many Requests
    if (status === 429) {
      toast.error(ERROR_MESSAGES.TOO_MANY_REQUESTS);
      return Promise.reject(error);
    }

    // Handle 500 - Internal Server Error (with retry)
    if (status === 500 && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
      
      // Wait 1 second and retry once
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      try {
        return await axiosInstance(originalRequest);
      } catch (retryError) {
        toast.error(ERROR_MESSAGES.SERVER_ERROR);
        return Promise.reject(retryError);
      }
    }

    // Handle 503 - Service Unavailable
    if (status === 503) {
      toast.error("Service temporarily unavailable. Please try again later.");
      return Promise.reject(error);
    }

    // Handle timeout
    if (error.code === "ECONNABORTED") {
      toast.error(ERROR_MESSAGES.REQUEST_TIMEOUT);
      return Promise.reject(error);
    }

    // Generic error handling
    if (data?.message || data?.error) {
      // Don't show toast here - let the calling code handle it
      // This prevents duplicate toasts
      console.error("API Error:", data.message || data.error);
    }

    return Promise.reject(error);
  }
);

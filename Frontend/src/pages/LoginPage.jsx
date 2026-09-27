import { useState, useCallback, useEffect } from "react";
import { MessageSquare, Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../Store/useAuthStore";
import { API_URL, axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";
import GoogleIcon from "../components/GoogleIcon";

// Constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * AuthImagePattern - Decorative pattern on the right side of auth pages
 */
const AuthImagePattern = ({ title, subtitle }) => (
  <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-12">
    <div className="max-w-md text-center">
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-2xl bg-white/10 ${
              i % 2 === 0 ? "animate-pulse" : ""
            }`}
          />
        ))}
      </div>
      <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
      <p className="text-indigo-100 text-lg">{subtitle}</p>
    </div>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuthStore();

  // State
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [oidc, setOidc] = useState({ enabled: false, provider: "Google" });

  useEffect(() => {
    let active = true;
    axiosInstance.get("/auth/oauth/oidc/status")
      .then((response) => active && setOidc(response.data))
      .catch(() => active && setOidc({ enabled: false, provider: "Google" }));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("oauth");
    const messages = {
      cancelled: "Single sign-on was cancelled.",
      invalid_state: "Your sign-in request expired or could not be verified. Please try again.",
      account_linking_conflict: "An account with this email already exists. Sign in first to link it.",
      invalid_identity: "Your identity provider did not provide a verified email address.",
      authentication_failure: "Single sign-on could not complete. Please try again.",
    };
    if (error && messages[error]) {
      toast.error(messages[error]);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const startOidc = useCallback(() => {
    if (!oidc.enabled) {
      toast.error("Google sign-in has not been configured yet.");
      return;
    }
    const url = new URL(`${API_URL}/auth/oauth/oidc/start`, window.location.origin);
    url.searchParams.set("returnTo", "/");
    window.location.assign(url.toString());
  }, [oidc.enabled]);

  /**
   * Validate form fields
   */
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) return;

      const success = await login(formData);
      if (success) {
        navigate("/", { replace: true });
      }
    },
    [formData, validateForm, login, navigate],
  );

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors],
  );

  /**
   * Toggle password visibility
   */
  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <form
        onSubmit={handleSubmit}
        className="min-h-full flex items-center justify-center p-5 sm:p-12 bg-white dark:bg-gray-900"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-indigo-600 dark:bg-indigo-700 
                           flex items-center justify-center 
                           group-hover:bg-indigo-700 dark:group-hover:bg-indigo-600 
                           transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                Welcome Back
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to continue your conversations
              </p>
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoggingIn}
                className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           ${
                             errors.email
                               ? "border-red-500"
                               : "border-gray-300 dark:border-gray-600"
                           }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <a
                href="#"
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 
                         hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoggingIn}
                className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           ${
                             errors.password
                               ? "border-red-500"
                               : "border-gray-300 dark:border-gray-600"
                           }`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                disabled={isLoggingIn}
                className="absolute inset-y-0 right-0 pr-3 flex items-center 
                         text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 
                       dark:bg-gray-800 rounded cursor-pointer"
              disabled={isLoggingIn}
            />
            <label
              htmlFor="remember"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Remember me
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm 
                     font-semibold rounded-lg text-white bg-indigo-600 
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-gray-900 px-2 text-gray-500">or</span></div>
            </div>
            <button
              type="button"
              onClick={startOidc}
              disabled={isLoggingIn || !oidc.enabled}
              title={oidc.enabled ? "Continue with Google" : "Google sign-in needs server configuration"}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            {!oidc.enabled && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Google sign-in is unavailable until it is configured on the server.
              </p>
            )}
          </>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="font-semibold text-indigo-600 dark:text-indigo-400 
                       hover:text-indigo-500 dark:hover:text-indigo-300 
                       cursor-pointer transition-colors"
            >
              Sign Up
            </button>
          </p>
        </div>
      </form>

      {/* Right Side - Decorative Pattern */}
      <AuthImagePattern
        title="Welcome back!"
        subtitle="Sign in to continue your conversations and catch up with your messages."
      />
    </div>
  );
};

export default LoginPage;

import { useState, useCallback, useEffect } from "react";
import {
  MessageSquare,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../Store/useAuthStore";
import { API_URL, axiosInstance } from "../lib/axios";
import GoogleIcon from "../components/GoogleIcon";
import toast from "react-hot-toast";

// Constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 6;

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signUp, isSigningUp } = useAuthStore();

  // State
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
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

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.length < MIN_NAME_LENGTH) {
      newErrors.fullName = `Name must be at least ${MIN_NAME_LENGTH} characters`;
    } else if (formData.fullName.length > 100) {
      newErrors.fullName = "Name must not exceed 100 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (formData.email.length > 255) {
      newErrors.email = "Email is too long";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    } else if (formData.password.length > 128) {
      newErrors.password = "Password is too long";
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

      const success = await signUp(formData);
      if (success) {
        navigate("/", { replace: true });
      }
    },
    [formData, validateForm, signUp, navigate],
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
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900 
                           flex items-center justify-center 
                           group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 
                           transition-colors"
              >
                <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold mt-2 text-gray-800 dark:text-white">
                Create Account
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Get started with your free account
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isSigningUp}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             ${
                               errors.fullName
                                 ? "border-red-500"
                                 : "border-gray-300 dark:border-gray-600"
                             }`}
                  placeholder="John Doe"
                  autoComplete="name"
                  maxLength="100"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSigningUp}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             ${
                               errors.email
                                 ? "border-red-500"
                                 : "border-gray-300 dark:border-gray-600"
                             }`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength="255"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSigningUp}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             ${
                               errors.password
                                 ? "border-red-500"
                                 : "border-gray-300 dark:border-gray-600"
                             }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  maxLength="128"
                />
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  disabled={isSigningUp}
                  className="absolute inset-y-0 right-3 flex items-center 
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
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                At least {MIN_PASSWORD_LENGTH} characters
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSigningUp}
              className="w-full flex items-center justify-center px-4 py-3 rounded-lg 
                       text-white bg-indigo-600 hover:bg-indigo-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors font-medium"
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>

            <button
              type="button"
              onClick={startOidc}
              disabled={isSigningUp || !oidc.enabled}
              title={oidc.enabled ? "Continue with Google" : "Google sign-in needs server configuration"}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            {!oidc.enabled && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Google sign-in is unavailable until it is configured on the server.
              </p>
            )}
          </div>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-medium text-indigo-600 dark:text-indigo-400 
                         hover:text-indigo-500 dark:hover:text-indigo-300 
                         cursor-pointer transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          By signing up, you agree to our{" "}
          <a
            href="#"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 
                     dark:hover:text-indigo-300"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 
                     dark:hover:text-indigo-300"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;

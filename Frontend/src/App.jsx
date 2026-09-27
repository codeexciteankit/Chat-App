import React, { useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "lucide-react";
import { useAuthStore } from "./Store/useAuthStore";
import { useThemeStore } from "./Store/useThemeStore";
import Navbar from "./components/Navbar.jsx";
import Homepage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SettingPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { Toaster } from "react-hot-toast";

/**
 * LoadingScreen - Displays loading state during initial auth check
 */
const LoadingScreen = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-base-200">
    <div className="flex flex-col items-center gap-4">
      <Loader className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-base-content/70">Loading your account...</p>
    </div>
  </div>
);

/**
 * Route configuration - Centralized for better maintainability
 * protected: true = requires authentication
 * inverted: true = redirects to home if already logged in (auth pages)
 */
const ROUTES = [
  {
    path: "/",
    element: <Homepage />,
    protected: true,
    label: "Home",
  },
  {
    path: "/signup",
    element: <SignUpPage />,
    protected: false,
    inverted: true,
    label: "Sign Up",
  },
  {
    path: "/login",
    element: <LoginPage />,
    protected: false,
    inverted: true,
    label: "Login",
  },
  {
    path: "/settings",
    element: <SettingPage />,
    protected: true,
    label: "Settings",
  },
  {
    path: "/profile",
    element: <ProfilePage />,
    protected: true,
    label: "Profile",
  },
];

const App = () => {
  const { user, checkAuth, isCheckingAuth, restoreSession } = useAuthStore();
  const { theme } = useThemeStore();

  /**
   * Initialize authentication on app load
   * Step 1: Restore user from localStorage (instant)
   * Step 2: Verify session with backend (validation)
   */
  useEffect(() => {
    // Step 1: Restore user from localStorage immediately
    restoreSession();

    // Step 2: Verify session with backend
    checkAuth();
  }, [checkAuth, restoreSession]);

  /**
   * Memoize route rendering to prevent unnecessary recalculations
   * Routes update only when user auth state changes
   * NOTE: This must be called BEFORE any conditional returns (Rules of Hooks)
   */
  const routeElements = useMemo(
    () =>
      ROUTES.map(({ path, element, protected: isProtected, inverted }) => {
        // Protected routes - require authentication
        if (isProtected) {
          return (
            <Route
              key={path}
              path={path}
              element={user ? element : <Navigate to="/login" replace />}
            />
          );
        }

        // Auth pages - redirect to home if already logged in
        if (inverted) {
          return (
            <Route
              key={path}
              path={path}
              element={!user ? element : <Navigate to="/" replace />}
            />
          );
        }

        // Public routes
        return <Route key={path} path={path} element={element} />;
      }),
    [user],
  );

  // Show loading screen while checking auth and no user is present
  if (isCheckingAuth && !user) {
    return <LoadingScreen />;
  }

  return (
    <div
      data-theme={theme}
      className="h-dvh min-h-dvh w-full flex flex-col bg-base-200 overflow-hidden"
    >
      {/* Navbar - Fixed at top */}
      <div className="flex-shrink-0 z-40">
        <Navbar />
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Routes>{routeElements}</Routes>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
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
        }}
      />
    </div>
  );
};

export default App;

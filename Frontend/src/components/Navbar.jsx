import React, { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, LogOut, User, Settings } from "lucide-react";
import { useAuthStore } from "../Store/useAuthStore";

// Navbar link configuration
const NAV_LINKS = [
  { label: "Profile", to: "/profile", icon: User },
  { label: "Settings", to: "/settings", icon: Settings },
];

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  const renderAuthButtons = () => {
    if (!user) {
      return (
        <div className="hidden lg:flex gap-2">
          <Link to="/login" className="btn btn-ghost btn-sm">
            Login
          </Link>
          <Link to="/signup" className="btn btn-primary btn-sm">
            Sign Up
          </Link>
        </div>
      );
    }

    return (
      <>
        <div className="hidden lg:flex gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <Link key={label} to={to} className="btn btn-ghost btn-sm">
              {label}
            </Link>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-error btn-sm hidden lg:flex gap-2 hover:btn-error"
          aria-label="Logout"
        >
          <LogOut size={16} />
          Logout
        </button>
      </>
    );
  };

  const renderMobileMenu = () => {
    if (!user) {
      return (
        <>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/signup">Sign Up</Link>
          </li>
        </>
      );
    }

    return (
      <>
        <li className="menu-title">
          <span className="truncate max-w-xs">
            {user.fullname || user.email}
          </span>
        </li>

        {NAV_LINKS.map(({ label, to, icon: Icon }) => (
          <li key={label}>
            <Link to={to} className="gap-2">
              <Icon size={16} />
              {label}
            </Link>
          </li>
        ))}

        <li>
          <button onClick={handleLogout} className="text-error gap-2">
            <LogOut size={16} />
            Logout
          </button>
        </li>
      </>
    );
  };

  return (
    <nav className="navbar bg-base-100 border-b border-base-300 px-4 h-16 flex-shrink-0 shadow-sm">
      {/* Brand - Left */}
      <div className="navbar-start">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity duration-200"
        >
          ChatApp
        </Link>
      </div>

      {/* Welcome Text - Center (Desktop only) */}
      <div className="navbar-center hidden lg:flex">
        {user && (
          <span className="text-sm opacity-70 truncate max-w-xs">
            Welcome,{" "}
            <span className="font-semibold">{user.fullname || user.email}</span>
          </span>
        )}
      </div>

      {/* Auth Actions - Right */}
      <div className="navbar-end gap-2">
        {/* Desktop Navigation */}
        {renderAuthButtons()}

        {/* Mobile Menu */}
        <div className="dropdown dropdown-end lg:hidden">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-sm"
            aria-label="Open navigation menu"
            aria-haspopup="true"
          >
            <Menu size={20} />
          </button>

          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-lg w-56 z-50 border border-base-300"
          >
            {renderMobileMenu()}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

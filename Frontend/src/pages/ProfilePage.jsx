import { useAuthStore } from "../Store/useAuthStore";
import {
  User,
  Mail,
  Camera,
  Upload,
  LogOut,
  Loader2,
  Edit2,
  Check,
  X,
  Calendar,
  Download,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_NAME_LENGTH = 100;
const ACTIVITY_ITEMS = [
  { label: "Updated profile picture", timeAgo: "2 hours ago" },
  { label: "Account verified", timeAgo: "Yesterday" },
  { label: "Logged in", timeAgo: "3 days ago" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isCheckingAuth, logout, updateProfile, isUpdatingProfile, deleteAccount } =
    useAuthStore();

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.fullname || user?.name || "");
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Handle image upload with validation
   */
  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      setIsUploading(true);

      try {
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewImage(e.target?.result);
        };
        reader.readAsDataURL(file);

        // Convert to base64 for backend upload
        const base64Reader = new FileReader();
        base64Reader.onload = async (e) => {
          try {
            const base64 = e.target.result;
            await updateProfile({ profilePic: base64 });
            setPreviewImage(null);
            toast.success("Profile picture updated successfully!");
          } catch (error) {
            console.error("Upload failed:", error);
            setPreviewImage(null);
          }
        };
        base64Reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
      }
    },
    [updateProfile],
  );

  /**
   * Handle profile save
   */
  const handleSaveProfile = useCallback(async () => {
    const currentName = user?.fullname || user?.name || "";
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      toast.error(`Name must not exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }

    if (trimmedName !== currentName) {
      await updateProfile({ fullname: trimmedName });
    }

    setIsEditing(false);
  }, [name, user, updateProfile]);

  /**
   * Handle edit cancel
   */
  const handleCancelEdit = useCallback(() => {
    setName(user?.fullname || user?.name || "");
    setIsEditing(false);
  }, [user]);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  /**
   * Handle download data
   */
  const handleDownloadData = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/download-data", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download data");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `my-data-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Data downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download data");
    }
  }, []);

  /**
   * Handle delete account
   */
  const handleDeleteAccount = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      const success = await deleteAccount();
      if (success) navigate("/login", { replace: true });
    }
  }, [deleteAccount, navigate]);

  /**
   * Trigger file input
   */
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          Loading your profile...
        </p>
      </div>
    );
  }

  // Not logged in - redirect
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const displayName = user.fullname || user.name || "User";
  const memberSince = user.createdAt?.split("T")[0] || "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Profile Info */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white/30 
                             shadow-xl overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 
                             flex items-center justify-center"
                >
                  {previewImage || user.profilePic || user.profileImage ? (
                    <img
                      src={previewImage || user.profilePic || user.profileImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-white text-4xl font-bold">
                      {displayName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Upload Overlay */}
                <div
                  onClick={triggerFileInput}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </div>

                {/* Upload Badge */}
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                  <Upload className="h-4 w-4" />
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                  aria-label="Upload profile picture"
                />
              </div>

              {/* Name and Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={MAX_NAME_LENGTH}
                      className="text-2xl md:text-3xl font-bold bg-transparent text-white 
                               border-b border-white/50 focus:outline-none focus:border-white 
                               focus:ring-2 focus:ring-white/30"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveProfile}
                      disabled={isUpdatingProfile}
                      className="p-1 rounded-full bg-green-500 hover:bg-green-600 transition-colors 
                               disabled:opacity-50"
                      aria-label="Save name"
                    >
                      <Check className="h-4 w-4 text-white" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                      aria-label="Cancel edit"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {displayName}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      aria-label="Edit name"
                    >
                      <Edit2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                )}
                <p className="text-indigo-100 mt-1">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-3 py-1 bg-white/20 rounded-full text-xs text-white">
                    {user.role || "Member"}
                  </div>
                  <div className="px-3 py-1 bg-emerald-500/20 rounded-full text-xs text-emerald-100">
                    Verified
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 
                       bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Personal Information
              </h2>

              <div className="space-y-6">
                {/* Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Full Name
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-800 dark:text-gray-200">
                        {displayName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-800 dark:text-gray-200">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Member Since
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-800 dark:text-gray-200">
                        {memberSince}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">
              Recent Activity
            </h3>

            <div className="space-y-4">
              {ACTIVITY_ITEMS.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="h-2 w-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:justify-end">
          <button
            onClick={handleDownloadData}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 
                     text-gray-700 dark:text-gray-300 rounded-lg 
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors 
                     flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Data
          </button>

          <button
            onClick={handleDeleteAccount}
            className="px-6 py-2 border border-red-300 dark:border-red-600 
                     text-red-600 dark:text-red-400 rounded-lg 
                     hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors 
                     flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

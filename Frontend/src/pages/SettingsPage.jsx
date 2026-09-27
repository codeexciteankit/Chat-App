import { THEMES } from "../constants";
import { useThemeStore } from "../Store/useThemeStore";
import { useAuthStore } from "../Store/useAuthStore";
import {
  Send,
  Bell,
  Shield,
  User,
  Moon,
  Sun,
  Trash2,
  Download,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  {
    id: 2,
    content: "I'm doing great! Just working on some new features.",
    isSent: true,
  },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, deleteAccount } = useAuthStore();
  const [notifications, setNotifications] = useState({
    message: true,
    sound: true,
    desktop: false,
  });
  const [privacy, setPrivacy] = useState({
    showOnline: true,
    readReceipts: true,
  });

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      await deleteAccount();
      // Store handles redirect/state update, but we are inside the app, so the app will naturally redirect due to state change
    }
  };

  const handleDownloadData = () => {
    // Implement download data logic
    toast.success("Data download not implemented yet");
  };

  return (
    <div className="min-h-full bg-base-200 p-3 sm:p-4 md:p-6 overflow-y-auto" data-theme={theme}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content">Settings</h1>
          <p className="text-base-content/70 mt-2">
            Customize your chat experience
          </p>
        </div>

        {/* Theme Section */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            {theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <h2 className="text-xl font-semibold">Theme</h2>
          </div>
          <p className="text-sm text-base-content/70 mb-4">
            Choose a theme for your chat interface
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`
                  group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                  ${theme === t ? "bg-primary text-primary-content" : "hover:bg-base-200"}
                `}
                onClick={() => setTheme(t)}
              >
                <div
                  className="relative h-8 w-full rounded-md overflow-hidden border"
                  data-theme={t}
                >
                  <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                    <div className="rounded bg-primary"></div>
                    <div className="rounded bg-secondary"></div>
                    <div className="rounded bg-accent"></div>
                    <div className="rounded bg-neutral"></div>
                  </div>
                </div>
                <span className="text-[11px] font-medium truncate w-full text-center">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </button>
            ))}
          </div>

          {/* Preview Section */}
          <h3 className="text-lg font-semibold mb-3">Preview</h3>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
            <div className="p-4 bg-base-200">
              <div className="max-w-lg mx-auto">
                {/* Mock Chat UI */}
                <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                        J
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">John Doe</h3>
                        <p className="text-xs text-base-content/70">Online</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                    {PREVIEW_MESSAGES.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`
                            max-w-[80%] rounded-xl p-3 shadow-sm
                            ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                          `}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-[10px] mt-1.5 ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}`}
                          >
                            12:00 PM
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-base-300 bg-base-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered flex-1 text-sm h-10"
                        placeholder="Type a message..."
                        value="This is a preview"
                        readOnly
                      />
                      <button className="btn btn-primary h-10 min-h-0">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">Message Notifications</p>
                <p className="text-sm text-base-content/70">
                  Get notified when you receive new messages
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={notifications.message}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    message: e.target.checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">Sound Notifications</p>
                <p className="text-sm text-base-content/70">
                  Play sound for new messages
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={notifications.sound}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    sound: e.target.checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">Desktop Notifications</p>
                <p className="text-sm text-base-content/70">
                  Show desktop notifications
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={notifications.desktop}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    desktop: e.target.checked,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Privacy</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">Show Online Status</p>
                <p className="text-sm text-base-content/70">
                  Let others see when you're online
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={privacy.showOnline}
                onChange={(e) =>
                  setPrivacy((prev) => ({
                    ...prev,
                    showOnline: e.target.checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">Read Receipts</p>
                <p className="text-sm text-base-content/70">
                  Show when messages are read
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={privacy.readReceipts}
                onChange={(e) =>
                  setPrivacy((prev) => ({
                    ...prev,
                    readReceipts: e.target.checked,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Account</h2>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-base-300 rounded-lg">
              <div className="min-w-0">
                <p className="font-medium">Email</p>
                <p className="text-sm text-base-content/70">{user?.email}</p>
              </div>
              <button className="btn btn-outline btn-sm">Change Email</button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-base-300 rounded-lg">
              <div className="min-w-0">
                <p className="font-medium">Password</p>
                <p className="text-sm text-base-content/70">
                  Last changed 30 days ago
                </p>
              </div>
              <button className="btn btn-outline btn-sm">
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-4 sm:p-6 border border-error/20">
          <h2 className="text-xl font-semibold text-error mb-4">Danger Zone</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-base-300 rounded-lg">
              <div className="min-w-0">
                <p className="font-medium">Download Your Data</p>
                <p className="text-sm text-base-content/70">
                  Download a copy of your data
                </p>
              </div>
              <button
                onClick={handleDownloadData}
                className="btn btn-outline btn-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-error rounded-lg">
              <div className="min-w-0">
                <p className="font-medium text-error">Delete Account</p>
                <p className="text-sm text-base-content/70">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-error btn-sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

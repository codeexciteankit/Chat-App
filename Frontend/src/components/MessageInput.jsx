import React, { useRef, useState, useCallback } from "react";
import { useChatStore } from "../Store/useChatStore";
import { Image, Send, X, Smile } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { validateImage } from "../lib/utils";
import { APP_CONFIG, ERROR_MESSAGES } from "../constants/config";

// Constants
const TYPING_TIMEOUT = APP_CONFIG.TYPING_TIMEOUT;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, startTyping, stopTyping, selectedUser } = useChatStore();

  // Validate and process image
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use validation utility
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.onerror = () => {
      toast.error(ERROR_MESSAGES.IMAGE_READ_FAILED);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle emoji selection
  const handleEmojiClick = useCallback((emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  }, []);

  // Remove image preview
  const removeImage = useCallback(() => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Handle text input and typing indicator
  const handleInputChange = useCallback(
    (e) => {
      const newText = e.target.value;
      setText(newText);

      // Only emit typing indicator if a user is selected
      if (!selectedUser) return;

      // Trigger typing indicator
      startTyping();

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, TYPING_TIMEOUT);
    },
    [startTyping, stopTyping, selectedUser],
  );

  // Send message
  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();

      const trimmedText = text.trim();
      if (!trimmedText && !imagePreview) {
        toast.error("Please enter a message or select an image");
        return;
      }

      setIsSending(true);
      try {
        await sendMessage({
          text: trimmedText,
          image: imagePreview,
        });

        // Clear form on success
        setText("");
        setImagePreview(null);
        setShowEmojiPicker(false);
        stopTyping();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        // Error toast is already shown by useChatStore
      } finally {
        setIsSending(false);
      }
    },
    [text, imagePreview, sendMessage, stopTyping],
  );

  return (
    <div className="relative p-2 sm:p-4 w-full bg-base-100">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border-2 border-base-300"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/80 transition-colors"
              type="button"
              aria-label="Remove image"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-2 sm:left-4 mb-2 z-40 w-[calc(100vw-1rem)] max-w-sm overflow-hidden shadow-2xl rounded-xl">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="auto"
            searchDisabled={false}
            skinTonesDisabled
            height={350}
            width="100%"
          />
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-end gap-1 sm:gap-2"
      >
        {/* Text Input + Action Buttons */}
        <div className="min-w-0 flex-1 flex gap-1 sm:gap-2">
          <input
            type="text"
            className="min-w-0 flex-1 input input-bordered rounded-lg input-sm sm:input-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type a message..."
            value={text}
            onChange={handleInputChange}
            onFocus={() => setShowEmojiPicker(false)}
            disabled={isSending}
            maxLength={5000}
          />

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
            disabled={isSending}
          />

          {/* Emoji Button */}
          <button
            type="button"
            className={`flex shrink-0 btn btn-circle btn-sm transition-colors ${
              showEmojiPicker ? "bg-primary text-white" : "btn-ghost"
            }`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={isSending}
            aria-label="Toggle emoji picker"
          >
            <Smile size={20} />
          </button>

          {/* Image Button */}
          <button
            type="button"
            className={`flex shrink-0 btn btn-circle btn-sm transition-colors ${
              imagePreview ? "bg-primary text-white" : "btn-ghost"
            }`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            aria-label="Add image"
          >
            <Image size={20} />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className="shrink-0 btn btn-sm btn-circle btn-primary"
          disabled={(!text.trim() && !imagePreview) || isSending}
          aria-label="Send message"
        >
          {isSending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>

      {/* Character count */}
      {text.length > 4500 && (
        <p className="text-xs text-warning mt-2">
          {text.length}/5000 characters
        </p>
      )}
    </div>
  );
};

export default MessageInput;

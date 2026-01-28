import { create } from "zustand";
import { THEMES } from "../constants";

export const useThemeStore = create((set, get) => ({
  theme: (() => {
    const stored = localStorage.getItem("chat-theme") || "coffee";
    document.documentElement.setAttribute("data-theme", stored);
    return stored;
  })(),

  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
  },
}));

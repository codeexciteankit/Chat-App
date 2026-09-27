import { create } from "zustand";

export const themes = [
  "light",
  "dark",
  "cupcake",
  "retro",
  "valentine",
  "aqua",
  "cyberpunk",
  "dracula",
  "night",
  "business",
  "coffee",
  "dim",
  "nord",
  "sunset",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "halloween",
  "garden",
  "forest",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "cmyk",
  "autumn",
  "acid",
  "lemonade",
  "winter",
];

export const useTheme = create((set) => ({
  currentTheme: (() => {
    const stored = localStorage.getItem("theme") || "light";
    // Apply initial theme
    document.body.setAttribute("data-theme", stored);
    return stored;
  })(),

  isDarkMode: (() => {
    const stored = localStorage.getItem("isDarkMode") === "true";
    // Apply initial dark mode
    if (stored) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return stored;
  })(),

  toggleTheme: () => {
    set((state) => {
      const currentIndex = themes.indexOf(state.currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      const newTheme = themes[nextIndex];
      console.log("Switching to theme:", newTheme);
      localStorage.setItem("theme", newTheme);

      // Update data-theme attribute for DaisyUI
      document.body.setAttribute("data-theme", newTheme);

      return { currentTheme: newTheme };
    });
  },

  setTheme: (themeName) => {
    if (!themes.includes(themeName)) {
      console.warn("Invalid theme:", themeName);
      return;
    }
    console.log("Setting theme to:", themeName);
    localStorage.setItem("theme", themeName);

    // Update data-theme attribute for DaisyUI
    document.body.setAttribute("data-theme", themeName);

    set({ currentTheme: themeName });
  },

  toggleDarkMode: () => {
    set((state) => {
      const newDarkMode = !state.isDarkMode;
      console.log("Toggling dark mode:", newDarkMode);
      localStorage.setItem("isDarkMode", newDarkMode ? "true" : "false");

      // Update document class for Tailwind dark mode
      if (newDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      return { isDarkMode: newDarkMode };
    });
  },

  initTheme: () => {
    const storedTheme = localStorage.getItem("theme") || "light";
    const storedDarkMode = localStorage.getItem("isDarkMode") === "true";

    console.log(
      "Initializing theme:",
      storedTheme,
      "dark mode:",
      storedDarkMode,
    );
    set({ currentTheme: storedTheme, isDarkMode: storedDarkMode });

    document.body.setAttribute("data-theme", storedTheme);

    if (storedDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },
}));

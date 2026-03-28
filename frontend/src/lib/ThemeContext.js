"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌑",
    description: "Default dark blue",
    preview: ["#0a0d12", "#111520", "#3b82f6"],
  },
  {
    id: "neon",
    name: "Neon Pulse",
    emoji: "⚡",
    description: "Cyberpunk green",
    preview: ["#050810", "#0b0f1a", "#00ff88"],
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    description: "Deep teal & cyan",
    preview: ["#040f18", "#071825", "#06b6d4"],
  },
  {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    description: "Warm orange & rose",
    preview: ["#12050a", "#1e0810", "#f97316"],
  },
  {
    id: "light",
    name: "Ivory",
    emoji: "☀️",
    description: "Clean light mode",
    preview: ["#f8f9fc", "#ffffff", "#3b82f6"],
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌿",
    description: "Earthy dark green",
    preview: ["#060d08", "#0a1510", "#4ade80"],
  },
  {
    id: "royal",
    name: "Royal",
    emoji: "👑",
    description: "Deep purple",
    preview: ["#07040f", "#100820", "#a855f7"],
  },
  {
    id: "slate",
    name: "Slate",
    emoji: "🪨",
    description: "Neutral monochrome",
    preview: ["#0d0d0f", "#161618", "#71717a"],
  },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("midnight");

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("classroom-theme") || "midnight";
    applyTheme(saved);
    setThemeState(saved);
  }, []);

  function applyTheme(id) {
    const validId = THEMES.find((t) => t.id === id) ? id : "midnight";
    // "midnight" is the default :root, so no attribute needed
    if (validId === "midnight") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", validId);
    }
  }

  function setTheme(id) {
    applyTheme(id);
    setThemeState(id);
    localStorage.setItem("classroom-theme", id);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "gold" | "flag";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "gold",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("gold");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "flag" || stored === "gold") apply(stored);
  }, []);

  function apply(t: Theme) {
    setThemeState(t);
    localStorage.setItem("theme", t);
    if (t === "flag") {
      document.documentElement.setAttribute("data-theme", "flag");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

"use client";

import { useTheme } from "@/contexts/ThemeContext";
import styles from "./LanguageSwitcher.module.css";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.switcher}>
      <button
        className={`${styles.langBtn} ${theme === "gold" ? styles.active : ""}`}
        onClick={() => setTheme("gold")}
        title="Gold theme"
        aria-label="Gold theme"
      >
        <span className={styles.flag}>✨</span>
      </button>
      <button
        className={`${styles.langBtn} ${theme === "flag" ? styles.active : ""}`}
        onClick={() => setTheme("flag")}
        title="American flag theme"
        aria-label="American flag theme"
      >
        <span className={styles.flag}>🇺🇸</span>
      </button>
    </div>
  );
}

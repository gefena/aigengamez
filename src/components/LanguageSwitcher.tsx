"use client";

import { useLanguage, type Language } from "@/contexts/LanguageContext";
import styles from "./LanguageSwitcher.module.css";

const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: "en", flag: "🇺🇸", label: "EN" },
  { code: "he", flag: "🇮🇱", label: "HE" },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className={styles.switcher}>
      {LANGS.map(({ code, flag, label }) => (
        <button
          key={code}
          className={`${styles.langBtn} ${lang === code ? styles.active : ""}`}
          onClick={() => setLang(code)}
          aria-label={`Switch to ${label}`}
          title={label}
        >
          <span className={styles.flag}>{flag}</span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}

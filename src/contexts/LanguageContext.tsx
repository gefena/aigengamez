"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { en, type Translations } from "@/i18n/en";
import { he } from "@/i18n/he";

export type Language = "en" | "he";

const translations: Record<Language, Translations> = { en, he };

interface LanguageContextValue {
  lang: Language;
  t: Translations;
  setLang: (l: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  t: en,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Language | null;
    if (stored === "he" || stored === "en") apply(stored);
  }, []);

  function apply(l: Language) {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "he" ? "rtl" : "ltr";
  }

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang: apply }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

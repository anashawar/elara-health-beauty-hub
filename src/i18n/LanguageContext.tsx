import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en } from "./translations/en";
import { ar } from "./translations/ar";
import { ku } from "./translations/ku";

export type Language = "en" | "ar" | "ku";

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

const translations = { en, ar, ku };

// RTL languages
const rtlLanguages: Language[] = ["ar", "ku"];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("elara-language");
    return (saved as Language) || "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("elara-language", lang);
  }, []);

  const isRTL = rtlLanguages.includes(language);
  const dir = isRTL ? "rtl" : "ltr";

  // Apply dir and lang to HTML element
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language === "ku" ? "ckb" : language;
  }, [dir, language, isRTL]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations[language], key);
      // Fallback to English
      if (value === key) {
        value = getNestedValue(translations.en, key);
      }
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{{${k}}}`, String(v));
        });
      }
      return value;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

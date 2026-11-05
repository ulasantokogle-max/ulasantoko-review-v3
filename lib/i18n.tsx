"use client";

import { translateInterface } from "./translations";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "id" | "en";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  tr: (idText: string, enText?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, initialLanguage }: {
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage ?? "id");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("reputasipro-language");
    } catch {
      // Cookie-based language selection also works when local storage is unavailable.
    }
    const next: AppLanguage = initialLanguage ?? (saved === "en" ? "en" : "id");
    setLanguageState(next);
    persistLanguage(next);
  }, [initialLanguage]);

  function persistLanguage(next: AppLanguage) {
    try {
      window.localStorage.setItem("reputasipro-language", next);
    } catch {
      // Keep the cookie and current page in sync without requiring local storage.
    }
    document.cookie = "reputasipro-language=" + next + "; path=/; max-age=31536000; samesite=lax";
    document.documentElement.lang = next;
  }

  function setLanguage(next: AppLanguage) {
    setLanguageState(next);
    persistLanguage(next);
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      tr: (idText: string, enText?: string) =>
        language === "en" ? (enText ?? translateInterface(idText, language)) : translateInterface(idText, language),
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return value;
}

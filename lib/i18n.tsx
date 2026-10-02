"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "id" | "en";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  tr: (idText: string, enText: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("id");

  useEffect(() => {
    const saved = window.localStorage.getItem("reputasipro-language");
    const next: AppLanguage = saved === "en" ? "en" : "id";
    setLanguageState(next);
    document.documentElement.lang = next;
  }, []);

  function setLanguage(next: AppLanguage) {
    setLanguageState(next);
    window.localStorage.setItem("reputasipro-language", next);
    document.documentElement.lang = next;
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      tr: (idText: string, enText: string) =>
        language === "en" ? enText : idText,
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

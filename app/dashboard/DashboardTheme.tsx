"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "../../lib/i18n";

export type DashboardThemeKey = "modern" | "smoothie" | "ocean";
export function validDashboardTheme(value: unknown): DashboardThemeKey {
  return value === "smoothie" || value === "ocean" ? value : "modern";
}
const ThemeContext = createContext<{ theme: DashboardThemeKey; change: (value: DashboardThemeKey) => void } | null>(null);

export function DashboardThemeShell({ children, initialTheme }: { children: ReactNode; initialTheme?: DashboardThemeKey }) {
  const [theme, setTheme] = useState<DashboardThemeKey>(initialTheme ?? "modern");
  function persist(value: DashboardThemeKey) {
    try { window.localStorage.setItem("reputasipro-dashboard-theme", value); } catch {}
    document.cookie = `reputasipro-dashboard-theme=${value}; path=/; max-age=31536000; samesite=lax`;
  }
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem("reputasipro-dashboard-theme"); } catch {}
    const next = initialTheme ?? validDashboardTheme(saved);
    setTheme(next); persist(next);
  }, [initialTheme]);
  function change(value: DashboardThemeKey) {
    const next = validDashboardTheme(value);
    setTheme(next); persist(next);
  }
  return <ThemeContext.Provider value={{ theme, change }}><div className="dashboard-shell" data-dashboard-theme={theme}>{children}</div></ThemeContext.Provider>;
}

export function DashboardThemePicker() {
  const context = useContext(ThemeContext);
  const { tr } = useLanguage();
  if (!context) return null;
  return <label className="dashboard-theme-picker">
    <span>{tr("Tema Dashboard", "Dashboard Theme")}</span>
    <select value={context.theme} onChange={event => context.change(validDashboardTheme(event.target.value))}>
      <option value="modern">{tr("Modern · bersih", "Modern · clean")}</option>
      <option value="smoothie">{tr("Smoothie · krem hangat", "Smoothie · warm cream")}</option>
      <option value="ocean">{tr("Ocean · mint segar", "Ocean · fresh mint")}</option>
    </select>
  </label>;
}

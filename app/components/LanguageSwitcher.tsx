"use client";

import { useLanguage } from "../../lib/i18n";
import { useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const { language, setLanguage, tr } = useLanguage();
  const router = useRouter();

  return (
    <div
      aria-label={tr("Pilih bahasa", "Choose language")}
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        boxShadow: "0 6px 18px rgba(15,23,42,.06)",
      }}
    >
      {([
        ["id", "ID"],
        ["en", "EN"],
      ] as const).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => { setLanguage(key); router.refresh(); }}
          aria-pressed={language === key}
          title={key === "id" ? "Bahasa Indonesia" : "English"}
          style={{
            border: 0,
            borderRadius: 7,
            padding: "7px 10px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 900,
            background: language === key ? "#111827" : "transparent",
            color: language === key ? "#ffffff" : "#4b5563",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

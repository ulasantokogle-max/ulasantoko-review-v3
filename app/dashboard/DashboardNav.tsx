"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

export default function DashboardNav() {
  const { tr } = useLanguage();
  const items = [
    {
      href: "/dashboard",
      label: tr("Ringkasan", "Overview"),
      description: tr("Ringkasan bisnis & pengaturan", "Business & setup summary"),
    },
    {
      href: "/dashboard/cards",
      label: tr("Kartu & QR/NFC", "Cards & QR/NFC"),
      description: tr("Kelola kartu, status & area", "Manage cards, status & area"),
    },
    {
      href: "/dashboard/landing-page",
      label: tr("Halaman Publik", "Public Page"),
      description: tr("Tampilan, ulasan, kontak & konten", "Design, reviews, contact & content"),
    },
    {
      href: "/dashboard/feedback",
      label: tr("Masukan", "Feedback"),
      description: tr("Kelola masukan pelanggan 1–3 bintang", "Manage 1–3 star customer feedback"),
    },
    {
      href: "/dashboard/analytics",
      label: tr("Analitik", "Analytics"),
      description: tr("Wawasan masukan, ulasan & kartu", "Insights for feedback, reviews & cards"),
    },
  ];
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setIsAuthenticated(Boolean(data.session));
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setLoggingOut(false);
    router.replace("/dashboard");
    router.refresh();
  }

  if (!authChecked || !isAuthenticated) {
    return null;
  }

  return (
    <nav className="dashboard-nav" style={{ display: "grid", gap: 8 }}>
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              display: "block",
              textDecoration: "none",
              padding: "12px 13px",
              borderRadius: 12,
              border: active ? "1px solid #111827" : "1px solid transparent",
              background: active ? "#111827" : "transparent",
              color: active ? "#ffffff" : "#111827",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>{item.label}</div>
            <div
              style={{
                marginTop: 3,
                fontSize: 12,
                lineHeight: 1.4,
                color: active ? "#d1d5db" : "#6b7280",
              }}
            >
              {item.description}
            </div>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          marginTop: 10,
          width: "100%",
          textAlign: "left",
          padding: "12px 13px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          color: "#991b1b",
          cursor: loggingOut ? "wait" : "pointer",
          fontSize: 14,
          fontWeight: 900,
        }}
      >
        {loggingOut ? tr("Keluar...", "Signing out...") : tr("Keluar", "Sign out")}
        <div
          style={{
            marginTop: 3,
            fontSize: 12,
            lineHeight: 1.4,
            color: "#6b7280",
            fontWeight: 500,
          }}
        >
          {tr("Keluar dari akun", "Sign out of account")}
        </div>
      </button>
    </nav>
  );
}

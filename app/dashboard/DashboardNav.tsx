"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const items = [
  {
    href: "/dashboard",
    label: "Ringkasan",
    description: "Ringkasan bisnis & setup",
  },
  {
    href: "/dashboard/cards",
    label: "Kartu",
    description: "QR/NFC, status & area kartu",
  },
  {
    href: "/dashboard/landing-page",
    label: "Landing Page",
    description: "Tema, Google Review, kontak & konten",
  },
  {
    href: "/dashboard/feedback",
    label: "Feedback",
    description: "Kelola feedback 1–3 bintang",
  },
  {
    href: "/dashboard/analytics",
    label: "Analitik",
    description: "Ringkasan feedback & kartu",
  },
];

export default function DashboardNav() {
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
        {loggingOut ? "Keluar..." : "Keluar"}
        <div
          style={{
            marginTop: 3,
            fontSize: 12,
            lineHeight: 1.4,
            color: "#6b7280",
            fontWeight: 500,
          }}
        >
          Keluar dari akun
        </div>
      </button>
    </nav>
  );
}

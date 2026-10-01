"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/dashboard/cards",
    label: "Card Management",
    description: "QR/NFC, status & area kartu",
  },
  {
    href: "/dashboard/google-review",
    label: "Google Review Setup",
    description: "Nama bisnis & Google Maps",
  },
  {
    href: "/dashboard/feedback",
    label: "Feedback Inbox",
    description: "Kelola feedback 1–3 bintang",
  },
];

export default function DashboardNav() {
  const pathname = usePathname();

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
    </nav>
  );
}

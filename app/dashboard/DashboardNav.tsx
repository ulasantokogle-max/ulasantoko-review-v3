"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard/google-review", label: "Google Review Setup" },
  { href: "/dashboard/feedback", label: "Feedback Inbox" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: "none",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: active ? "#111827" : "#ffffff",
              color: active ? "#ffffff" : "#111827",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

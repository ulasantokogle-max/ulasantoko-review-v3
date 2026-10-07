"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("YukReview page error", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f5f7fb",
        color: "#111827",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 28,
          textAlign: "center",
          boxShadow: "0 16px 50px rgba(15,23,42,.06)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
          YUKREVIEW
        </div>
        <h1 style={{ margin: "8px 0 10px", fontSize: 26 }}>
          Ada kendala sementara
        </h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.65 }}>
          Halaman belum dapat diproses. Silakan coba lagi beberapa saat.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 18,
            border: 0,
            borderRadius: 12,
            padding: "11px 16px",
            background: "#111827",
            color: "#ffffff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Coba Lagi
        </button>
      </section>
    </main>
  );
}

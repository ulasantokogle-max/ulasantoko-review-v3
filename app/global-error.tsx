"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>
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
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
              ULASANTOKO REVIEW
            </div>
            <h1 style={{ margin: "8px 0 10px", fontSize: 26 }}>
              Layanan sedang mengalami kendala
            </h1>
            <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.65 }}>
              Silakan coba kembali. Data Anda tetap aman.
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
              Muat Ulang
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

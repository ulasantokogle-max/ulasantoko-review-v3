import DashboardNav from "./DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "24px 20px",
          display: "grid",
          gridTemplateColumns: "240px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <aside
          style={{
            position: "sticky",
            top: 24,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            padding: 16,
            boxShadow: "0 12px 36px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            UlasanToko Review V3
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#111827",
              marginBottom: 16,
            }}
          >
            Dashboard
          </div>

          <DashboardNav />
        </aside>

        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}

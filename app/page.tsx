import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>UlasanToko Review V3</h1>
      <p>System is running.</p>
      <section aria-label="Menu Bisnis" style={{ maxWidth: 900, margin: "32px auto", padding: 22, border: "1px solid #e5e7eb", borderRadius: 16, background: "#ffffff", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#111827" }}>Layanan Bisnis YukReview</h2>
        <p style={{ margin: "0 0 18px", color: "#667085", lineHeight: 1.6 }}>Pilih layanan NFC + QR yang sesuai dengan kebutuhan bisnis. Sistem dan login Google Review tetap terpisah dari WiFi.</p>
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ display: "inline-flex", padding: "12px 16px", borderRadius: 12, color: "#ffffff", background: "#17366f", textDecoration: "none", fontWeight: 800 }}>Kartu Google Review</Link>
          <Link href="/bisnis/wifi" style={{ display: "inline-flex", padding: "12px 16px", borderRadius: 12, color: "#17366f", background: "#edf2ff", textDecoration: "none", fontWeight: 800 }}>WiFi NFC + QR</Link>
        </nav>
      </section>
    </main>
  );
}

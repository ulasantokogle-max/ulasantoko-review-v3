import Link from "next/link";

export default function Home() {
  return (
    <main style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", color: "#17253d", background: "#f7f9fc", minHeight: "100vh", padding: "32px 20px 72px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 36 }}>
          <Link href="/" style={{ fontWeight: 900, color: "#17366f", textDecoration: "none", fontSize: 22 }}>Yuk<span style={{ color: "#d33144" }}>Review</span></Link>
          <Link href="/dashboard" style={{ textDecoration: "none", fontWeight: 800, color: "#163c83" }}>Dashboard</Link>
        </header>
        <section style={{ background: "#fff", borderRadius: 24, border: "1px solid #e6eaf2", padding: "clamp(28px,5vw,50px)", marginBottom: 22 }}>
          <div style={{ color: "#d33144", fontSize: 12, fontWeight: 850, letterSpacing: 1 }}>ULASAN JADI PELUANG</div>
          <h1 style={{ fontSize: "clamp(32px,5vw,48px)", margin: "12px 0" }}>Solusi Bisnis YukReview</h1>
          <p style={{ color: "#526178", lineHeight: 1.7, maxWidth: 660 }}>Akses layanan kartu Google Review dan WiFi NFC + QR dari satu tempat. Setiap layanan tetap memiliki sistem dan dashboard terpisah.</p>
          <nav aria-label="Menu Bisnis" style={{ marginTop: 25, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={{ background: "#17366f", color: "#fff", padding: "12px 18px", borderRadius: 11, textDecoration: "none", fontWeight: 750 }}>Kartu Google Review</Link>
            <Link href="/bisnis/wifi" style={{ background: "#f0f4ff", color: "#17366f", padding: "12px 18px", borderRadius: 11, textDecoration: "none", fontWeight: 750 }}>WiFi NFC + QR</Link>
          </nav>
        </section>
        <section aria-labelledby="business-services" style={{ display: "grid", gap: 16 }}>
          <h2 id="business-services" style={{ margin: "12px 0 0" }}>Produk untuk Bisnis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <article style={{ background: "#fff", border: "1px solid #e6eaf2", borderRadius: 19, padding: 25 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }} aria-hidden="true">★</div>
              <h3>Kartu Google Review</h3>
              <p style={{ color: "#526178", lineHeight: 1.6 }}>Arahkan pelanggan ke halaman ulasan bisnis melalui QR dan NFC YukReview.</p>
              <Link href="/dashboard" style={{ color: "#163c83", fontWeight: 800 }}>Masuk YukReview</Link>
            </article>
            <article style={{ background: "#fff", border: "1px solid #e6eaf2", borderRadius: 19, padding: 25 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }} aria-hidden="true">⌁</div>
              <h3>Kartu WiFi NFC + QR</h3>
              <p style={{ color: "#526178", lineHeight: 1.6 }}>Akses panduan koneksi WiFi tamu dan pengaturan jaringan dari platform WiV1.</p>
              <Link href="/bisnis/wifi" style={{ color: "#163c83", fontWeight: 800 }}>Lihat layanan WiFi</Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

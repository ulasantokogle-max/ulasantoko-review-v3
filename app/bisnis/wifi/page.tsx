import Link from "next/link";
import { wiv1Portal } from "../../../lib/wiv1Portal";

export const metadata = {
  title: "Kartu WiFi NFC + QR | YukReview Bisnis",
  description: "Akses WiFi tamu lebih praktis dengan NFC dan QR. Layanan WiV1 berjalan pada sistem terpisah dari kartu Google Review YukReview.",
};

export default function WifiBusinessPage() {
  const portal = wiv1Portal();

  return (
    <main style={{ minHeight: "100vh", background: "#f6f8fc", color: "#15243b", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: "28px 18px 72px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <nav style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 26 }}>
          <Link href="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: 20, color: "#162f67" }}>Yuk<span style={{ color: "#d33144" }}>Review</span></Link>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "#162f67", fontWeight: 700 }}>Dashboard Google Review</Link>
        </nav>
        <section style={{ background: "white", borderRadius: 24, border: "1px solid #e2e8f0", boxShadow: "0 18px 60px #162f6711", padding: "clamp(24px,5vw,52px)" }}>
          <div style={{ fontWeight: 800, letterSpacing: 1, fontSize: 12, color: "#c52d42", marginBottom: 15 }}>YUKREVIEW · PRODUK BISNIS</div>
          <h1 style={{ fontSize: "clamp(29px,5vw,46px)", margin: "0 0 16px", lineHeight: 1.13 }}>WiFi lebih praktis dengan <span style={{ color: "#163c83" }}>NFC + QR</span></h1>
          <p style={{ color: "#526178", lineHeight: 1.8, fontSize: 16, maxWidth: 650, marginBottom: 28 }}>
            Pelanggan cukup scan QR atau tap kartu NFC untuk membuka halaman WiFi bisnis. Kelola SSID, informasi koneksi, dan analytics dari dashboard WiV1 khusus bisnis Anda.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
            {portal ? <>
              <a href={portal.clientUrl} rel="noopener noreferrer" style={{ background: "#163c83", color: "white", padding: "14px 22px", borderRadius: 12, textDecoration: "none", fontWeight: 800 }}>Masuk Dashboard WiFi</a>
              <a href={portal.providerUrl} rel="noopener noreferrer" style={{ background: "#eef2fa", color: "#163c83", padding: "14px 22px", borderRadius: 12, textDecoration: "none", fontWeight: 800 }}>Login Provider WiV1</a>
            </> : <p role="status" style={{ background: "#f7f8fb", border: "1px solid #e1e7f1", borderRadius: 12, padding: "14px 18px", color: "#526178" }}>
              Portal WiV1 belum diaktifkan pada environment ini. Login Google Review YukReview tetap tersedia seperti biasa.
            </p>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {[
              ["Scan QR", "QR kartu membuka halaman WiFi bisnis."],
              ["Tap NFC", "Tempel HP ke chip NFC yang sudah diprogram."],
              ["Dashboard Client", "Owner mengelola WiFi dan melihat statistik kartu."],
            ].map(([title, description]) => <div key={title} style={{ padding: 17, borderRadius: 15, background: "#f6f8fc", border: "1px solid #e6ebf3" }}>
              <div style={{ fontWeight: 850, marginBottom: 8 }}>{title}</div>
              <div style={{ color: "#667085", lineHeight: 1.6, fontSize: 13 }}>{description}</div>
            </div>)}
          </div>
        </section>
        <p style={{ marginTop: 20, color: "#667085", fontSize: 12, lineHeight: 1.7 }}>
          WiV1 adalah aplikasi terpisah dengan akun serta database sendiri. Masuk ke WiV1 tidak otomatis menggunakan sesi login Google Review YukReview.
        </p>
      </div>
    </main>
  );
}

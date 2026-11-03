import type { Metadata } from "next";
import { YUKREVIEW_SITE_URL, YUKREVIEW_SEARCH_TITLE, YUKREVIEW_SEARCH_DESCRIPTION } from "../lib/siteMetadata";
import "./home.css";

export const metadata: Metadata = {
  title: YUKREVIEW_SEARCH_TITLE,
  description: YUKREVIEW_SEARCH_DESCRIPTION,
  alternates: { canonical: YUKREVIEW_SITE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website", url: YUKREVIEW_SITE_URL, siteName: "YukReview",
    title: YUKREVIEW_SEARCH_TITLE, description: YUKREVIEW_SEARCH_DESCRIPTION, locale: "id_ID"
  },
  twitter: { card: "summary", title: YUKREVIEW_SEARCH_TITLE, description: YUKREVIEW_SEARCH_DESCRIPTION }
};

const phone = "6281382189991";
function orderLink(name: string, sides: number, price: number) {
  const message = `Halo YukReview, saya ingin pesan ${name} ${sides} sisi dengan harga Rp${price.toLocaleString("id-ID")}. Mohon info pemesanan.`;
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}
function Brand() {
  return <span className="yr-logo" aria-label="YukReview.id">
    <svg viewBox="0 0 64 68" width="48" height="50" role="img" aria-label="Ikon ulasan YukReview">
      <defs><linearGradient id="yrbubble" x1="0" x2="1" y1="1" y2="0"><stop stopColor="#03b8e7"/><stop offset="1" stopColor="#0860f7"/></linearGradient></defs>
      <path d="M43 15C46 7 52 5 59 11" stroke="#0869fa" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M45 7C53 0 59 2 63 7" stroke="#0869fa" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M6 32C6 19 16 10 29 10h8c15 0 24 10 24 24v5c0 16-12 25-26 25H21L8 67l3-15C8 47 6 40 6 32Z" fill="url(#yrbubble)"/>
      <path d="m33 19 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill="white"/>
    </svg><span className="yr-word"><b>Yuk</b><strong>Review</strong><b>.id</b></span>
  </span>;
}
const features = [
  { icon:"✦", name:"Lebih mudah meminta ulasan", desc:"Pelanggan cukup tap NFC atau scan QR untuk menuju ulasan Google bisnis Anda." },
  { icon:"◈", name:"Tanpa aplikasi tambahan", desc:"Cukup gunakan kamera ponsel atau fitur NFC yang tersedia." },
  { icon:"▣", name:"Tampilan bisnis profesional", desc:"Paket Smart Landing menampilkan logo, cover, kontak, dan tautan bisnis dalam satu halaman." },
  { icon:"↗", name:"Bisa dikelola ulang", desc:"Perbarui informasi bisnis pada dashboard tanpa mencetak ulang kartu Smart Landing." }
];
const faqs = [
  ["Apa perbedaan Direct Review dan Smart Landing?", "Direct Review membuka tautan ulasan Google secara langsung. Smart Landing membuka halaman YukReview yang berisi tautan ulasan dan informasi bisnis."],
  ["Apakah pelanggan harus memasang aplikasi?", "Tidak. Untuk QR cukup gunakan kamera atau pembaca QR. Untuk tap NFC, gunakan ponsel yang mendukung NFC."],
  ["Apakah ulasan dijamin bintang lima?", "Tidak. Pelanggan menulis ulasan secara sukarela sesuai pengalaman masing-masing."],
  ["Apakah Smart Landing sudah termasuk tahun pertama?", "Ya. Harga pembelian Smart Landing mencakup layanan tahun pertama. Perpanjangan tahun berikutnya Rp59.000 per 12 bulan sesuai ketentuan layanan."],
  ["Bagaimana cara aktivasi kartu?", "Setelah menerima kartu, scan QR atau tap NFC lalu ikuti proses aktivasi dan pengaturan bisnis sesuai petunjuk. Paket Direct Review disiapkan dengan tautan Google Review langsung."],
];
const schema = {"@context":"https://schema.org","@graph":[
  {"@type":"WebSite","name":"YukReview","url":YUKREVIEW_SITE_URL,"description":YUKREVIEW_SEARCH_DESCRIPTION,"inLanguage":"id"},
  {"@type":"Organization","name":"YukReview","url":YUKREVIEW_SITE_URL,"email":"kontak@yukreview.id","contactPoint":{"@type":"ContactPoint","telephone":"+6281382189991","contactType":"customer service","availableLanguage":"Indonesian"}}
]};
export default function Home() {
 return <main className="yr-home" lang="id">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}} />
  <header className="yr-header"><div className="yr-container yr-nav"><a href="/" aria-label="Beranda YukReview"><Brand /></a><nav aria-label="Navigasi"><a href="#keunggulan">Keunggulan</a><a href="#cara-kerja">Cara Kerja</a><a href="#paket">Paket & Harga</a><a href="#faq">FAQ</a></nav><a className="yr-nav-cta" href="/dashboard">Masuk Dashboard ↗</a></div></header>
  <section className="yr-hero" id="beranda"><div className="yr-container yr-hero-grid">
   <div><span className="yr-pill">KARTU REVIEW GOOGLE · NFC + QR CODE</span><h1>Ulasan Google jadi <em>lebih mudah.</em><br/>Bisnis makin dipercaya.</h1><p className="yr-lead">Permudah pelanggan memberikan ulasan Google hanya dengan <b>tap NFC atau scan QR Code.</b> Pilih akses langsung atau Smart Landing dengan halaman bisnis profesional.</p><div className="yr-actions"><a className="yr-primary" href="#paket">Lihat Paket & Harga <span>↗</span></a><a className="yr-outline" href="#cara-kerja">Cara Kerja ↓</a></div><div className="yr-mini"><span>✓ Tanpa aplikasi tambahan</span><span>✓ QR + NFC</span><span>✓ Cocok untuk berbagai bisnis</span></div></div>
   <div className="yr-art" aria-label="Ilustrasi kartu NFC dan QR YukReview"><div className="yr-art-circle"></div><div className="yr-stand"><div className="yr-stand-top"><Brand/><span className="yr-nfc-icon">◉</span></div><div className="yr-stand-center"><span className="yr-big-g">G</span><div className="yr-art-stars">★★★★★</div><strong>Bagikan pengalaman Anda!</strong><span>Scan QR atau tap NFC</span></div><div className="yr-art-bottom"><span className="yr-qr" aria-label="Ilustrasi QR, bukan kode aktif">▦</span><span>SCAN QR<br/><small>ATAU TAP NFC</small></span><span className="yr-nfc-waves">)))</span></div></div><div className="yr-art-chip">✦ <b>Satu kartu</b><span>Dua cara akses</span></div></div>
  </div></section>
  <div className="yr-trust"><div className="yr-container">Didesain untuk <b>Kafe & Restoran</b> · <b>Hotel</b> · <b>Salon</b> · <b>Toko Retail</b> · <b>Bisnis Layanan</b></div></div>
  <section className="yr-section yr-container" id="keunggulan"><div className="yr-center"><span className="yr-kicker">KENAPA YUKREVIEW?</span><h2>Lebih praktis untuk pelanggan.<br/><span>Lebih profesional untuk bisnis.</span></h2><p>Hubungkan pengalaman offline di meja kasir dengan ulasan dan informasi bisnis online.</p></div><div className="yr-feature-grid">{features.map(f=><article key={f.name} className="yr-feature"><div className="yr-feature-icon">{f.icon}</div><h3>{f.name}</h3><p>{f.desc}</p></article>)}</div></section>
  <section className="yr-section yr-how" id="cara-kerja"><div className="yr-container"><div className="yr-center"><span className="yr-kicker">MUDAH DIGUNAKAN</span><h2>Cukup tiga langkah.</h2></div><div className="yr-steps">{[["01","Aktivasi","Pemilik menghubungkan kartu dengan tujuan Google Review atau halaman bisnis."],["02","Tap NFC / Scan QR","Pelanggan mendekatkan ponsel atau memindai QR Code pada kartu."],["03","Beri Ulasan","Pelanggan menuliskan pengalaman secara jujur di Google."]].map(s=><div className="yr-step" key={s[0]}><span>{s[0]}</span><h3>{s[1]}</h3><p>{s[2]}</p></div>)}</div></div></section>
  <section className="yr-section yr-container" id="paket"><div className="yr-center"><span className="yr-kicker">PAKET & HARGA</span><h2>Pilih sesuai kebutuhan bisnis.</h2><p>Dua pilihan solusi, dengan opsi desain satu atau dua sisi.</p></div><div className="yr-pricing">
   <article className="yr-plan"><span className="yr-plan-type">PAKET 1</span><h3>Direct Google Review</h3><p>NFC dan QR langsung membuka halaman ulasan Google bisnis, tanpa website perantara.</p><div className="yr-plan-price">Mulai <strong>Rp65.000</strong></div><div className="yr-plan-options"><a href={orderLink("Direct Google Review",1,65000)} target="_blank" rel="noopener noreferrer"><span>1 Sisi</span><b>Rp65.000 ↗</b></a><a href={orderLink("Direct Google Review",2,75000)} target="_blank" rel="noopener noreferrer"><span>2 Sisi</span><b>Rp75.000 ↗</b></a></div><p className="yr-plan-note">Tanpa dashboard dan biaya langganan YukReview.</p></article>
   <article className="yr-plan yr-plan-featured"><span className="yr-plan-type">PAKET 2 · SMART LANDING</span><h3>YukReview Smart Landing</h3><p>Halaman bisnis dengan Google Review, WhatsApp, media sosial, cover, dan katalog PDF sesuai konfigurasi.</p><div className="yr-plan-price">Mulai <strong>Rp95.000</strong></div><div className="yr-plan-options"><a href={orderLink("Smart Landing YukReview",1,95000)} target="_blank" rel="noopener noreferrer"><span>1 Sisi</span><b>Rp95.000 ↗</b></a><a href={orderLink("Smart Landing YukReview",2,125000)} target="_blank" rel="noopener noreferrer"><span>2 Sisi</span><b>Rp125.000 ↗</b></a></div><p className="yr-plan-note">Sudah termasuk tahun pertama; perpanjangan Rp59.000/tahun.</p></article>
  </div><p className="yr-fine">Ulasan Google bersifat sukarela dan tidak dijamin menghasilkan rating atau jumlah ulasan tertentu. Harga belum termasuk ongkos kirim bila berlaku.</p></section>
  <section className="yr-section yr-demo"><div className="yr-container yr-demo-layout"><div><span className="yr-kicker">KHUSUS SMART LANDING</span><h2>Satu halaman untuk semua informasi bisnis.</h2><p>Tampilkan identitas usaha, tombol Google Review, WhatsApp, media sosial, dan katalog dalam satu halaman responsif.</p><a className="yr-primary" href="#paket">Pilih Smart Landing ↗</a></div><div className="yr-phone"><div className="yr-phone-cover"></div><div className="yr-phone-mark">✦</div><h3>Bisnis Anda</h3><small>Halaman publik YukReview</small><div className="yr-phone-button">★ Beri Ulasan di Google</div><div className="yr-phone-whatsapp">Hubungi via WhatsApp</div><div className="yr-phone-social">Instagram · TikTok · YouTube</div></div></div></section>
  <section className="yr-section yr-container yr-faq" id="faq"><div className="yr-center"><span className="yr-kicker">FAQ</span><h2>Pertanyaan yang sering diajukan.</h2></div>{faqs.map(f=><details key={f[0]}><summary>{f[0]}</summary><p>{f[1]}</p></details>)}</section>
  <section className="yr-final" id="kontak"><div className="yr-container yr-final-inner"><div><span className="yr-kicker">SIAP MULAI?</span><h2>Bikin pelanggan lebih mudah<br/>memberikan ulasan Google.</h2><p>Hubungi tim YukReview untuk tanya paket dan pemesanan.</p></div><a className="yr-primary yr-final-button" href={"https://wa.me/"+phone+"?text="+encodeURIComponent("Halo YukReview, saya ingin tanya paket kartu NFC + QR.")} target="_blank" rel="noopener noreferrer">Chat WhatsApp Sekarang ↗</a></div></section>
  <footer className="yr-footer"><div className="yr-container yr-footer-grid"><div><Brand/><p>Kartu Google Review NFC + QR Code untuk kebutuhan bisnis.</p></div><div><b>YukReview</b><a href="#keunggulan">Keunggulan</a><a href="#cara-kerja">Cara Kerja</a><a href="#paket">Paket & Harga</a></div><div><b>Kontak</b><a href="https://wa.me/6281382189991">+62 813-8218-9991</a><a href="mailto:kontak@yukreview.id">kontak@yukreview.id</a><a href="/dashboard">Dashboard Owner</a></div></div><div className="yr-container yr-copyright">© 2026 YukReview.id · Produk independen, tidak berafiliasi dengan Google.</div></footer>
 </main>;
}
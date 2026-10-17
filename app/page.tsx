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
    title: YUKREVIEW_SEARCH_TITLE, description: YUKREVIEW_SEARCH_DESCRIPTION, locale: "id_ID",
  },
  twitter: { card: "summary", title: YUKREVIEW_SEARCH_TITLE, description: YUKREVIEW_SEARCH_DESCRIPTION },
};

const features = [
  ["01", "Ulasan Google lebih mudah", "Arahkan pelanggan ke halaman ulasan Google melalui satu kartu. Pelanggan tetap bebas memberikan ulasan sesuai pengalamannya."],
  ["02", "Satu halaman untuk bisnis", "Tampilkan menu PDF, WhatsApp, Instagram, TikTok, dan YouTube. Pilih tombol yang sesuai dengan kebutuhan bisnis."],
  ["03", "Kelola lewat dashboard", "Atur nama bisnis, logo, cover, tema, dan tautan. Pembaruan halaman berlaku pada kartu yang terhubung ke bisnis tersebut."],
  ["04", "Masukan privat sebagai pilihan", "Pelanggan dapat mengirim masukan langsung kepada bisnis melalui pilihan terpisah, tanpa wajib mengisinya sebelum menuju Google."],
];
const steps = [
  ["Aktivasi kartu", "Pemilik bisnis membuka QR atau NFC kartu, mendaftar atau masuk, lalu menyelesaikan aktivasi."],
  ["Atur halaman bisnis", "Lengkapi profil dan tautan Google Review. Tambahkan menu, kontak, serta media sosial melalui dashboard."],
  ["Pelanggan scan atau tap", "Pelanggan membuka halaman bisnis lewat QR atau NFC, lalu memilih Google Review atau informasi yang dibutuhkan."],
];
const siteSchema = {
  "@context": "https://schema.org", "@graph": [
    { "@type": "WebSite", "@id": YUKREVIEW_SITE_URL + "/#website", name: "YukReview", alternateName: "YukReview Kartu Google Review", url: YUKREVIEW_SITE_URL, description: YUKREVIEW_SEARCH_DESCRIPTION, inLanguage: "id" },
    { "@type": "Organization", "@id": YUKREVIEW_SITE_URL + "/#organization", name: "YukReview", url: YUKREVIEW_SITE_URL, description: "Platform kartu Google Review dengan QR dan NFC untuk bisnis.", email: "kontak@yukreview.id", contactPoint: { "@type": "ContactPoint", telephone: "+6281382189991", email: "kontak@yukreview.id", contactType: "customer service", availableLanguage: "Indonesian" } },
  ],
};

export default function Home() {
  return <main className="yr-home" lang="id">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema).replace(/</g, "\\u003c") }} />
    <header className="yr-nav">
      <a className="yr-brand" href="/" aria-label="YukReview beranda"><span className="yr-brand-art" aria-hidden="true"><span className="yr-logo-y">Y</span><span className="yr-brand-word"><span className="yr-brand-yuk">Yuk</span><span className="yr-brand-review">Review</span></span><svg className="yr-brand-spark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F2162F" d="M12 0 15 9 24 12 15 15 12 24 9 15 0 12 9 9Z"/></svg></span></a>
      <nav aria-label="Navigasi utama"><a className="yr-nav-detail" href="#fitur">Fitur</a><a className="yr-nav-detail" href="#cara-kerja">Cara Kerja</a><a className="yr-nav-detail" href="#kontak">Kontak</a><a className="yr-button yr-small" href="/dashboard">Masuk Dashboard <span aria-hidden="true">↗</span></a></nav>
    </header>
    <section className="yr-hero" aria-labelledby="yr-title">
      <div className="yr-hero-copy">
        <div className="yr-eyebrow"><span aria-hidden="true">✦</span> PLATFORM KARTU GOOGLE REVIEW BERBASIS QR & NFC</div>
        <h1 id="yr-title">Ulasan pelanggan,<br /><span>peluang bisnis berkembang.</span></h1>
        <p className="yr-lead">Beri pelanggan cara yang lebih praktis untuk mengulas bisnis Anda di Google. Cukup scan QR atau tap NFC—semua informasi bisnis terhubung dalam satu halaman premium.</p>
        <div className="yr-hero-actions"><a className="yr-button" href="#cara-kerja">Lihat Cara Kerja <span aria-hidden="true">↗</span></a><a className="yr-link" href="/dashboard">Kelola Kartu Saya <span aria-hidden="true">↗</span></a></div>
        <p className="yr-helper">Sudah punya kartu? Scan QR atau tap NFC kartu untuk memulai aktivasi.</p>
      </div>
      <div className="yr-illustration" aria-label="Ilustrasi kartu QR dan NFC YukReview">
        <div className="yr-orbit" aria-hidden="true" />
        <div className="yr-hero-halo" aria-hidden="true" />
        <div className="yr-product-card">
          <div className="yr-card-top"><strong><span className="yr-card-brand-red">Yuk</span>Review<span className="yr-card-star">✦</span></strong><span className="yr-card-nfc" aria-label="NFC">◉ NFC</span></div>
          <div className="yr-card-kicker">YOUR BUSINESS · YOUR REPUTATION</div>
          <h2>Setiap ulasan<br /><em>punya arti.</em></h2>
          <div className="yr-stars" aria-label="Ilustrasi lima bintang">★★★★★</div>
          <div className="yr-card-bottom"><span>Scan QR atau Tap NFC<br /><strong>Berikan ulasan sesuai pengalaman Anda</strong></span><span className="yr-card-arrow" aria-hidden="true">↗</span></div>
        </div>
        <div className="yr-floating-note"><span aria-hidden="true">✦</span><div><strong>Terhubung dalam satu tap</strong><span>Google Review · WhatsApp · Menu</span></div></div>
        <div className="yr-float-badge" aria-hidden="true">QR + NFC <span>●</span> READY</div>
      </div>
    </section>
    <div className="yr-benefits" aria-label="Manfaat kartu"><span>Tanpa aplikasi khusus untuk pengunjung</span><span>Satu bisnis, banyak kartu</span><span>Tautan dan tampilan bisa diperbarui</span></div>
    <section className="yr-section" id="fitur" aria-labelledby="yr-features-title">
      <div className="yr-section-head"><span className="yr-eyebrow">SATU KARTU, BANYAK MANFAAT</span><h2 id="yr-features-title">Pengalaman lebih mudah.<br />Hubungan pelanggan lebih dekat.</h2></div>
      <div className="yr-feature-grid">{features.map(([number, title, description]) => <article className="yr-feature" key={number}><span className="yr-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>
    <section className="yr-how" id="cara-kerja" aria-labelledby="yr-how-title">
      <div className="yr-section-head"><span className="yr-eyebrow">SIMPLE, CEPAT, PROFESIONAL</span><h2 id="yr-how-title">Tiga langkah menuju bisnis yang lebih terhubung.</h2></div>
      <ol className="yr-step-grid">{steps.map(([title, description], index) => <li key={title}><span className="yr-step-number">{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
    </section>
    <section className="yr-faq yr-section" aria-labelledby="yr-faq-title">
      <div className="yr-section-head"><span className="yr-eyebrow">PERTANYAAN UMUM</span><h2 id="yr-faq-title">Kenali YukReview.</h2></div>
      <details><summary>Apa itu kartu Google Review YukReview?</summary><p>Kartu fisik dengan QR dan NFC yang terhubung ke halaman bisnis. Pelanggan dapat membuka Google Review, kontak bisnis, menu PDF, dan media sosial melalui halaman tersebut.</p></details>
      <details><summary>Apakah pelanggan harus memasang aplikasi?</summary><p>Tidak perlu aplikasi khusus YukReview. Pelanggan dapat scan QR menggunakan kamera atau pembaca QR, atau tap kartu pada ponsel yang mendukung NFC. Untuk mengirim ulasan Google, pelanggan mengikuti proses masuk akun Google.</p></details>
      <details><summary>Apakah satu bisnis bisa menggunakan banyak kartu?</summary><p>Bisa. Beberapa kartu dapat diaktifkan dalam bisnis yang sama dan dikelola melalui satu dashboard bisnis.</p></details>
      <details><summary>Apakah YukReview menjamin rating tertentu?</summary><p>Tidak. Ulasan dan rating berasal dari pengalaman pelanggan. Tombol Google Review tersedia tanpa penyaringan berdasarkan rating; masukan privat merupakan pilihan terpisah.</p></details>
    </section>
    <section className="yr-contact yr-section" id="kontak" aria-labelledby="yr-contact-title">
      <div className="yr-section-head"><span className="yr-eyebrow">CUSTOMER SERVICE YUKREVIEW</span><h2 id="yr-contact-title">Butuh bantuan? Hubungi kami.</h2><p className="yr-contact-intro">Tanyakan kartu, aktivasi, atau pengelolaan halaman bisnis kepada tim YukReview.</p></div>
      <div className="yr-contact-grid">
        <a className="yr-contact-card" href="https://wa.me/6281382189991" target="_blank" rel="noopener noreferrer">
          <span className="yr-eyebrow">WHATSAPP CUSTOMER SERVICE</span><strong>+62 813-8218-9991</strong><span className="yr-contact-action">Chat via WhatsApp <span aria-hidden="true">↗</span></span>
        </a>
        <a className="yr-contact-card" href="mailto:kontak@yukreview.id">
          <span className="yr-eyebrow">EMAIL CUSTOMER SERVICE</span><strong>kontak@yukreview.id</strong><span className="yr-contact-action">Kirim Email <span aria-hidden="true">↗</span></span>
        </a>
      </div>
    </section>
    <section className="yr-cta"><div><span className="yr-eyebrow">MULAI KELOLA KARTU YUKREVIEW</span><h2>Halaman bisnis Anda,<br />kelola dari satu dashboard.</h2></div><a className="yr-button yr-button-light" href="/dashboard">Masuk Dashboard <span aria-hidden="true">↗</span></a></section>
    <footer className="yr-footer"><span className="yr-brand"><span className="yr-brand-art" aria-hidden="true"><span className="yr-logo-y">Y</span><span className="yr-brand-word"><span className="yr-brand-yuk">Yuk</span><span className="yr-brand-review">Review</span></span><svg className="yr-brand-spark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F2162F" d="M12 0 15 9 24 12 15 15 12 24 9 15 0 12 9 9Z"/></svg></span></span><p>Kartu Google Review QR & NFC untuk bisnis.</p><div className="yr-footer-contact"><a href="https://wa.me/6281382189991" target="_blank" rel="noopener noreferrer">+62 813-8218-9991</a><a href="mailto:kontak@yukreview.id">kontak@yukreview.id</a></div><a href="/dashboard">Masuk akun</a></footer>
  </main>;
}

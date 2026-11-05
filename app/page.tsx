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
  return <span className="yr-logo"><img src="data:image/png;base64,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" width={240} height={71} alt="YukReview.id" /></span>;
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
   <div className="yr-poster-display yr-poster-display-single yr-hero-photo-display" aria-label="Foto mockup kartu YukReview Dark Premium di stand akrilik mini">
      <figure className="yr-hero-photo-frame">
        <img src="/yukreview-hero-acrylic-mini-hd.webp" alt="Mockup kartu ulasan YukReview Dark Premium di atas meja menggunakan stand akrilik mini yang diperkecil 30 persen" width={1448} height={1086} loading="eager" decoding="async" fetchPriority="high" />
      </figure>
      <p className="yr-poster-hint">Foto ilustrasi produk. QR pada mockup bukan QR kartu pelanggan yang aktif.</p>
    </div>
  </div></section>
  <div className="yr-trust"><div className="yr-container">Didesain untuk <b>Kafe & Restoran</b> · <b>Hotel</b> · <b>Salon</b> · <b>Toko Retail</b> · <b>Bisnis Layanan</b></div></div>
  <section className="yr-section yr-container" id="keunggulan"><div className="yr-center"><span className="yr-kicker">KENAPA YUKREVIEW?</span><h2>Lebih praktis untuk pelanggan.<br/><span>Lebih profesional untuk bisnis.</span></h2><p>Hubungkan pengalaman offline di meja kasir dengan ulasan dan informasi bisnis online.</p></div><div className="yr-feature-grid">{features.map(f=><article key={f.name} className="yr-feature"><div className="yr-feature-icon">{f.icon}</div><h3>{f.name}</h3><p>{f.desc}</p></article>)}</div></section>
  <section className="yr-section yr-how" id="cara-kerja"><div className="yr-container"><div className="yr-center"><span className="yr-kicker">MUDAH DIGUNAKAN</span><h2>Cukup tiga langkah.</h2></div><div className="yr-steps">{[["01","Aktivasi","Pemilik menghubungkan kartu dengan tujuan Google Review atau halaman bisnis."],["02","Tap NFC / Scan QR","Pelanggan mendekatkan ponsel atau memindai QR Code pada kartu."],["03","Beri Ulasan","Pelanggan menuliskan pengalaman secara jujur di Google."]].map(s=><div className="yr-step" key={s[0]}><span>{s[0]}</span><h3>{s[1]}</h3><p>{s[2]}</p></div>)}</div></div></section>
  <section className="yr-section yr-pricing-showcase" id="paket">
  <div className="yr-container">
   <div className="yr-center yr-pricing-intro"><span className="yr-kicker">PAKET & HARGA YUKREVIEW</span><h2>Pilih Kartu Ulasan untuk Bisnis Anda</h2><p>Dua paket dengan manfaat berbeda. Masing-masing tersedia dalam pilihan 1 sisi atau 2 sisi dan tombol pemesanan langsung.</p></div>
   <div className="yr-pricing-catalog">
    <article className="yr-showcase-card" aria-labelledby="yr-package-direct">
     <div className="yr-showcase-visual">
      <span className="yr-showcase-ribbon">PAKET 1 · DIRECT GOOGLE REVIEW</span>
      <div className="yr-mockup-stage">
       <div className="yr-mockup-acrylic">
        <img src="/yukreview-direct-review-hd.webp" alt="Mockup HD 1254px kartu Direct Google Review YukReview bertema Google dengan stand akrilik, QR ilustratif dan simbol NFC" width={1254} height={1254} loading="lazy" decoding="async" />
       </div>
       <div className="yr-mockup-glow"></div>
      </div>
      <span className="yr-mockup-caption">Contoh kartu Google Review umum · QR hanya ilustrasi</span>
     </div>
     <div className="yr-showcase-details">
      <span className="yr-showcase-eyebrow">TANPA LANGGANAN TAHUNAN</span>
      <h3 id="yr-package-direct">Direct Google Review</h3>
      <p className="yr-showcase-description">Bantu pelanggan membuka halaman ulasan Google dengan satu scan QR atau tap NFC—tanpa halaman perantara.</p>
      <div className="yr-showcase-benefits"><strong>Benefit Paket 1</strong><ul>
       <li>Scan QR Code atau tap NFC langsung ke halaman ulasan Google</li>
       <li>Pelanggan tidak perlu mencari nama bisnis secara manual</li>
       <li>Cocok untuk kasir, resepsionis, konter, dan area pelayanan</li>
       <li>Tersedia pilihan kartu 1 sisi atau 2 sisi</li>
       <li>Tidak memerlukan dashboard YukReview atau perpanjangan tahunan</li>
      </ul></div>
      <div className="yr-showcase-prices" aria-label="Pilihan harga paket Direct Google Review">
       <div className="yr-showcase-price-option"><span>1 Sisi</span><strong>Rp65.000</strong><a href={orderLink("Direct Google Review",1,65000)} target="_blank" rel="noopener noreferrer">Pesan 1 Sisi ↗</a></div>
       <div className="yr-showcase-price-option"><span>2 Sisi</span><strong>Rp75.000</strong><a href={orderLink("Direct Google Review",2,75000)} target="_blank" rel="noopener noreferrer">Pesan 2 Sisi ↗</a></div>
      </div>
      <p className="yr-showcase-footnote">Harga belum termasuk ongkir bila berlaku.</p>
     </div>
    </article>
    <article className="yr-showcase-card yr-showcase-card-smart" aria-labelledby="yr-package-smart">
     <div className="yr-showcase-visual">
      <span className="yr-showcase-ribbon">PAKET 2 · SMART LANDING</span>
      <div className="yr-smart-clean-mockup" aria-label="Ilustrasi kartu YukReview Smart Landing Clean White HD dengan dudukan akrilik">
       <img src="/yukreview-smart-landing-clean-mockup-hd.webp" alt="Mockup kartu YukReview Smart Landing Clean White pada dudukan akrilik bening" width={1254} height={1254} loading="lazy" decoding="async" />
      </div>
     </div>
     <div className="yr-showcase-details">
      <span className="yr-showcase-eyebrow">TAHUN PERTAMA SUDAH TERMASUK</span>
      <h3 id="yr-package-smart">YukReview Smart Landing</h3>
      <p className="yr-showcase-description">Satu halaman bisnis profesional untuk menghubungkan pelanggan dengan Google Review, WhatsApp, media sosial, dan katalog.</p>
      <div className="yr-showcase-benefits"><strong>Benefit Paket 2</strong><ul>
       <li>Scan QR Code atau tap NFC menuju Smart Landing YukReview</li>
       <li>Tombol Google Review dan WhatsApp di satu halaman</li>
       <li>Tambahkan tautan media sosial dan katalog PDF</li>
       <li>Profil bisnis dengan logo, cover, dan pilihan tampilan</li>
       <li>Informasi dapat diperbarui melalui dashboard owner</li>
       <li>Feedback internal ke owner: pelanggan bisa mengirim kritik dan saran secara privat, terpisah dari ulasan Google</li>
       <li>Layanan Smart Landing tahun pertama termasuk harga kartu</li>
      </ul></div>
      <div className="yr-showcase-prices" aria-label="Pilihan harga paket Smart Landing">
       <div className="yr-showcase-price-option"><span>1 Sisi</span><strong>Rp95.000</strong><a href={orderLink("Smart Landing YukReview",1,95000)} target="_blank" rel="noopener noreferrer">Pesan 1 Sisi ↗</a></div>
       <div className="yr-showcase-price-option"><span>2 Sisi</span><strong>Rp125.000</strong><a href={orderLink("Smart Landing YukReview",2,125000)} target="_blank" rel="noopener noreferrer">Pesan 2 Sisi ↗</a></div>
      </div>
      <p className="yr-showcase-footnote">Perpanjangan Smart Landing Rp59.000/tahun setelah tahun pertama. Harga belum termasuk ongkir bila berlaku.</p>
     </div>
    </article>
   </div>
   <p className="yr-fine">Ulasan Google bersifat sukarela dan tidak dijamin menghasilkan rating atau jumlah ulasan tertentu. Visual QR pada ilustrasi bukan kode kartu pelanggan yang aktif.</p>
  </div>
 </section>
 <section className="yr-section yr-demo"><div className="yr-container yr-demo-layout"><div><span className="yr-kicker">KHUSUS SMART LANDING</span><h2>Satu halaman untuk semua informasi bisnis.</h2><p>Tampilkan identitas usaha, tombol Google Review, WhatsApp, media sosial, dan katalog dalam satu halaman responsif.</p><a className="yr-primary" href="#paket">Pilih Smart Landing ↗</a></div><div className="yr-phone"><div className="yr-phone-cover"></div><div className="yr-phone-mark">✦</div><h3>Bisnis Anda</h3><small>Halaman publik YukReview</small><div className="yr-phone-button">★ Beri Ulasan di Google</div><div className="yr-phone-whatsapp">Hubungi via WhatsApp</div><div className="yr-phone-social">Instagram · TikTok · YouTube</div></div></div></section>
  <section className="yr-section yr-container yr-faq" id="faq"><div className="yr-center"><span className="yr-kicker">FAQ</span><h2>Pertanyaan yang sering diajukan.</h2></div>{faqs.map(f=><details key={f[0]}><summary>{f[0]}</summary><p>{f[1]}</p></details>)}</section>
  <section className="yr-final" id="kontak"><div className="yr-container yr-final-inner"><div><span className="yr-kicker">SIAP MULAI?</span><h2>Bikin pelanggan lebih mudah<br/>memberikan ulasan Google.</h2><p>Hubungi tim YukReview untuk tanya paket dan pemesanan.</p></div><a className="yr-primary yr-final-button" href={"https://wa.me/"+phone+"?text="+encodeURIComponent("Halo YukReview, saya ingin tanya paket kartu NFC + QR.")} target="_blank" rel="noopener noreferrer">Chat WhatsApp Sekarang ↗</a></div></section>
  <footer className="yr-footer"><div className="yr-container yr-footer-grid"><div><Brand/><p>Kartu Google Review NFC + QR Code untuk kebutuhan bisnis.</p></div><div><b>YukReview</b><a href="#keunggulan">Keunggulan</a><a href="#cara-kerja">Cara Kerja</a><a href="#paket">Paket & Harga</a></div><div><b>Kontak</b><a href="https://wa.me/6281382189991">+62 813-8218-9991</a><a href="mailto:kontak@yukreview.id">kontak@yukreview.id</a><a href="/dashboard">Dashboard Owner</a></div></div><div className="yr-container yr-copyright">© 2026 YukReview.id · Produk independen, tidak berafiliasi dengan Google.</div></footer>
 </main>;
}
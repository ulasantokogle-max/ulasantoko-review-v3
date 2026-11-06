"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProviderMfaGate from "../../components/ProviderMfaGate";
import { supabase } from "../../../lib/supabase";
import { getCardPublicUrl } from "../../../lib/cardPublicId";
import { rainbowQrPng } from "../../../lib/rainbow-qr";

type Card = {
  id: string; card_code: string; label: string | null; area: string | null;
  internal_code: string | null; qr_url: string | null; qr_enabled: boolean;
  nfc_enabled: boolean; inventory_status: string;
};

type Palette = "rainbow" | "classic";
type Theme = "light" | "navy";
const LIMIT = 12;

export default function BulkDesignerPage() {
  return <ProviderMfaGate><BulkDesigner /></ProviderMfaGate>;
}

function BulkDesigner() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [palette, setPalette] = useState<Palette>("rainbow");
  const [theme, setTheme] = useState<Theme>("light");
  const [backEnabled, setBackEnabled] = useState(true);
  const [headline, setHeadline] = useState("Beri Ulasan Google");
  const [subtitle, setSubtitle] = useState("Scan QR atau tap NFC untuk berbagi pengalaman Anda");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: allowed, error: roleError } = await supabase.rpc("v3_is_provider_admin");
        if (roleError || allowed !== true) throw Error("Akses hanya untuk Provider yang berwenang.");
        const { data, error } = await supabase.rpc("v3_provider_list_cards", { p_limit: 500 });
        if (error || !Array.isArray(data)) throw Error("Inventori kartu belum bisa dimuat.");
        if (active) setCards(data.filter((card: Card) => card.qr_enabled && card.qr_url));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat data kartu.");
      } finally { if (active) setLoaded(true); }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => cards.filter(c =>
    (c.card_code + " " + (c.label || "") + " " + (c.area || "") + " " + (c.internal_code || ""))
      .toLowerCase().includes(filter.toLowerCase())
  ), [cards, filter]);
  const chosen = useMemo(() => selected.map(code => cards.find(c => c.card_code === code)).filter((v): v is Card => !!v), [selected, cards]);

  useEffect(() => {
    if (!chosen.length) { setImages({}); return; }
    let cancelled = false;
    setWorking(true);
    setError("");
    (async () => {
      const output: Record<string, string> = {};
      try {
        const qr = await import("qrcode");
        for (const card of chosen) {
          if (cancelled) return;
          const url = getCardPublicUrl(card.qr_url, card.card_code);
          output[card.card_code] = palette === "rainbow"
            ? rainbowQrPng(qr.create(url, { errorCorrectionLevel: "M" }).modules)
            : await qr.toDataURL(url, { margin: 4, scale: 12, errorCorrectionLevel: "M",
                color: { dark: "#000000ff", light: "#ffffffff" } });
        }
        if (!cancelled) setImages(output);
      } catch {
        if (!cancelled) { setImages({}); setError("QR gagal dihasilkan. Periksa URL kartu dan coba lagi."); }
      } finally { if (!cancelled) setWorking(false); }
    })();
    return () => { cancelled = true; };
  }, [chosen, palette]);

  function toggle(code: string) {
    setSelected(previous => previous.includes(code)
      ? previous.filter(item => item !== code)
      : previous.length < LIMIT ? [...previous, code] : previous);
  }

  async function printDesign() {
    if (!chosen.length || working || chosen.some(c => !images[c.card_code])) return;
    window.print();
  }

  const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", padding: "10px 13px", borderRadius: 9, fontWeight: 700, cursor: "pointer" };
  const inp: React.CSSProperties = { boxSizing: "border-box", width: "100%", border: "1px solid #cbd5e1", padding: "9px 11px", borderRadius: 9 };
  const cardVisual = (card: Card, back: boolean) => {
    const qrImage = images[card.card_code];
    const qr = <div className="designer-qr-container">
      {qrImage ? <img className="designer-qr" src={qrImage} alt={"QR " + card.card_code}/> : <span>QR disiapkan…</span>}
      <span className="designer-scan-label">SCAN QR</span>
    </div>;
    const nfc = <div className="designer-nfc"><div className="designer-nfc-icon">◉</div><strong>TAP NFC</strong><small>Dekatkan ponsel</small></div>;
    return <div key={card.card_code + (back ? "-back" : "-front")} className={"designer-print-card " + (theme === "navy" ? "designer-dark" : "designer-light")}>
      <div className="designer-top">
        <span className="designer-brand"><b>Yuk</b><strong>Review</strong><i>✦</i></span>
        <span className="designer-card-code">{card.card_code}</span>
      </div>
      <div className="designer-mid">
        <div className="designer-stars">★★★★★</div>
        <h3>{headline || "Beri Ulasan Google"}</h3>
        <p>{subtitle || "Scan QR atau tap NFC"}</p>
        {card.label && <div className="designer-shop">{card.label}</div>}
      </div>
      <div className="designer-controls">{back ? <>{nfc}{qr}</> : <>{qr}{nfc}</>}</div>
      <div className="designer-bottom">ULASAN JADI PELUANG <span>yukreview.id</span></div>
    </div>;
  };

  return <main className="designer-root">
    <style>{`
      .designer-root{max-width:1120px;margin:36px auto 70px;padding:0 20px;color:#111827;font-family:Arial,sans-serif}
      .designer-shell{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:18px}
      .designer-grid{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:18px;align-items:start}
      .designer-item{display:flex;align-items:center;gap:9px;padding:11px;border-bottom:1px solid #e2e8f0;cursor:pointer}
      .designer-item small{display:block;color:#64748b;margin-top:3px}
      .designer-samples{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
      .designer-print-card{width:100mm;height:100mm;flex:0 0 100mm;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:5mm;padding:5mm;display:flex;flex-direction:column;justify-content:space-between;page-break-inside:avoid;break-inside:avoid;overflow:hidden}
      .designer-light{background:#fff;color:#10203c}.designer-dark{background:#0c1b35;color:white;border-color:#142a4d}
      .designer-top,.designer-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .designer-brand{font-size:15px;white-space:nowrap;color:#e32a35}.designer-brand strong{color:#2462ba}.designer-brand i{font-size:10px;font-style:normal}
      .designer-dark .designer-brand strong{color:#86b5ff}
      .designer-card-code{font-size:10px;color:inherit;opacity:.75}
      .designer-mid{text-align:center;padding:3mm 0;min-height:25mm}
      .designer-stars{font-size:21px;letter-spacing:2px;color:#f5a524}
      .designer-mid h3{font-size:17px;line-height:1.18;margin:3mm 0 1mm}
      .designer-mid p{font-size:10px;line-height:1.35;margin:0 auto;max-width:72mm}
      .designer-shop{font-size:10px;font-weight:700;margin-top:2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .designer-controls{display:flex;justify-content:center;align-items:center;gap:8mm}
      .designer-qr-container{width:38mm;text-align:center;font-size:9px;font-weight:700}
      .designer-qr{display:block;width:35mm;height:35mm;object-fit:contain;margin:auto;background:white}
      .designer-scan-label{display:block;margin-top:1mm;font-size:9px}
      .designer-nfc{width:31mm;height:36mm;border:1.2px solid currentColor;border-radius:5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm}
      .designer-nfc-icon{font-size:32px;line-height:1}.designer-nfc strong{font-size:13px}.designer-nfc small{font-size:8px}
      .designer-bottom{font-size:9px;font-weight:700;letter-spacing:.5px;opacity:.75}
      .designer-print-only{display:none}
      @media(max-width:800px){.designer-grid{grid-template-columns:1fr}.designer-samples{overflow-x:auto}}
      @media print{
        @page{size:A4 portrait;margin:4mm}
        body{background:#fff!important;margin:0!important}
        .designer-root{max-width:none;margin:0;padding:0}
        .designer-no-print{display:none!important}
        .designer-print-only{display:block}
        .designer-print-sheet{display:flex;flex-wrap:wrap;align-content:flex-start;gap:1mm 2mm;break-after:page;page-break-after:always}
        .designer-print-sheet:last-child{break-after:auto;page-break-after:auto}
        .designer-print-card{border-radius:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      }
    `}</style>
    <div className="designer-no-print">
      <Link href="/provider/cards" style={{ color: "#1d4ed8", textDecoration: "none" }}>← Kembali ke Provider Kartu</Link>
      <h1 style={{ fontSize: 29, marginBottom: 7 }}>Bulk Editing Designer</h1>
      <p style={{ color: "#64748b", lineHeight: 1.6 }}>Atur desain kartu YukReview secara massal. QR Rainbow dan Klasik memakai URL kartu asli; sisi belakang menukar posisi QR dan NFC. Tidak ada PIN aktivasi yang dicetak.</p>
      <div className="designer-grid">
        <section className="designer-shell">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>1. Pilih kartu ({selected.length}/{LIMIT})</h2>
          <input style={inp} placeholder="Cari kode, label, area, SKU…" value={filter} onChange={e => setFilter(e.target.value)}/>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={btn} type="button" onClick={() => setSelected(filtered.slice(0, LIMIT).map(c => c.card_code))}>Pilih {Math.min(LIMIT, filtered.length)} teratas</button>
            <button style={btn} type="button" onClick={() => setSelected([])}>Kosongkan</button>
          </div>
          <p style={{ color: "#64748b", fontSize: 12 }}>Maksimal {LIMIT} kartu per sesi untuk menjaga kualitas dan performa QR saat cetak.</p>
          {error && <p role="alert" style={{ color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: 10 }}>{error}</p>}
          <div style={{ maxHeight: 330, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            {!loaded ? <p style={{ padding: 12 }}>Memuat kartu…</p> : !filtered.length ? <p style={{ padding: 12 }}>Kartu tidak ditemukan.</p> :
              filtered.map(c => <label className="designer-item" key={c.card_code}>
                <input type="checkbox" checked={selected.includes(c.card_code)} onChange={() => toggle(c.card_code)}/>
                <span><strong>{c.card_code}</strong><small>{c.label || "Tanpa label"} · {c.area || "Tanpa area"}</small></span>
              </label>)}
          </div>
          <h2 style={{ fontSize: 18 }}>2. Atur tampilan</h2>
          <label style={{ display: "block", marginBottom: 10 }}>Warna QR<select style={inp} value={palette} onChange={e => setPalette(e.target.value as Palette)}>
            <option value="rainbow">Rainbow · gradasi pelangi</option><option value="classic">Klasik · hitam putih</option>
          </select></label>
          <label style={{ display: "block", marginBottom: 10 }}>Tema desain<select style={inp} value={theme} onChange={e => setTheme(e.target.value as Theme)}>
            <option value="light">Clean White</option><option value="navy">Premium Navy</option>
          </select></label>
          <label style={{ display: "block", marginBottom: 10 }}>Headline<input style={inp} value={headline} maxLength={70} onChange={e => setHeadline(e.target.value)}/></label>
          <label style={{ display: "block", marginBottom: 10 }}>Subheadline<input style={inp} value={subtitle} maxLength={115} onChange={e => setSubtitle(e.target.value)}/></label>
          <label style={{ display: "flex", gap: 9, marginBottom: 16, alignItems: "center" }}><input type="checkbox" checked={backEnabled} onChange={e => setBackEnabled(e.target.checked)}/> Cetak dua sisi (QR/NFC bertukar pada belakang)</label>
          <button type="button" style={{ ...btn, background: "#101b30", color: "white", width: "100%" }} disabled={!chosen.length || working || chosen.some(c => !images[c.card_code])} onClick={() => void printDesign()}>
            {working ? "Menyiapkan QR…" : "Cetak / Simpan PDF"}
          </button>
          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>Pilih A4, skala 100%, latar belakang grafis aktif. Untuk cetak dua sisi, halaman depan dan belakang ditampilkan berurutan; periksa pengaturan balik kertas printer.</p>
        </section>
        <section className="designer-shell">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Preview 10 × 10 cm</h2>
          <p style={{ fontSize: 12, color: "#64748b" }}>Desain layar adalah preview. Untuk cetak akurat gunakan Simpan PDF / Cetak.</p>
          <div className="designer-samples">
            {chosen.length ? <>{cardVisual(chosen[0], false)}{backEnabled && cardVisual(chosen[0], true)}</> : <p>Pilih minimal satu kartu untuk menampilkan preview.</p>}
          </div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 18 }}>Sisi depan: QR kiri, NFC kanan. Sisi belakang: NFC kiri, QR kanan.</p>
        </section>
      </div>
    </div>
    <div className="designer-print-only">
      {Array.from({ length: Math.ceil(chosen.length / 4) }, (_, page) =>
        <div className="designer-print-sheet" key={"front-" + page}>
          {chosen.slice(page * 4, page * 4 + 4).map(c => cardVisual(c, false))}
        </div>
      )}
      {backEnabled && Array.from({ length: Math.ceil(chosen.length / 4) }, (_, page) =>
        <div className="designer-print-sheet" key={"back-" + page}>
          {chosen.slice(page * 4, page * 4 + 4).map(c => cardVisual(c, true))}
        </div>
      )}
    </div>
  </main>;
}

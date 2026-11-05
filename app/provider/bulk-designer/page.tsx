"use client";
import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ProviderMfaGate from "../../components/ProviderMfaGate";
import { supabase } from "../../../lib/supabase";

type Card = { card_code: string; qr_url: string; internal_code: string; label: string };
const SIDE = 1417; // 12 cm @ 300 DPI; actual 10 cm export at ~360 DPI
const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
function parseCSV(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", quote = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') { if (quote && source[i + 1] === '"') { field += '"'; i++; } else quote = !quote; }
    else if (!quote && c === ",") { row.push(field); field = ""; }
    else if (!quote && (c === "\n" || c === "\r")) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += c;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
function getCards(csv: string): Card[] {
  const rows = parseCSV(csv); const head = (rows.shift() || []).map(x => x.trim().toLowerCase().replace(/^\uFEFF/, ""));
  const col = (key: string) => head.indexOf(key);
  if (col("card_code") < 0 || col("qr_url") < 0) throw Error("CSV wajib memiliki kolom card_code dan qr_url.");
  const seen = new Set<string>();
  return rows.map(r => {
    const card_code = (r[col("card_code")] || "").trim();
    const qr_url = (r[col("qr_url")] || "").trim();
    if (!/^ULAS-[A-Z0-9-]+$/i.test(card_code) || seen.has(card_code)) throw Error("Kode kartu kosong, duplikat, atau tidak valid: " + card_code);
    seen.add(card_code);
    const url = new URL(qr_url);
    if (url.protocol !== "https:" || url.hostname !== "yukreview.id") throw Error("URL QR tidak valid untuk " + card_code);
    return { card_code, qr_url: url.href, internal_code: (r[col("internal_code")] || "").trim(), label: (r[col("label")] || "").trim() };
  }).filter(x => x.card_code);
}
async function renderCard(card: Card): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas"); c.width = SIDE; c.height = SIDE;
  const g = c.getContext("2d"); if (!g) throw Error("Canvas tidak tersedia");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, SIDE, SIDE);
  // Vector-like geometric layout rasterized at high resolution
  g.fillStyle = "#122c61"; g.fillRect(0, 0, SIDE, 222);
  g.fillStyle = "#e63e46"; g.fillRect(0, 208, SIDE, 14);
  g.textAlign = "center"; g.fillStyle = "#fff"; g.font = "bold 86px Arial, sans-serif"; g.fillText("YukReview", SIDE / 2, 132);
  g.font = "bold 30px Arial, sans-serif"; g.fillStyle = "#dbeafe"; g.fillText("ULASAN JADI PELUANG", SIDE / 2, 185);
  g.fillStyle = "#142b56"; g.font = "bold 65px Arial, sans-serif"; g.fillText("BAGIKAN ULASAN ANDA", SIDE / 2, 322);
  g.font = "36px Arial, sans-serif"; g.fillStyle = "#52627b"; g.fillText("Scan QR atau tap NFC untuk terhubung", SIDE / 2, 380);
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, card.qr_url, { width: 760, margin: 3, errorCorrectionLevel: "H", color: { dark: "#10264d", light: "#ffffff" } });
  g.fillStyle = "#f1f5fa"; g.beginPath(); g.roundRect(302, 426, 814, 814, 32); g.fill();
  g.drawImage(qr, 329, 453, 760, 760);
  g.fillStyle = "#e63e46"; g.fillRect(0, 1272, SIDE, 12);
  g.fillStyle = "#142b56"; g.font = "bold 48px Arial, sans-serif"; g.fillText(card.card_code, SIDE / 2, 1354);
  g.font = "27px Arial, sans-serif"; g.fillStyle = "#52627b"; g.fillText(card.internal_code || "YUKREVIEW NFC + QR", SIDE / 2, 1394);
  return c;
}
function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (const b of bytes) { crc ^= b; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ -1) >>> 0;
}
function zipFiles(files: { name: string; data: Uint8Array }[]): Blob {
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = [];
  const encoder = new TextEncoder(); let offset = 0;
  const u16 = (v: DataView, i: number, n: number) => v.setUint16(i, n, true);
  const u32 = (v: DataView, i: number, n: number) => v.setUint32(i, n >>> 0, true);
  for (const f of files) {
    const name = encoder.encode(f.name), crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length), v = new DataView(local.buffer);
    u32(v, 0, 0x04034b50); u16(v, 4, 20); u16(v, 8, 0); u32(v, 14, crc);
    u32(v, 18, f.data.length); u32(v, 22, f.data.length); u16(v, 26, name.length); local.set(name, 30);
    chunks.push(local, f.data);
    const entry = new Uint8Array(46 + name.length), e = new DataView(entry.buffer);
    u32(e, 0, 0x02014b50); u16(e, 4, 20); u16(e, 6, 20); u32(e, 16, crc);
    u32(e, 20, f.data.length); u32(e, 24, f.data.length); u16(e, 28, name.length);
    u32(e, 42, offset); entry.set(name, 46); directory.push(entry);
    offset += local.length + f.data.length;
  }
  const centralLength = directory.reduce((n, x) => n + x.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  u32(e, 0, 0x06054b50); u16(e, 8, files.length); u16(e, 10, files.length);
  u32(e, 12, centralLength); u32(e, 16, offset);
  return new Blob([...chunks.map(x => x as BlobPart), ...directory.map(x => x as BlobPart), end], { type: "application/zip" });
}
// A3+ 329 × 483 mm, 300 DPI. Twelve 100 × 100 mm cards per sheet.
const PRINT_DPI = 300;
const mm = (v: number) => Math.round(v / 25.4 * PRINT_DPI);
async function renderSheet(cards: Card[]): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = mm(329); canvas.height = mm(483);
  const g = canvas.getContext("2d"); if (!g) throw Error("Canvas tidak tersedia");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, canvas.width, canvas.height);
  // 3 columns × 4 rows; 5 mm gaps and centered on the sheet.
  const cardSize = mm(100), gap = mm(5);
  const left = Math.round((canvas.width - (3 * cardSize + 2 * gap)) / 2);
  const top = Math.round((canvas.height - (4 * cardSize + 3 * gap)) / 2);
  for (let i = 0; i < cards.length; i++) {
    const x = left + (i % 3) * (cardSize + gap);
    const y = top + Math.floor(i / 3) * (cardSize + gap);
    const card = await renderCard(cards[i]);
    g.drawImage(card, x, y, cardSize, cardSize);
    g.strokeStyle = "#9ca3af"; g.lineWidth = 1;
    const mark = mm(2), d = mm(1);
    // Crop marks stay outside the card trim area.
    for (const [cx, cy, dx, dy] of [[x,y,-1,-1],[x+cardSize,y,1,-1],[x,y+cardSize,-1,1],[x+cardSize,y+cardSize,1,1]]) {
      g.beginPath(); g.moveTo(cx + dx * d, cy); g.lineTo(cx + dx * (d + mark), cy);
      g.moveTo(cx, cy + dy * d); g.lineTo(cx, cy + dy * (d + mark)); g.stroke();
    }
  }
  return canvas;
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function canvasPng(c: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(Error("Gagal membuat PNG")), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}
export default function BulkDesignerPage() {
  return <ProviderMfaGate><Designer /></ProviderMfaGate>;
}
function Designer() {
  const [allowed, setAllowed] = useState(false), [checking, setChecking] = useState(true);
  const [cards, setCards] = useState<Card[]>([]), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { if (live) setChecking(false); return; }
      const { data, error } = await supabase.rpc("v3_is_provider_admin");
      if (live) { setAllowed(!error && data === true); setChecking(false); }
    })().catch(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, []);
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    setError(""); setCards([]); setPreview("");
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2_000_000) { setError("CSV maksimal 2 MB."); return; }
    try {
      const parsed = getCards(await file.text());
      if (!parsed.length || parsed.length > 500) throw Error("Jumlah kartu harus 1–500.");
      setCards(parsed);
      const c = await renderCard(parsed[0]); setPreview(c.toDataURL("image/png"));
    } catch (err) { setError(err instanceof Error ? err.message : "CSV tidak dapat dibaca."); }
  }
  async function exportZip() {
    if (!cards.length || busy) return;
    setBusy(true); setError("");
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < cards.length; i++) {
        setProgress("Rendering kartu " + (i + 1) + "/" + cards.length);
        const c = await renderCard(cards[i]);
        files.push({ name: clean(cards[i].card_code) + ".png", data: await canvasPng(c) });
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }
      setProgress("Membuat ZIP...");
      download(zipFiles(files), "YukReview-Print-HD-" + cards.length + "-kartu.zip");
      setProgress("Selesai. " + cards.length + " PNG siap cetak.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat ZIP."); }
    finally { setBusy(false); }
  }
  async function exportA3() {
    if (!cards.length || busy) return;
    setBusy(true); setError("");
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (let i = 0; i < cards.length; i += 12) {
        setProgress("Menyiapkan lembar A3+ " + (Math.floor(i / 12) + 1) + "/" + Math.ceil(cards.length / 12));
        const sheet = await renderSheet(cards.slice(i, i + 12));
        files.push({ name: "YukReview-A3plus-" + String(Math.floor(i / 12) + 1).padStart(3, "0") + ".png", data: await canvasPng(sheet) });
        await new Promise(r => setTimeout(r, 0));
      }
      download(zipFiles(files), "YukReview-A3plus-300DPI-" + cards.length + "-kartu.zip");
      setProgress("Selesai. " + files.length + " lembar A3+ siap untuk proof print.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat layout A3+."); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:1050,margin:"36px auto",padding:24,fontFamily:"Arial,sans-serif",color:"#142b56"}}>
    <Link href="/provider/cards">← Kembali ke Provider Cards</Link>
    <h1 style={{fontSize:34,marginBottom:8}}>YukReview Bulk Card Designer</h1>
    <p>Import CSV Bulk Creator, otomatis buat QR unik dan desain kartu PNG resolusi tinggi. Semua proses dilakukan di browser; PIN aktivasi tidak dicetak atau diunggah.</p>
    {checking ? <p>Memeriksa akses Provider...</p> : !allowed ? <p role="alert">Akses khusus Provider. Silakan login sebagai Provider terlebih dahulu.</p> :
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:28,marginTop:28}}>
      <section style={{padding:24,border:"1px solid #cbd5e1",borderRadius:18}}>
        <h2>1. Upload CSV</h2>
        <input aria-label="Upload CSV Bulk Creator" type="file" accept=".csv,text/csv" onChange={importFile} disabled={busy}/>
        <p>Kolom wajib: <code>card_code</code> dan <code>qr_url</code>. Mendukung hingga 500 kartu per batch.</p>
        <p><strong>{cards.length} kartu</strong> siap diproses.</p>
        {cards.length > 0 && <p>Contoh: {cards[0].card_code} → {cards[cards.length - 1].card_code}</p>}
        <h2>2. Export HD</h2>
        <p>PNG individual 1417 × 1417 px (~360 DPI pada 10 × 10 cm), QR error correction H. Layout A3+ 329 × 483 mm pada 300 DPI: 12 kartu per lembar (3 × 4), ukuran potong 10 × 10 cm dengan jarak 5 mm dan crop marks.</p>
        <button type="button" disabled={!cards.length || busy} onClick={exportZip} style={{background:"#122c61",color:"white",border:0,borderRadius:10,padding:"15px 22px",fontWeight:700,cursor:"pointer"}}>{busy ? "Memproses..." : "Download ZIP PNG HD"}</button>
        <button type="button" disabled={!cards.length || busy} onClick={exportA3} style={{display:"block",marginTop:12,background:"#e53d46",color:"#fff",border:0,borderRadius:10,padding:"15px 22px",fontWeight:700,cursor:"pointer"}}>{busy ? "Memproses..." : "Download Layout A3+ 300 DPI"}</button>
        {progress && <p role="status">{progress}</p>}
        {error && <p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
        <p style={{fontSize:13,color:"#64748b"}}>Pastikan hasil proof print dan uji scan QR sebelum cetak massal. Template ini adalah desain produksi awal, bukan salinan persis template Figma.</p>
      </section>
      <section><h2>Preview kartu pertama</h2>{preview ? <img src={preview} alt="Preview kartu YukReview" style={{width:"100%",maxWidth:480,borderRadius:14,boxShadow:"0 10px 40px #142b5622"}}/> : <p>Preview akan muncul setelah CSV diunggah.</p>}</section>
    </div>}
  </main>;
}

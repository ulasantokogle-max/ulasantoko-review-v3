"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getCardPublicUrl } from "../../lib/cardPublicId";

type CreatedCard = {
  card_code: string;
  activation_pin: string;
  qr_url: string;
  nfc_url: string;
  label: string;
  area: string;
  internal_code: string;
};

const MAX_BATCH = 25;
function csvCell(value: string): string {
  // Protect spreadsheet users from formula injection.
  const safe = /^[\s]*[=+@\-\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}
function exportCsv(cards: CreatedCard[]) {
  const headers = ["card_code", "activation_pin", "qr_url", "nfc_url", "label", "area", "internal_code"];
  const rows = cards.map(card => headers.map(key => csvCell(card[key as keyof CreatedCard])).join(","));
  const blob = new Blob(["\uFEFF", headers.join(","), "\r\n", rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "yukreview-bulk-" + new Date().toISOString().slice(0, 10) + ".csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
export default function BulkCardCreator({ onComplete }: { onComplete?: () => void }) {
  const [quantity, setQuantity] = useState(5);
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [cards, setCards] = useState<CreatedCard[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(0);
  const busy = useRef(false);
  const exported = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!running && (cards.length === 0 || exported.current)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running, cards.length]);

  async function createBatch() {
    if (busy.current || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BATCH) return;
    if (cards.length > 0 && !exported.current) {
      setError("Konfirmasi penyimpanan CSV batch sebelumnya terlebih dahulu. PIN tidak dapat diambil ulang dari inventori.");
      return;
    }
    if (cards.length > 0 && exported.current && !window.confirm("Mulai batch baru? Pastikan CSV batch sebelumnya sudah tersimpan.")) return;
    if (!window.confirm("Buat " + quantity + " kartu baru? Setiap kartu memiliki PIN rahasia berbeda. Proses tidak dapat dibatalkan setelah RPC terkirim.")) return;
    busy.current = true;
    exported.current = false;
    setRunning(true); setError(""); setCompleted(0); setCards([]);
    const created: CreatedCard[] = [];
    const seenCodes = new Set<string>();
    const batchLabel = label.trim();
    const batchArea = area.trim();
    const batchInternalCode = internalCode.trim();
    try {
      for (let i = 0; i < quantity; i++) {
        // Do not automatically retry ambiguous network failures: a card may already have been created.
        const { data, error: rpcError } = await supabase.rpc("v3_provider_create_card", {
          p_label: batchLabel || null,
          p_area: batchArea || null,
          p_internal_code: batchInternalCode || null,
        });
        if (!mounted.current) break;
        if (rpcError || data?.success !== true || !data.card_code || !data.activation_pin || !data.qr_url) {
          setError("Proses berhenti di kartu ke-" + (i + 1) + ". Jangan langsung mengulang: periksa inventori terlebih dahulu untuk mencegah kartu ganda.");
          break;
        }
        if (seenCodes.has(data.card_code)) {
          setError("Kode kartu duplikat terdeteksi. Proses dihentikan; periksa inventori dan ekspor hasil yang sudah berhasil.");
          break;
        }
        seenCodes.add(data.card_code);
        const url = getCardPublicUrl(data.qr_url, data.card_code);
        created.push({
          card_code: data.card_code, activation_pin: data.activation_pin,
          qr_url: url, nfc_url: url,
          label: batchLabel, area: batchArea, internal_code: batchInternalCode,
        });
        setCards([...created]); setCompleted(created.length);
      }
      if (mounted.current && created.length > 0) onComplete?.();
    } catch {
      if (mounted.current) setError("Koneksi terputus. Periksa inventori sebelum membuat batch baru.");
    } finally {
      busy.current = false;
      if (mounted.current) setRunning(false);
    }
  }

  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, marginBottom: 18 }}>
      <h2 style={{ marginTop: 0 }}>Buat Kartu Massal (Bulk)</h2>
      <p style={{ color: "#64748b", lineHeight: 1.6 }}>
        Buat 1–25 kartu per batch menggunakan RPC Provider V3 yang sudah ada. Setiap kartu mendapat kode, PIN, dan URL QR/NFC unik. Simpan CSV segera: PIN tidak tersedia lagi dari daftar inventori.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        <label>Jumlah kartu
          <input type="number" min={1} max={MAX_BATCH} step={1} value={quantity} disabled={running} onChange={e => setQuantity(Number(e.target.value))} style={{ display: "block", width: "100%", padding: 10, boxSizing: "border-box" }} />
        </label>
        <label>Label (opsional)
          <input value={label} maxLength={100} disabled={running} onChange={e => setLabel(e.target.value)} style={{ display: "block", width: "100%", padding: 10, boxSizing: "border-box" }} />
        </label>
        <label>Area / Batch
          <input value={area} maxLength={100} disabled={running} onChange={e => setArea(e.target.value)} style={{ display: "block", width: "100%", padding: 10, boxSizing: "border-box" }} />
        </label>
        <label>SKU internal
          <input value={internalCode} maxLength={100} disabled={running} onChange={e => setInternalCode(e.target.value)} style={{ display: "block", width: "100%", padding: 10, boxSizing: "border-box" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button type="button" disabled={running || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BATCH} onClick={createBatch} style={{ background: "#1e3a8a", color: "#fff", border: 0, borderRadius: 10, padding: "11px 16px", fontWeight: 700 }}>
          {running ? "Memproses " + completed + "/" + quantity : "Buat " + quantity + " Kartu"}
        </button>
        <button type="button" disabled={running || cards.length === 0} onClick={() => {
          if (window.confirm("Ekspor CSV berisi PIN aktivasi rahasia? Simpan di tempat aman dan jangan bagikan secara publik.")) {
            exportCsv(cards);
            // A browser download click cannot prove that the file was saved.
            exported.current = window.confirm("Pastikan file CSV sudah benar-benar tersimpan dan dapat dibuka. Konfirmasi bahwa Anda telah memeriksanya?");
          }
        }} style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "11px 16px" }}>
          Ekspor CSV ({cards.length})
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {cards.length > 0 && <p role="status">Berhasil dibuat: {cards.length} kartu. {running ? "Proses berjalan." : "Ekspor CSV sekarang untuk menyimpan PIN."}</p>}
      {cards.length > 0 && <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr><th style={{ textAlign: "left", padding: 8 }}>Kode Kartu</th><th style={{ textAlign: "left", padding: 8 }}>PIN</th><th style={{ textAlign: "left", padding: 8 }}>URL QR / NFC</th></tr></thead>
          <tbody>{cards.map(card => <tr key={card.card_code}><td style={{ padding: 8 }}>{card.card_code}</td><td style={{ padding: 8 }}>••••••</td><td style={{ padding: 8, overflowWrap: "anywhere" }}>{card.qr_url}</td></tr>)}</tbody>
        </table>
      </div>}
    </section>
  );
}

"use client";

import { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getCardPublicUrl } from "../../lib/cardPublicId";

type Row = {
  card_code: string;
  activation_pin: string;
  qr_url: string;
  label: string;
  area: string;
  internal_code: string;
  sync: "pending" | "saved" | "failed";
};

type CreatedCard = {
  success?: boolean;
  card_code?: string;
  activation_pin?: string;
  qr_url?: string;
};

export default function ProviderBulkCreateCards({ onComplete }: { onComplete: () => Promise<void> }) {
  const busy = useRef(false);
  const [quantity, setQuantity] = useState(5);
  const [prefix, setPrefix] = useState("");
  const [area, setArea] = useState("");
  const [sku, setSku] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [rechecking, setRechecking] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);

  async function getSessionToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw Error("Sesi Provider berakhir. Silakan login ulang.");
    return session.access_token;
  }

  async function requireSheetsConnection(token: string) {
    const res = await fetch("/api/provider/sync-card-sheet", {
      headers: { Authorization: "Bearer " + token }, cache: "no-store",
    });
    if (!res.ok) throw Error("Google Sheets belum terhubung. Klik Cek Koneksi Google Sheets dan perbaiki masalahnya sebelum membuat kartu massal.");
    const data = await res.json();
    if (!data.success) throw Error("Koneksi Google Sheets belum berhasil.");
  }

  async function syncRow(row: Row, token: string) {
    const res = await fetch("/api/provider/sync-card-sheet", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(row),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw Error("Pencatatan kartu " + row.card_code + " ke spreadsheet gagal.");
  }

  async function startBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const count = Number(quantity);
    if (!Number.isInteger(count) || count < 1 || count > 30) {
      setError("Jumlah kartu harus antara 1 sampai 30 per batch.");
      return;
    }
    if (rows.length > 0 && !window.confirm("Hasil batch sebelumnya akan hilang dari tampilan. Pastikan PIN sudah tercatat di Google Sheets atau telah diunduh sebagai cadangan. Lanjutkan?")) return;
    busy.current = true;
    setRunning(true);
    setError("");
    setRows([]);
    setProgress("Memeriksa akses Google Sheets…");
    let created = 0;
    try {
      const token = await getSessionToken();
      await requireSheetsConnection(token);
      for (let i = 0; i < count; i++) {
        setProgress("Membuat kartu " + (i + 1) + " dari " + count + "…");
        const label = prefix.trim() ? prefix.trim() + "-" + String(i + 1).padStart(3, "0") : "";
        const internal_code = sku.trim() ? sku.trim() + "-" + String(i + 1).padStart(3, "0") : "";
        let result: CreatedCard;
        try {
          const response = await supabase.rpc("v3_provider_create_card", {
            p_label: label || null,
            p_area: area.trim() || null,
            p_internal_code: internal_code || null,
          });
          if (response.error || !response.data?.success) {
            throw Error("Pembuatan kartu ke-" + (i + 1) + " gagal atau hasilnya belum pasti. Periksa inventori sebelum mencoba lagi.");
          }
          result = response.data as CreatedCard;
        } catch {
          throw Error("Pembuatan kartu ke-" + (i + 1) + " gagal atau tidak dapat dikonfirmasi. Jangan mulai ulang batch; cek inventori terlebih dahulu.");
        }
        created++;
        const row: Row = {
          card_code: String(result.card_code || ""),
          activation_pin: String(result.activation_pin || ""),
          qr_url: getCardPublicUrl(result.qr_url || "", result.card_code || ""),
          label, area: area.trim(), internal_code, sync: "pending",
        };
        setRows(prev => [...prev, row]);
        if (!/^ULAS-[0-9]{5,}$/.test(row.card_code) || !/^[0-9]{6}$/.test(row.activation_pin)) {
          setRows(prev => prev.map(r => r.card_code === row.card_code ? { ...r, sync: "failed" } : r));
          throw Error("Data kartu " + (i + 1) + " tidak lengkap. Jangan membuat ulang; simpan hasil yang tersedia dan hubungi admin.");
        }
        setProgress("Mencatat " + row.card_code + " ke Google Sheets…");
        try {
          await syncRow(row, token);
          setRows(prev => prev.map(r => r.card_code === row.card_code ? { ...r, sync: "saved" } : r));
        } catch {
          setRows(prev => prev.map(r => r.card_code === row.card_code ? { ...r, sync: "failed" } : r));
          throw Error("Kartu " + row.card_code + " sudah dibuat tetapi gagal dicatat ke Google Sheets. Batch dihentikan. Gunakan Coba Sinkronkan Lagi, JANGAN buat batch ulang.");
        }
      }
      setProgress("Selesai: " + created + " kartu berhasil dibuat dan dicatat ke tab Kartu Otomatis.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch dihentikan. Periksa inventori.");
      setProgress(created > 0 ? created + " kartu sudah dibuat. Tidak ada kartu tambahan yang akan dibuat." : "");
    } finally {
      busy.current = false;
      setRunning(false);
      if (created > 0) void onComplete();
    }
  }

  async function retry(row: Row) {
    if (running || rechecking) return;
    setRechecking(row.card_code);
    setError("");
    try {
      const token = await getSessionToken();
      await syncRow(row, token);
      setRows(prev => prev.map(r => r.card_code === row.card_code ? { ...r, sync: "saved" } : r));
    } catch {
      setError("Sinkronisasi " + row.card_code + " masih gagal. Jangan buat ulang kartunya.");
    } finally { setRechecking(null); }
  }

  function downloadCsv() {
    if (!rows.length) return;
    // Escape spreadsheet formulas in operator-entered fields.
    const safe = (v: string) => {
      const value = /^[=+@\-\t\r]/.test(v) ? "'" + v : v;
      return '"' + value.replace(/"/g, '""') + '"';
    };
    const values = [
      ["Kode Kartu", "PIN Aktivasi", "URL QR/NFC", "Label", "Area", "Kode Internal", "Status Google Sheets"],
      ...rows.map(r => [r.card_code, r.activation_pin, r.qr_url, r.label, r.area, r.internal_code, r.sync]),
    ];
    const blob = new Blob(["\ufeff" + values.map(line => line.map(safe).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yukreview-bulk-kartu-" + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", minWidth: 0, border: "1px solid #cbd5e1", borderRadius: 9, padding: "11px 12px", color: "#0f172a", background: "#fff" };
  const btn: React.CSSProperties = { border: 0, borderRadius: 9, padding: "11px 14px", fontWeight: 800, cursor: "pointer", background: "#0f172a", color: "#fff" };
  return (
    <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 20, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Buat Kartu Massal (Bulk Create)</h2>
        <span style={{ background: "#eaf2ff", color: "#1d4ed8", padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>Google Sheets Auto Sync</span>
      </div>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
        Buat 1–30 kartu sekaligus. Setiap kartu langsung dicatat ke tab <strong>Kartu Otomatis</strong> dalam spreadsheet master yang sama.
        Proses berjalan satu per satu dan berhenti otomatis jika pembuatan kartu atau pencatatan gagal.
      </p>
      <form onSubmit={startBulk} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Jumlah kartu
          <input style={{ ...input, marginTop: 5 }} type="number" min={1} max={30} step={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} disabled={running} required />
        </label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Prefix label (opsional)
          <input style={{ ...input, marginTop: 5 }} value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="Mis. BATCH-NOV" maxLength={90} disabled={running}/>
        </label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Area / batch (opsional)
          <input style={{ ...input, marginTop: 5 }} value={area} onChange={e => setArea(e.target.value)} placeholder="Mis. BEKASI" maxLength={90} disabled={running}/>
        </label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Prefix SKU (opsional)
          <input style={{ ...input, marginTop: 5 }} value={sku} onChange={e => setSku(e.target.value)} placeholder="Mis. YRK-BKS" maxLength={90} disabled={running}/>
        </label>
        <button type="submit" disabled={running || !!rechecking} style={{ ...btn, alignSelf: "end", opacity: running ? 0.6 : 1 }}>
          {running ? "Memproses…" : "Buat & Sinkronkan Massal"}
        </button>
      </form>
      {progress && <p role="status" style={{ fontSize: 13, color: "#1d4ed8", marginBottom: 4 }}>{progress}</p>}
      {error && <p role="alert" style={{ background: "#fff7ed", color: "#9a3412", padding: 10, borderRadius: 9, fontSize: 13 }}>{error}</p>}
      {!!rows.length && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <strong>{rows.length} kartu dibuat • {rows.filter(x => x.sync === "saved").length} tercatat di Sheets</strong>
            <button type="button" onClick={() => setShowPins(x => !x)} style={{ ...btn, background: "#f1f5f9", color: "#0f172a" }}>{showPins ? "Sembunyikan PIN" : "Lihat PIN"}</button>
            <button type="button" onClick={downloadCsv} style={{ ...btn, background: "#eff6ff", color: "#1d4ed8" }}>Unduh CSV Cadangan</button>
          </div>
          <p style={{ fontSize: 12, color: "#b45309" }}>CSV berisi PIN rahasia. Simpan dengan aman dan jangan bagikan ke pihak yang tidak berwenang.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, textAlign: "left" }}>
              <thead><tr>{["Kode Kartu","PIN","Google Sheets","Aksi"].map(h => <th key={h} style={{ padding: 9, borderBottom: "1px solid #cbd5e1" }}>{h}</th>)}</tr></thead>
              <tbody>{rows.map(r => <tr key={r.card_code}>
                <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>{r.card_code}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{showPins ? r.activation_pin : "••••••"}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0", color: r.sync === "saved" ? "#166534" : "#b45309" }}>{r.sync === "saved" ? "✓ Tercatat" : r.sync === "failed" ? "Gagal" : "Memproses"}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>{r.sync === "failed" && <button type="button" disabled={running || !!rechecking} onClick={() => void retry(r)} style={{ ...btn, padding: "7px 10px", background: "#fef3c7", color: "#92400e" }}>{rechecking === r.card_code ? "Mengulang…" : "Coba Sinkronkan Lagi"}</button>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

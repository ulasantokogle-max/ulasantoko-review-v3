"use client";
import { FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Card = { card_id: string; card_code: string; activation_pin: string; qr_url: string; nfc_url: string };
type Batch = { success: boolean; batch_id: string; quantity: number; cards: Card[] };

export default function BulkCreateCards({ onCreated }: { onCreated: () => Promise<void> }) {
  const [quantity, setQuantity] = useState(10);
  const [area, setArea] = useState("");
  const [label, setLabel] = useState("");
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  function download() {
    if (!batch) return;
    const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
    const lines = [
      ["card_code", "activation_pin", "qr_url", "nfc_url", "card_id"],
      ...batch.cards.map((card) => [card.card_code, card.activation_pin, card.qr_url, card.nfc_url, card.card_id]),
    ];
    const csv = "\uFEFF" + lines.map((line) => line.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "yukreview-batch-" + batch.batch_id + ".csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return;
    if (!window.confirm("Buat " + quantity + " kartu? Simpan CSV PIN setelah selesai.")) return;
    setBusy(true);
    setError("");
    setBatch(null);
    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    try {
      const { data, error: rpcError } = await supabase.rpc("v3_provider_create_cards_bulk", {
        p_request_id: id, p_quantity: quantity, p_label: label || null,
        p_area: area || null, p_internal_code: sku || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      const output = data as Batch;
      if (!output?.success || output.cards?.length !== quantity) throw new Error("Respons batch tidak lengkap");
      setBatch(output);
      setRequestId(null);
      // Refresh is best-effort: card creation already committed successfully.
      void onCreated().catch(() => setError("Kartu berhasil dibuat, tetapi daftar inventory belum ter-refresh. Unduh CSV sekarang."));
    } catch (caught) {
      setError((caught instanceof Error ? caught.message : "Gagal membuat batch") +
        ". Periksa inventory sebelum mencoba lagi; respons terputus mungkin berarti kartu sudah dibuat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, marginBottom: 18 }}>
      <h2 style={{ marginTop: 0 }}>Generate Kartu Massal</h2>
      <p style={{ color: "#6b7280" }}>1–100 kartu per batch. Batas 500 kartu per provider per hari.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 620 }}>
        <label>Jumlah kartu
          <input type="number" min={1} max={100} step={1} required value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            style={{ display: "block", padding: 10, width: "100%", boxSizing: "border-box" }} />
        </label>
        <input aria-label="Label" placeholder="Label (opsional)" maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} style={{ padding: 10 }} />
        <input aria-label="Area" placeholder="Area / batch (opsional)" maxLength={100} value={area} onChange={(event) => setArea(event.target.value)} style={{ padding: 10 }} />
        <input aria-label="SKU" placeholder="SKU internal (opsional)" maxLength={100} value={sku} onChange={(event) => setSku(event.target.value)} style={{ padding: 10 }} />
        <button type="submit" disabled={busy || !Number.isInteger(quantity) || quantity < 1 || quantity > 100}
          style={{ padding: 12, border: 0, borderRadius: 10, color: "#fff", background: "#111827", fontWeight: 700 }}>
          {busy ? "Membuat..." : "Generate " + quantity + " Kartu"}
        </button>
      </form>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {batch && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f0fdf4" }}>
          <strong>{batch.quantity} kartu berhasil dibuat.</strong>
          <p>Unduh CSV sekarang. PIN tidak dapat dilihat kembali setelah halaman ditutup.</p>
          <button type="button" onClick={download} style={{ padding: 12, border: 0, borderRadius: 10, background: "#166534", color: "#fff", fontWeight: 700 }}>
            Download CSV Kode + PIN + URL
          </button>
          <p style={{ fontSize: 12 }}>CSV berisi PIN rahasia. Simpan secara aman, jangan bagikan ke publik.</p>
        </div>
      )}
    </section>
  );
}

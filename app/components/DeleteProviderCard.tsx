"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

export default function DeleteProviderCard({ cardId, cardCode, onDeleted }: {
  cardId: string; cardCode: string; onDeleted: (id: string) => void;
}) {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const style = { borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", border: "1px solid #fecaca", color: "#991b1b", background: "#fff1f2" };

  async function removeCard() {
    if (deleting || confirmation.trim() !== cardCode) return;
    setDeleting(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("v3_provider_delete_card", {
        p_card_id: cardId, p_confirm_code: confirmation.trim(),
      });
      if (rpcError || !data?.success) {
        setError(tr("Kartu belum dapat dihapus. Periksa akses 2FA dan pastikan migrasi 0043 sudah dijalankan.", "Unable to delete this card. Check your 2FA access and ensure migration 0043 has been applied."));
        return;
      }
      onDeleted(cardId);
    } catch {
      setError(tr("Kartu belum dapat dihapus. Silakan coba lagi.", "Unable to delete this card. Please try again."));
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return <button type="button" style={style} onClick={() => setOpen(true)}>{tr("Hapus Kartu", "Delete Card")}</button>;
  return (
    <section aria-label={tr(`Hapus kartu ${cardCode}`, `Delete card ${cardCode}`)} style={{ width: "100%", padding: 16, boxSizing: "border-box", borderRadius: 12, border: "1px solid #fecaca", background: "#fff7f7" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{tr("Hapus Kartu", "Delete Card")} {cardCode}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 12px", color: "#991b1b" }}>
        {tr("Kartu akan dihapus dari inventori dan tidak bisa diaktifkan kembali. QR dan NFC kartu ini akan berhenti berfungsi. Data bisnis, feedback, dan kartu lainnya tetap tersedia.", "This card will be removed from inventory and cannot be reactivated. Its QR and NFC will stop working. Business data, feedback, and other cards will remain available.")}
      </p>
      <label style={{ display: "grid", gap: 8, fontSize: 14 }}>
        {tr(`Ketik ${cardCode} untuk konfirmasi`, `Type ${cardCode} to confirm`)}
        <input autoFocus autoComplete="off" value={confirmation} disabled={deleting} onChange={event => setConfirmation(event.target.value)}
          style={{ padding: 12, border: "1px solid #d1d5db", borderRadius: 10, width: "100%", boxSizing: "border-box" }} />
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" disabled={deleting || confirmation.trim() !== cardCode} onClick={removeCard}
          style={{ ...style, color: "#fff", background: "#b91c1c", opacity: deleting || confirmation.trim() !== cardCode ? .5 : 1 }}>
          {deleting ? tr("Menghapus...", "Deleting...") : tr("Konfirmasi Hapus", "Confirm Deletion")}
        </button>
        <button type="button" disabled={deleting} style={{ ...style, background: "#fff", color: "#111827", borderColor: "#d1d5db" }} onClick={() => { setOpen(false); setConfirmation(""); setError(""); }}>
          {tr("Batal", "Cancel")}
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#991b1b", fontSize: 14 }}>{error}</p>}
    </section>
  );
}

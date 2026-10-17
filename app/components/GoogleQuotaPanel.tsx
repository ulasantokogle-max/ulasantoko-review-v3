"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

type Usage = { daily_used: number; daily_limit: number; monthly_used: number; monthly_reference: number; day: string; month: string; tracking_since: string | null; blocked: boolean };

export default function GoogleQuotaPanel() {
  const { tr } = useLanguage();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  async function reload() {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("v3_get_google_request_usage");
      const valid = !rpcError && data?.success === true &&
        [data.daily_used, data.daily_limit, data.monthly_used, data.monthly_reference].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0) && data.daily_limit > 0 && data.monthly_reference > 0;
      setError(!valid);
      setUsage(valid ? data : null);
    } catch { setError(true); setUsage(null); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    reload();
    const timer = window.setInterval(() => { if (document.visibilityState !== "hidden") reload(); }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  function meter(label: string, used: number, limit: number) {
    const percent = Math.floor(used / limit * 100);
    const notice = percent >= 100 ? tr("Batas tercapai", "Limit reached") : percent >= 90 ? tr("Mendekati batas", "Near limit") : percent >= 80 ? tr("Peringatan kuota", "Usage warning") : tr("Pemakaian normal", "Normal usage");
    return <div style={{ minWidth: 220, flex: 1 }}>
      <strong>{label}: {used.toLocaleString("id-ID")} / {limit.toLocaleString("id-ID")} ({percent}%)</strong>
      <progress aria-label={label} value={Math.min(used,limit)} max={limit} style={{ width: "100%", display: "block", margin: "10px 0", accentColor: percent >= 80 ? "#b45309" : "#146c60" }} />
      <span role={percent >= 80 ? "status" : undefined} style={{ color: percent >= 80 ? "#92400e" : "#4b5563" }}>{notice}</span>
    </div>;
  }
  return <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, marginBottom: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>{tr("Kuota Google Maps", "Google Maps Usage")}</h2>
      <button type="button" onClick={reload} disabled={loading}>{loading ? tr("Memuat...", "Loading...") : tr("Perbarui", "Refresh")}</button>
    </div>
    {error && <p role="status">{tr("Pemantauan belum tersedia. Pastikan migrasi 0042 sudah dijalankan dan sesi provider masih aktif.", "Monitoring unavailable. Check migration 0042 and your provider session.")}</p>}
    {usage && <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 18 }}>
        {meter(tr("Hari ini", "Today"), usage.daily_used, usage.daily_limit)}
        {meter(tr("Bulan ini · acuan gratis", "This month · free allowance reference"), usage.monthly_used, usage.monthly_reference)}
      </div>
      {usage.blocked && <p role="alert" style={{ color: "#92400e", fontWeight: 700 }}>{tr("Pencarian Google Maps dihentikan sampai pergantian hari WIB. QR/NFC dan link ulasan tersimpan tetap berjalan.", "Google Maps searches are paused until the next WIB day. QR/NFC and saved review links remain available.")}</p>}
      <p style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>{tr("Hitungan reservasi request V3 sejak pemantauan aktif, termasuk percobaan gagal setelah reservasi. Reset harian pukul 00.00 WIB; bulanan tanggal 1 WIB. Bukan laporan tagihan Google atau pemakaian proyek lain.", "V3 request reservations since monitoring started, including failed attempts after reservation. Daily reset at 00:00 WIB; monthly on the 1st WIB. Not Google's billing report or other projects' usage.")} {usage.tracking_since && `${tr("Mulai", "Since")}: ${usage.tracking_since}.`}</p>
    </>}
  </section>;
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

export default function ProviderAuthenticatorSettings() {
  const { tr } = useLanguage();
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(tr("Daftar authenticator belum dapat dimuat. Masuk melalui Provider Portal lalu coba lagi.", "Could not load authenticators. Sign in through the Provider Portal and try again."));
      else setFactors(data.totp.filter(f => f.status === "verified").map((f, i) => ({ id: f.id, name: f.friendly_name?.replace(/^ReputasiPro(?= Provider$| backup: )/, "YukReview") || `Authenticator ${i + 1}` })));
      setLoading(false);
    }).catch(() => {
      if (active) { setError(tr("Daftar authenticator belum dapat dimuat. Coba muat ulang halaman.", "Could not load authenticators. Reload this page.")); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function enroll(event: FormEvent) {
    event.preventDefault();
    if (busy || loading || pending) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const member = await supabase.rpc("v3_is_provider_admin");
      if (member.error || member.data !== true) throw new Error("Verification required");
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      if (!listed.data.totp.some(f => f.status === "verified")) throw new Error("Primary factor required");
      // Incomplete backup setups from this page can be restarted without touching active factors.
      for (const factor of listed.data.all) {
        if (factor.status === "unverified" && ["YukReview backup: ", "ReputasiPro backup: "].some(prefix => factor.friendly_name?.startsWith(prefix))) {
          const result = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (result.error) throw result.error;
        }
      }
      const result = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "YukReview", friendlyName: "YukReview backup: " + (name.trim() || "Authenticator") + " " + Date.now() });
      if (result.error) throw result.error;
      const image = result.data.totp.qr_code;
      setPending({ id: result.data.id, qr: image.startsWith("data:image/") ? image : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(image), secret: result.data.totp.secret });
    } catch {
      setError(tr("Authenticator cadangan belum dapat ditambahkan. Pastikan 2FA utama terverifikasi dan batas faktor belum tercapai.", "Could not add a backup authenticator. Verify your primary 2FA and check the factor limit."));
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !pending || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId: pending.id, code });
      if (result.error) throw result.error;
      setPending(null); setCode(""); setName("");
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      setFactors(listed.data.totp.filter(f => f.status === "verified").map((f, i) => ({ id: f.id, name: f.friendly_name?.replace(/^ReputasiPro(?= Provider$| backup: )/, "YukReview") || `Authenticator ${i + 1}` })));
      setMessage(tr("Authenticator cadangan sudah aktif. Saat login, pilih salah satu authenticator.", "Backup authenticator activated. Choose either authenticator when signing in."));
    } catch {
      setError(tr("Verifikasi belum berhasil. Periksa kode terbaru dari authenticator cadangan.", "Verification failed. Check the latest code from the backup authenticator."));
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (busy || !pending) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId: pending.id });
      if (result.error) throw result.error;
      setPending(null); setCode("");
    } catch { setError(tr("Pengaturan belum dapat dibatalkan. Coba lagi.", "Could not cancel setup. Try again.")); }
    finally { setBusy(false); }
  }

  return <main style={{ padding: 20, minHeight: "100vh", background: "#f5f7fb", fontFamily: "system-ui" }}><section style={{ margin: "20px auto", maxWidth: 520, borderRadius: 18, background: "white", padding: 24 }}>
    <LanguageSwitcher /><h1>{tr("Keamanan Provider", "Provider Security")}</h1>
    <p>{tr("Tambahkan authenticator dengan kunci terpisah sebagai cadangan. Cukup gunakan salah satunya saat login.", "Add an authenticator with a separate key as a backup. Use either one when signing in.")}</p>
    {loading ? <p>{tr("Memuat...", "Loading...")}</p> : <ul>{factors.map(f => <li key={f.id}>{f.name}</li>)}</ul>}
    {!pending && <form onSubmit={enroll} style={{ display: "grid", gap: 12 }}><label>{tr("Nama authenticator cadangan", "Backup authenticator name")}<input value={name} onChange={event => setName(event.target.value)} maxLength={50} placeholder={tr("Contoh: HP cadangan", "Example: Backup phone")} style={{ width: "100%", padding: 12, boxSizing: "border-box" }} /></label><button disabled={busy || loading || factors.length === 0 || factors.length >= 10}>{tr("Tambah Authenticator Cadangan", "Add Backup Authenticator")}</button></form>}
    {pending && <><p>{tr("Pindai QR di perangkat cadangan atau masukkan kunci secara manual. Jangan bagikan QR atau kunci ini.", "Scan the QR on your backup device or enter the key manually. Do not share this QR or key.")}</p><img src={pending.qr} alt={tr("QR authenticator cadangan", "Backup authenticator QR")} width={220} height={220} style={{ maxWidth: "100%", height: "auto" }} /><details><summary>{tr("Kunci pengaturan manual", "Manual setup key")}</summary><code style={{ overflowWrap: "anywhere" }}>{pending.secret}</code></details><form onSubmit={verify} style={{ display: "grid", gap: 12 }}><label>{tr("Kode 6 digit dari cadangan", "6-digit backup code")}<input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} style={{ display: "block", padding: 12, width: "100%", boxSizing: "border-box" }} /></label><button disabled={busy || code.length !== 6}>{tr("Verifikasi Cadangan", "Verify Backup")}</button></form><button disabled={busy} onClick={cancel}>{tr("Batalkan pengaturan", "Cancel setup")}</button></>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <p><a href="/provider/cards">{tr("Kembali ke Pusat Kartu", "Back to Card Center")}</a></p>
  </section></main>;
}

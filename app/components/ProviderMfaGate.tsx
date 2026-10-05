"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

function sessionStamp(session: { user: { id?: string; email?: string }; access_token?: string } | null) {
  if (!session?.access_token) return null;
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const identity = session.user.id || session.user.email;
    return identity && (payload.aal === "aal1" || payload.aal === "aal2") ? `${identity}:${payload.aal}` : null;
  } catch { return null; }
}

export default function ProviderMfaGate({ children, allowCustomers = false }: { children: ReactNode; allowCustomers?: boolean }) {
  const { tr } = useLanguage();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<"checking" | "login" | "denied" | "mfa" | "ready" | "error">("checking");
  const [factorId, setFactorId] = useState("");
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const authorizedSession = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase emits SIGNED_IN again on tab focus, and refreshes tokens routinely.
      // Keep the editor mounted only for the same previously authorized identity/AAL.
      const stamp = sessionStamp(session);
      if (!(stamp && stamp === authorizedSession.current && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED"))) {
        authorizedSession.current = null;
        setState("checking");
      }
      setQr(""); setSecret(""); setCode("");
      setRevision(value => value + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const session = await supabase.auth.getSession();
        if (session.error) throw session.error;
        if (!active) return;
        if (!session.data.session) { setState("login"); return; }
        const member = await supabase.rpc("v3_is_provider_member");
        if (member.error) throw member.error;
        if (!active) return;
        if (member.data !== true) { authorizedSession.current = allowCustomers ? sessionStamp(session.data.session) : null; setState(allowCustomers ? "ready" : "denied"); return; }
        const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (level.error) throw level.error;
        if (!active) return;
        if (level.data.currentLevel === "aal2") { authorizedSession.current = sessionStamp(session.data.session); setState("ready"); return; }
        authorizedSession.current = null;
        const listed = await supabase.auth.mfa.listFactors();
        if (listed.error) throw listed.error;
        if (!active) return;
        const verified = listed.data.totp.filter(factor => factor.status === "verified");
        setFactors(verified.map((factor, index) => ({ id: factor.id, name: factor.friendly_name || `Authenticator ${index + 1}` })));
        setFactorId(verified[0]?.id ?? "");
        setState("mfa");
      } catch {
        if (active) { authorizedSession.current = null; setState("error"); }
      }
    }
    check();
    return () => { active = false; };
  }, [revision, allowCustomers]);

  async function enroll() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      // Remove only incomplete enrollments created by this UI, never verified factors.
      for (const factor of factors.data.all) {
        if (factor.status === "unverified" && factor.friendly_name === "ReputasiPro Provider") {
          const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (removed.error) throw removed.error;
        }
      }
      const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "ReputasiPro Provider", issuer: "ReputasiPro" });
      if (result.error) throw result.error;
      setFactorId(result.data.id);
      const image = result.data.totp.qr_code;
      setQr(image.startsWith("data:image/") ? image : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(image));
      setSecret(result.data.totp.secret);
    } catch {
      setError(tr("Authenticator belum dapat disiapkan. Coba lagi.", "Could not set up the authenticator. Try again."));
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !factorId || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setQr(""); setSecret(""); setCode(""); setState("checking");
      setRevision(value => value + 1);
    } catch {
      setError(tr("Kode tidak valid atau kedaluwarsa. Gunakan kode terbaru.", "Invalid or expired code. Use the latest code."));
    } finally { setBusy(false); }
  }

  if (state === "login" || state === "ready") return children;
  return <main style={{ minHeight: "100vh", padding: 20, background: "#f5f7fb", fontFamily: "system-ui", boxSizing: "border-box" }}>
    <section style={{ maxWidth: 440, margin: "40px auto", padding: 24, borderRadius: 18, background: "white" }}>
      <LanguageSwitcher />
      <h1>{tr("Verifikasi Provider", "Provider Verification")}</h1>
      {state === "checking" && <p>{tr("Memeriksa akses...", "Checking access...")}</p>}
      {state === "denied" && <p role="alert">{tr("Akun ini tidak memiliki akses provider.", "This account does not have provider access.")}</p>}
      {state === "error" && <><p role="alert">{tr("Akses belum dapat diverifikasi. Jika pembaruan baru dipasang, pastikan migrasi 0039 sudah dijalankan.", "Access could not be verified. If this update was just installed, make sure migration 0039 has been applied.")}</p><button onClick={() => { setState("checking"); setRevision(value => value + 1); }}>{tr("Coba lagi", "Try again")}</button></>}
      {state === "mfa" && <>
        <p>{tr("Akses provider membutuhkan kode dari aplikasi authenticator.", "Provider access requires a code from your authenticator app.")}</p>
        {!factorId && <button disabled={busy} onClick={enroll}>{tr("Siapkan Authenticator", "Set Up Authenticator")}</button>}
        {qr && <><p>{tr("Pindai QR ini dengan aplikasi authenticator, atau masukkan kunci berikut secara manual di HP yang sama. Jangan bagikan QR atau kunci ini.", "Scan this QR with an authenticator app, or enter the key manually on the same phone. Do not share this QR or key.")}</p><img src={qr} alt={tr("QR pengaturan authenticator", "Authenticator setup QR")} width={220} height={220} style={{ maxWidth: "100%", height: "auto" }} /><details><summary>{tr("Kunci pengaturan manual", "Manual setup key")}</summary><code style={{ overflowWrap: "anywhere" }}>{secret}</code></details></>}
        {factorId && <form onSubmit={verify} style={{ display: "grid", gap: 12 }}>
          {factors.length > 1 && <label>{tr("Pilih authenticator", "Choose authenticator")}<select aria-label={tr("Pilih authenticator", "Choose authenticator")} disabled={busy} value={factorId} onChange={event => { setFactorId(event.target.value); setCode(""); setError(""); }} style={{ display: "block", width: "100%", padding: 12 }}>{factors.map(factor => <option key={factor.id} value={factor.id}>{factor.name}</option>)}</select></label>}
          <label>{tr("Kode 6 digit", "6-digit code")}<input aria-label={tr("Kode 6 digit", "6-digit code")} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} style={{ display: "block", padding: 12, fontSize: 20, width: "100%", boxSizing: "border-box" }} /></label>
          <button disabled={busy || code.length !== 6}>{tr("Verifikasi dan masuk", "Verify and continue")}</button>
        </form>}
        {error && <p role="alert">{error}</p>}
      </>}
      {state !== "checking" && <p><button disabled={busy} onClick={() => supabase.auth.signOut()}>{tr("Keluar", "Sign out")}</button></p>}
    </section>
  </main>;
}

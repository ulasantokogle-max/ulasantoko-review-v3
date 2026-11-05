"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { resolveCardCode } from "../../../lib/cardPublicId";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../lib/i18n";
import { useBusinessContext } from "../../../lib/useBusinessContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function ActivateCardPage() {
  const { tr } = useLanguage();
  const params = useParams<{ cardCode: string }>();
  const router = useRouter();
  const cardCode = params.cardCode;

  const [stateLoading, setStateLoading] = useState(true);
  const [cardUnavailable, setCardUnavailable] = useState(false);
  const [cardRevision, setCardRevision] = useState(0);
  const [needsActivation, setNeedsActivation] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const { businesses, businessId: selectedBusinessId, setBusinessId: setSelectedBusinessId, businessLoading, businessError, reloadBusinesses } = useBusinessContext(userEmail);
  const [businessMode, setBusinessMode] = useState<"existing" | "new">("new");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [pin, setPin] = useState("");
  const [activationError, setActivationError] = useState("");
  const [activating, setActivating] = useState(false);
  const identity = `${cardCode}:${userEmail}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const claimBusy = useRef(false);
  useEffect(() => () => { currentIdentity.current = ""; }, []);
  useEffect(() => { claimBusy.current = false; setActivating(false); setPin(""); setActivationError(""); }, [identity]);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    checkCard(() => active);

    supabase.auth.getSession().then(({ data }) => {
      if (active && !authEventReceived) setUserEmail(data.session?.user?.email ?? null);
    }).catch(() => { if (active && !authEventReceived) setAuthError("Sesi belum dapat diperiksa. Silakan coba lagi."); });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (active) setUserEmail(session?.user?.email ?? null);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, [cardCode, cardRevision]);

  useEffect(() => {
    if (!businessLoading && !businessError) setBusinessMode(businesses.length > 0 ? "existing" : "new");
  }, [userEmail, businessLoading, businessError, businesses]);

  async function checkCard(isCurrent: () => boolean) {
    setStateLoading(true);
    setNeedsActivation(true);
    setCardUnavailable(false);
    setActivationError("");
    setPin("");
    try {
      const resolvedCode = await resolveCardCode(supabase, cardCode);
      if (!isCurrent()) return;
      if (!resolvedCode) throw new Error("CARD_UNAVAILABLE");
      const { data, error } = await supabase.rpc("v3_get_card_activation_state", { p_card_code: resolvedCode });
      if (!isCurrent()) return;
      if (error || data?.success !== true || typeof data.needs_activation !== "boolean") throw new Error("CARD_UNAVAILABLE");
      setNeedsActivation(data.needs_activation);
    } catch {
      if (isCurrent()) setCardUnavailable(true);
    } finally {
      if (isCurrent()) setStateLoading(false);
    }
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (authLoading) return;
    if (mode === "signup" && password !== confirmPassword) { setAuthError("Konfirmasi password tidak cocok."); return; }
    setAuthLoading(true); setAuthError(""); setAuthMessage("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setAuthError("Email atau password tidak sesuai."); return; }
        setPassword("");
        return;
      }
      const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/activate/${cardCode}` : undefined;
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
      if (error) { setAuthError("Akun belum dapat dibuat. Periksa data lalu coba lagi."); return; }
      setPassword("");
      setConfirmPassword("");
      setAuthMessage(!data.session
        ? tr("Akun berhasil dibuat. Cek email untuk konfirmasi. Setelah diklik, Anda akan kembali ke halaman aktivasi kartu ini.")
        : tr("Akun berhasil dibuat dan Anda sudah masuk.", "Account created and you are signed in."));
    } catch {
      setAuthError(tr("Koneksi belum berhasil. Silakan coba lagi.", "Connection failed. Please try again."));
    } finally { setAuthLoading(false); }
  }

  async function handleGoogleLogin() {
    if (authLoading) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      const redirectTo = new URL("/activate/" + encodeURIComponent(cardCode), "https://yukreview.id").toString();
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) setAuthError("Login Google belum tersedia. Silakan gunakan email.");
    } catch {
      setAuthError("Login Google gagal. Silakan coba lagi.");
    } finally { setAuthLoading(false); }
  }

  async function registerDashboardAccount() {
    if (switchingAccount || activating) return;
    setSwitchingAccount(true);
    setAuthError("");
    try {
      if (userEmail) {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) {
          setAuthError(tr("Belum dapat mengganti akun. Silakan coba lagi.", "Unable to switch accounts. Please try again."));
          return;
        }
      }
      setUserEmail(null);
      setSelectedBusinessId(null);
      setBusinessMode("new");
      setBusinessName("");
      setCategory("restaurant");
      setPin("");
      setActivationError("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAuthMessage("");
      setMode("signup");

    } catch {
      setAuthError(tr("Belum dapat mengganti akun. Silakan coba lagi.", "Unable to switch accounts. Please try again."));
    } finally { setSwitchingAccount(false); }
  }

  async function resendConfirmation() {
    if (!email || resendLoading) return;
    setResendLoading(true); setAuthError(""); setAuthMessage("");
    try {
      const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/activate/${cardCode}` : undefined;
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } });
      if (error) throw error;
      setAuthMessage(tr("Email konfirmasi baru sudah dikirim. Gunakan email terbaru karena link lama bisa kedaluwarsa."));
    } catch { setAuthError(tr("Email konfirmasi belum dapat dikirim. Silakan coba lagi.", "Confirmation email could not be sent. Please try again.")); }
    finally { setResendLoading(false); }
  }

  async function activateCard(event: FormEvent) {
    event.preventDefault();
    if (claimBusy.current || switchingAccount || stateLoading || cardUnavailable || !needsActivation || !userEmail || businessLoading || businessError) return;
    if (businessMode === "existing" && !businesses.some(b => b.business_id === selectedBusinessId)) return;
    const capturedIdentity = identity;
    const current = () => currentIdentity.current === capturedIdentity;
    claimBusy.current = true; setActivationError(""); setActivating(true);
    try {
      const resolvedCode = await resolveCardCode(supabase, cardCode);
      if (!current()) return;
      if (!resolvedCode) throw new Error("CARD_UNAVAILABLE");
      const { data, error } = await supabase.rpc("v3_claim_card", {
        p_card_code: resolvedCode, p_pin: pin,
        p_business_id: businessMode === "existing" ? selectedBusinessId : null,
        p_business_name: businessMode === "new" ? businessName : null,
        p_category: businessMode === "new" ? category : null,
      });
      if (!current()) return;
      if (error || data?.success !== true) throw new Error("ACTIVATION_FAILED");
      const activatedBusinessId = data.business_id || (businessMode === "existing" ? selectedBusinessId : null);
      router.replace("/dashboard/landing-page" + (typeof activatedBusinessId === "string" && activatedBusinessId ? "?business_id=" + encodeURIComponent(activatedBusinessId) : ""));
    } catch {
      if (current()) setActivationError(tr("Aktivasi belum dapat dikonfirmasi. Periksa PIN dan status kartu lalu coba lagi.", "Activation could not be confirmed. Check the PIN and card status, then retry."));
    } finally { if (current()) { claimBusy.current = false; setActivating(false); } }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    fontSize: 15,
  };

  const buttonStyle = {
    width: "100%",
    border: 0,
    borderRadius: 12,
    padding: "13px 16px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
  } as const;

  if (stateLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        {tr("Memeriksa kartu...")}
      </main>
    );
  }

  if (cardUnavailable) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", padding: 20 }}>
      <section style={{ maxWidth: 460, width: "100%", background: "white", borderRadius: 20, padding: 24, boxSizing: "border-box" }}>
        <h1>{tr("Kartu belum tersedia", "Card unavailable")}</h1>
        <p role="alert">{tr("Kartu tidak ditemukan atau belum dapat diperiksa. Pastikan link benar dan coba lagi.", "The card could not be found or checked. Check the link and try again.")}</p>
        <button type="button" style={buttonStyle} onClick={() => setCardRevision(value => value + 1)}>{tr("Coba lagi", "Try again")}</button>
        <a href="/" style={{ display: "block", marginTop: 16 }}>{tr("Kembali ke Beranda", "Back to Home")}</a>
      </section>
    </main>;
  }

  if (!needsActivation) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7fb",
          padding: 20,
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 460,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1>{tr("Kartu sudah aktif")}</h1>
          <p style={{ color: "#6b7280" }}>
            Kartu {cardCode} {tr("sudah terhubung ke bisnis.")}
          </p>
          <a href={`/${cardCode}`} style={{ ...buttonStyle, display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            {tr("Buka Halaman Publik")}
          </a>
          <a href="/dashboard" style={{ display: "block", marginTop: 16, color: "#111827", fontWeight: 800 }}>
            {tr("Kelola Dashboard", "Manage Dashboard")}
          </a>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 12% 12%, #e9f2ff 0, transparent 32%), radial-gradient(circle at 90% 6%, #fff0ee 0, transparent 28%), #f8fafc",
        padding: "28px 16px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#111827",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto 10px", display: "flex", justifyContent: "flex-end" }}>
        <LanguageSwitcher />
      </div>
      <section
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 26,
          padding: "clamp(20px,4vw,32px)",
          boxShadow: "0 24px 72px rgba(15,23,42,.09)",
        }}
      >

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-.8px", color: "#15346b" }}>
            <span style={{ color: "#e33447" }}>Yuk</span>Review<span style={{ color: "#e33447" }}>✦</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "8px 12px", color: "#166534", background: "#ecfdf3" }}>
            ● {tr("Siap diaktifkan", "Ready to activate")}
          </span>
        </div>
        <h1 style={{ margin: "23px 0 8px", fontSize: "clamp(26px, 5vw, 34px)", letterSpacing: "-1.2px", lineHeight: 1.16 }}>
          {tr("Aktivasi Kartu YukReview", "Activate Your YukReview Card")}
        </h1>
        <p style={{ margin: "0 0 18px", color: "#64748b", lineHeight: 1.6, fontSize: 14 }}>
          {userEmail
            ? tr("Lengkapi data bisnis dan PIN agar kartu siap digunakan pelanggan.", "Enter your business details and PIN to make the card ready for customers.")
            : tr("Masuk atau daftar untuk menghubungkan kartu ke bisnis Anda. Prosesnya hanya beberapa langkah.", "Sign in or register to connect the card to your business in a few steps.")}
        </p>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f1f5ff", border: "1px solid #dce7ff", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>{tr("KODE KARTU", "CARD CODE")}</span>
          <strong style={{ fontSize: 14, color: "#1e40af", overflowWrap: "anywhere" }}>{cardCode}</strong>
        </div>
        <div aria-label={tr("Tahapan aktivasi", "Activation steps")} style={{ margin: "22px 0 20px", display: "flex", alignItems: "flex-start", gap: 6 }}>
          {[
            [tr("Akun", "Account"), true],
            [tr("Data bisnis", "Business"), Boolean(userEmail)],
            [tr("PIN & aktif", "PIN & activate"), false],
          ].map(([label, active], idx) => (
            <div key={String(label)} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <div style={{ height: 5, borderRadius: 999, background: active ? "#2563eb" : "#e2e8f0", marginBottom: 8 }} />
              <span style={{ color: active ? "#1d4ed8" : "#64748b", fontSize: 11, fontWeight: 800 }}>
                {idx + 1}. {label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #edf2f7", paddingTop: 17 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 18, letterSpacing: "-.3px" }}>
            {userEmail ? tr("Hubungkan ke bisnis Anda", "Connect your business") : tr("Mulai dengan akun Anda", "Start with your account")}
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
            {userEmail
              ? tr("Akun sudah masuk. Pilih bisnis yang ada atau daftarkan bisnis baru.", "You're signed in. Select an existing business or create a new one.")
              : tr("Punya akun? Pilih Masuk. Customer baru bisa memilih Buat Akun atau Google.", "Have an account? Choose Sign In. New customers can register or use Google.")}
          </p>
        </div>
        {userEmail && (
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            <a href="/dashboard" style={{ ...buttonStyle, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box", background: "#eef4ff", color: "#1d4ed8" }}>
              {tr("Buka Dashboard", "Open Dashboard")}
            </a>
            <button type="button" onClick={registerDashboardAccount} disabled={switchingAccount || activating || authLoading || resendLoading}
              style={{ ...buttonStyle, background: "#fff", color: "#334155", border: "1px solid #e2e8f0" }}>
              {switchingAccount ? tr("Memproses...", "Processing...") : tr("Ganti / Daftar Akun Lain", "Switch / Register Another Account")}
            </button>
            {authError && <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{tr(authError)}</p>}
          </div>
        )}

        {!userEmail ? (
          <>
            <div style={{ display: "flex", gap: 8, margin: "18px 0 14px" }}>
              <button
                type="button"
                onClick={() => setMode("login")}
                style={{
                  ...buttonStyle,
                  background: mode === "login" ? "#111827" : "#ffffff",
                  color: mode === "login" ? "#ffffff" : "#111827",
                  border: "1px solid #d1d5db",
                }}
              >
                {tr("Masuk", "Sign In")}
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                style={{
                  ...buttonStyle,
                  background: mode === "signup" ? "#111827" : "#ffffff",
                  color: mode === "signup" ? "#ffffff" : "#111827",
                  border: "1px solid #d1d5db",
                }}
              >
                {tr("Buat Akun", "Create Account")}
              </button>
            </div>

            <form onSubmit={handleAuth} style={{ display: "grid", gap: 10 }}>
              <input
                style={inputStyle}
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 52 }}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={tr("Password minimal 6 karakter")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button type="button"
                  aria-label={showPassword ? tr("Sembunyikan password", "Hide password") : tr("Lihat password", "Show password")}
                  title={showPassword ? tr("Sembunyikan password", "Hide password") : tr("Lihat password", "Show password")}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, border: 0, background: "transparent", color: "#64748b", display: "grid", placeItems: "center", cursor: "pointer", borderRadius: 10 }}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword && <path d="M3 3l18 18" />}
                    </svg>
                </button>
              </div>
              {mode === "signup" && (
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 52 }}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={"Konfirmasi password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button type="button"
                  aria-label={showConfirmPassword ? tr("Sembunyikan konfirmasi password", "Hide konfirmasi password") : tr("Lihat konfirmasi password", "Show konfirmasi password")}
                  title={showConfirmPassword ? tr("Sembunyikan konfirmasi password", "Hide konfirmasi password") : tr("Lihat konfirmasi password", "Show konfirmasi password")}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, border: 0, background: "transparent", color: "#64748b", display: "grid", placeItems: "center", cursor: "pointer", borderRadius: 10 }}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showConfirmPassword && <path d="M3 3l18 18" />}
                    </svg>
                </button>
              </div>
              )}
              <button style={buttonStyle} type="submit" disabled={authLoading}>
                {authLoading
                  ? tr("Memproses...")
                  : mode === "login"
                    ? tr("Masuk & Lanjut Aktivasi", "Sign In & Continue Activation")
                    : tr("Buat Akun")}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <span style={{ height: 1, flex: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: 12, color: "#64748b" }}>{tr("atau", "or")}</span>
              <span style={{ height: 1, flex: 1, background: "#e2e8f0" }} />
            </div>
            <button type="button" disabled={authLoading} onClick={handleGoogleLogin}
              style={{ ...buttonStyle, width: "100%", marginTop: 12, background: "#ffffff", color: "#111827", border: "1px solid #d1d5db" }}>
              <span style={{ color: "#4285f4", fontWeight: 900, marginRight: 8 }}>G</span>{tr("Lanjutkan dengan Google", "Continue with Google")}
            </button>
            <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", margin: "12px 0 0" }}>
              {tr("Akun digunakan untuk mengelola kartu dan halaman bisnis.", "Your account manages your cards and business page.")}
            </p>
            {mode === "login" && <a href="/forgot-password" style={{display:"block",textAlign:"right",marginTop:10,color:"#2563eb",fontSize:14,fontWeight:700,textDecoration:"none"}}>{tr("Lupa Password?", "Forgot Password?")}</a>}
            {authError && <p style={{ color: "#b91c1c" }}>{tr(authError)}</p>}
            {authMessage && (
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ color: "#166534", marginBottom: 0 }}>{tr(authMessage)}</p>
                {mode === "signup" && email && (
                  <button
                    type="button"
                    onClick={resendConfirmation}
                    disabled={resendLoading}
                    style={{
                      ...buttonStyle,
                      background: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    {resendLoading
                      ? tr("Mengirim ulang...")
                      : tr("Kirim Ulang Email Konfirmasi")}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={activateCard} style={{ display: "grid", gap: 12, marginTop: 20 }}>
            <div style={{ padding: 13, borderRadius: 12, background: "#ecfdf3", color: "#166534", fontSize: 13, overflowWrap: "anywhere" }}>
              ✓ {tr("Masuk sebagai", "Signed in as")} <strong>{userEmail}</strong>
            </div>

            {businessLoading && <p role="status">{tr("Memuat daftar bisnis…", "Loading businesses…")}</p>}
            {businessError && <div role="alert"><p>{tr(businessError, "Businesses could not be loaded. Please retry.")}</p><button type="button" onClick={reloadBusinesses}>{tr("Coba lagi", "Retry")}</button></div>}
            <fieldset disabled={businessLoading || !!businessError || activating || switchingAccount} style={{ display: "contents", border: 0, padding: 0, margin: 0 }}>
            {businesses.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setBusinessMode("existing")}
                  style={{
                    ...buttonStyle,
                    background: businessMode === "existing" ? "#111827" : "#ffffff",
                    color: businessMode === "existing" ? "#ffffff" : "#111827",
                    border: "1px solid #d1d5db",
                  }}
                >
                  {tr("Bisnis Saya")}
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessMode("new")}
                  style={{
                    ...buttonStyle,
                    background: businessMode === "new" ? "#111827" : "#ffffff",
                    color: businessMode === "new" ? "#ffffff" : "#111827",
                    border: "1px solid #d1d5db",
                  }}
                >
                  {tr("Bisnis Baru")}
                </button>
              </div>
            )}

            {businessMode === "existing" && businesses.length > 0 ? (
              <select
                style={inputStyle}
                value={selectedBusinessId ?? ""}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                required
              >
                {businesses.map((business) => (
                  <option key={business.business_id} value={business.business_id}>
                    {business.display_name || business.business_name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  style={inputStyle}
                  placeholder={tr("Nama bisnis / restoran")}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
                <select
                  style={inputStyle}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="restaurant">{tr("Restoran / Cafe")}</option>
                  <option value="retail">{tr("Retail / Toko")}</option>
                  <option value="service">{tr("Jasa")}</option>
                  <option value="hotel">{tr("Hotel / Penginapan")}</option>
                  <option value="other">{tr("Lainnya")}</option>
                </select>
              </>
            )}

            <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#334155", marginTop: 5 }}>
              {tr("PIN Aktivasi", "Activation PIN")}
            </label>
            <input
              style={inputStyle}
              type="password"
              inputMode="numeric"
              placeholder={tr("PIN aktivasi kartu")}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />

            <p style={{ fontSize: 12, color: "#64748b", margin: "-4px 0 4px" }}>
              {tr("Masukkan PIN 6 digit yang diberikan bersama kartu. Jangan bagikan PIN kepada orang lain.", "Enter the six-digit PIN supplied with your card. Keep it private.")}
            </p>
            <button style={buttonStyle} type="submit" disabled={activating || switchingAccount || businessLoading || !!businessError}>
              {activating ? tr("Mengaktifkan...", "Activating...") : tr("Aktifkan Kartu Sekarang", "Activate Card Now")}
            </button>

            </fieldset>
            {activationError && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "#fef2f2",
                  color: "#991b1b",
                }}
              >
                {activationError}
              </div>
            )}
          </form>
        )}
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, margin: "22px 0 0" }}>
          {tr("Butuh bantuan? Hubungi tim YukReview melalui website resmi.", "Need help? Contact YukReview through the official website.")}
        </p>
      </section>
    </main>
  );
}

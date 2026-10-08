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
      setAuthMessage(!data.session
        ? tr("Akun berhasil dibuat. Cek email untuk konfirmasi. Setelah diklik, Anda akan kembali ke halaman aktivasi kartu ini.")
        : tr("Akun berhasil dibuat dan Anda sudah masuk.", "Account created and you are signed in."));
    } catch {
      setAuthError(tr("Koneksi belum berhasil. Silakan coba lagi.", "Connection failed. Please try again."));
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
        background: "linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)",
        padding: "28px 16px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#111827",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto 10px", display: "flex", justifyContent: "flex-end" }}>
        <LanguageSwitcher />
      </div>
      <section
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 18px 60px rgba(15,23,42,.08)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280", letterSpacing: .7 }}>
          YUKREVIEW
        </div>
        <h1 style={{ marginBottom: 8 }}>{tr("Aktivasi Kartu", "Activate Card")}</h1>
        <p style={{ marginTop: 0, color: "#6b7280", lineHeight: 1.6 }}>
          {tr("Kartu", "Card")} <strong>{cardCode}</strong> {tr("belum diaktifkan. Aktivasi sekali, lalu QR dan NFC ini akan otomatis menjadi halaman publik bisnis Anda.", "has not been activated yet. Activate it once and this QR/NFC will automatically become your business public page.")}
        </p>

        <aside style={{ padding: 16, borderRadius: 16, background: "#f5f3ff", border: "1px solid #ede9fe", marginTop: 20 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>{tr("Akun Dashboard", "Dashboard Account")}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6b7280", margin: "0 0 12px" }}>
            {userEmail
              ? tr("Kelola bisnis dengan akun yang sedang masuk. Untuk mendaftarkan email lain, Anda akan keluar dari akun ini terlebih dahulu.", "Manage your business with the signed-in account. Registering another email will sign you out of this account first.")
              : tr("Daftar akun untuk mengaktifkan kartu dan mengelola halaman bisnis, kartu, serta feedback pelanggan dari satu dashboard.", "Create an account to activate your card and manage your business page, cards, and customer feedback from one dashboard.")}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {userEmail && (
              <a href="/dashboard" style={{ ...buttonStyle, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                {tr("Kelola Dashboard", "Manage Dashboard")}
              </a>
            )}
            <button type="button" onClick={registerDashboardAccount} disabled={switchingAccount || activating || authLoading || resendLoading}
              style={{ ...buttonStyle, background: "#fff", color: "#111827", border: "1px solid #d1d5db" }}>
              {switchingAccount ? tr("Memproses...") : userEmail
                ? tr("Daftar dengan Email Lain", "Register with Another Email")
                : tr("Daftar Akun Dashboard", "Register Dashboard Account")}
            </button>
          </div>
          {userEmail && authError && <p role="alert" style={{ color: "#b91c1c", fontSize: 14 }}>{tr(authError)}</p>}
        </aside>

        {!userEmail ? (
          <>
            <div style={{ display: "flex", gap: 8, margin: "20px 0 14px" }}>
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
              <input
                style={inputStyle}
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={tr("Password minimal 6 karakter")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button style={buttonStyle} type="submit" disabled={authLoading}>
                {authLoading
                  ? tr("Memproses...")
                  : mode === "login"
                    ? tr("Masuk & Lanjut Aktivasi", "Sign In & Continue Activation")
                    : tr("Buat Akun")}
              </button>
            </form>

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
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "#f9fafb",
                fontSize: 14,
              }}
            >
              {tr("Akun:")} <strong>{userEmail}</strong>
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

            <input
              style={inputStyle}
              type="password"
              inputMode="numeric"
              placeholder={tr("PIN aktivasi kartu")}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />

            <button style={buttonStyle} type="submit" disabled={activating || switchingAccount || businessLoading || !!businessError}>
              {activating ? tr("Mengaktifkan...") : tr("Aktifkan Kartu")}
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
      </section>
    </main>
  );
}

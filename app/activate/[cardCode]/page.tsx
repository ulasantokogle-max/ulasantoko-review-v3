"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../lib/i18n";

type Business = {
  business_id: string;
  business_name: string;
  display_name: string;
  category: string | null;
};

export default function ActivateCardPage() {
  const { tr } = useLanguage();
  const params = useParams<{ cardCode: string }>();
  const router = useRouter();
  const cardCode = params.cardCode;

  const [stateLoading, setStateLoading] = useState(true);
  const [needsActivation, setNeedsActivation] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessMode, setBusinessMode] = useState<"existing" | "new">("new");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [pin, setPin] = useState("");
  const [activationError, setActivationError] = useState("");
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    checkCard();

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [cardCode]);

  useEffect(() => {
    if (userEmail) loadBusinesses();
  }, [userEmail]);

  async function checkCard() {
    setStateLoading(true);
    const { data } = await supabase.rpc("v3_get_card_activation_state", {
      p_card_code: cardCode,
    });
    setStateLoading(false);

    if (!data?.success) {
      console.error("Card activation state unavailable", data);
      setActivationError("Kartu tidak ditemukan atau belum tersedia.");
      return;
    }

    if (!data?.needs_activation) {
      setNeedsActivation(false);
    }
  }

  async function loadBusinesses() {
    const { data } = await supabase.rpc("v3_get_my_businesses");
    const rows = (data ?? []) as Business[];
    setBusinesses(rows);

    if (rows.length > 0) {
      setBusinessMode("existing");
      setSelectedBusinessId(rows[0].business_id);
    } else {
      setBusinessMode("new");
    }
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (authLoading) return;

    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setAuthLoading(false);

      if (error) {
        console.error("Activation login failed", error);
        setAuthMessage("");
        setAuthError("Email atau password tidak sesuai.");
      }
      return;
    }

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/activate/${cardCode}`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });
    setAuthLoading(false);

    if (error) {
      console.error("Activation signup failed", error);
      setAuthMessage("");
      setAuthError("Akun belum dapat dibuat. Periksa data lalu coba lagi.");
      return;
    }

    setAuthError("");

    if (!data.session) {
      setAuthMessage(
        "Akun berhasil dibuat. Cek email untuk konfirmasi. Setelah diklik, Anda akan kembali ke halaman aktivasi kartu ini."
      );
      return;
    }

    setAuthMessage("Akun berhasil dibuat dan Anda sudah masuk.");
  }

  async function resendConfirmation() {
    if (!email || resendLoading) return;

    setResendLoading(true);
    setAuthError("");
    setAuthMessage("");

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/activate/${cardCode}`
        : undefined;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    setResendLoading(false);

    if (error) {
      console.error("Activation confirmation resend failed", error);
      setAuthError("Email konfirmasi belum dapat dikirim. Silakan coba lagi.");
      return;
    }

    setAuthMessage(
      "Email konfirmasi baru sudah dikirim. Gunakan email terbaru karena link lama bisa kedaluwarsa."
    );
  }

  async function activateCard(event: FormEvent) {
    event.preventDefault();
    setActivationError("");
    setActivating(true);

    const { data, error } = await supabase.rpc("v3_claim_card", {
      p_card_code: cardCode,
      p_pin: pin,
      p_business_id:
        businessMode === "existing" ? selectedBusinessId || null : null,
      p_business_name: businessMode === "new" ? businessName : null,
      p_category: businessMode === "new" ? category : null,
    });

    setActivating(false);

    if (error) {
      console.error("Card activation failed", error);
      setActivationError("Aktivasi belum berhasil. Periksa PIN dan coba lagi.");
      return;
    }

    if (!data?.success) {
      console.error("Card activation returned unsuccessful result", data);
      setActivationError("Aktivasi belum berhasil. Periksa PIN dan status kartu lalu coba lagi.");
      return;
    }

    router.push("/dashboard/onboarding");
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
        Memeriksa kartu...
      </main>
    );
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
          <h1>Kartu sudah aktif</h1>
          <p style={{ color: "#6b7280" }}>
            Kartu {cardCode} sudah terhubung ke bisnis.
          </p>
          <a href={`/${cardCode}`} style={{ ...buttonStyle, display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Buka Halaman Publik
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
          REPUTASIPRO
        </div>
        <h1 style={{ marginBottom: 8 }}>Aktivasi Kartu</h1>
        <p style={{ marginTop: 0, color: "#6b7280", lineHeight: 1.6 }}>
          Kartu <strong>{cardCode}</strong> belum diaktifkan. Aktivasi sekali,
          lalu QR dan NFC ini akan otomatis menjadi halaman publik bisnis Anda.
        </p>

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
                Login
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
                Buat Akun
              </button>
            </div>

            <form onSubmit={handleAuth} style={{ display: "grid", gap: 10 }}>
              <input
                style={inputStyle}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="Password minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button style={buttonStyle} type="submit" disabled={authLoading}>
                {authLoading
                  ? "Memproses..."
                  : mode === "login"
                    ? tr("Masuk & Lanjut Aktivasi", "Sign In & Continue Activation")
                    : "Buat Akun"}
              </button>
            </form>

            {authError && <p style={{ color: "#b91c1c" }}>{authError}</p>}
            {authMessage && (
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ color: "#166534", marginBottom: 0 }}>{authMessage}</p>
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
                      ? "Mengirim ulang..."
                      : "Kirim Ulang Email Konfirmasi"}
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
              Akun: <strong>{userEmail}</strong>
            </div>

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
                  Bisnis Saya
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
                  Bisnis Baru
                </button>
              </div>
            )}

            {businessMode === "existing" && businesses.length > 0 ? (
              <select
                style={inputStyle}
                value={selectedBusinessId}
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
                  placeholder="Nama bisnis / restoran"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
                <select
                  style={inputStyle}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="restaurant">Restoran / Cafe</option>
                  <option value="retail">Retail / Toko</option>
                  <option value="service">Jasa</option>
                  <option value="hotel">Hotel / Penginapan</option>
                  <option value="other">Lainnya</option>
                </select>
              </>
            )}

            <input
              style={inputStyle}
              type="password"
              inputMode="numeric"
              placeholder="PIN aktivasi kartu"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />

            <button style={buttonStyle} type="submit" disabled={activating}>
              {activating ? "Mengaktifkan..." : "Aktifkan Kartu"}
            </button>

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

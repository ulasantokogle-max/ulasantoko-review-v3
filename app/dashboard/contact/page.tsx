"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";

export default function ContactSettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const {
    businesses,
    businessId,
    setBusinessId,
    businessLoading,
    businessError,
  } = useBusinessContext(userEmail);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (businessId) {
      loadSettings();
    } else {
      setWhatsapp("");
    }
  }, [businessId]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    setLoadingLogin(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoadingLogin(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setWhatsapp("");
    setMessage("");
  }

  async function loadSettings() {
    setLoading(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.rpc(
      "v3_get_business_contact_settings",
      { p_business_id: businessId }
    );

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setWhatsapp(data?.whatsapp_number ?? "");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    if (!businessId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.rpc(
      "v3_update_business_contact_settings",
      {
        p_business_id: businessId,
        p_whatsapp_number: whatsapp,
      }
    );

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data?.success) {
      setError(data?.message ?? "Gagal menyimpan nomor WhatsApp.");
      return;
    }

    setWhatsapp(data.whatsapp_number ?? "");
    setMessage("Nomor WhatsApp berhasil disimpan.");
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px 20px",
    color: "#111827",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  } as const;

  const cardStyle = {
    maxWidth: 760,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 16px 50px rgba(15,23,42,.08)",
    border: "1px solid #e5e7eb",
  } as const;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 15,
  } as const;

  const buttonStyle = {
    border: 0,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
  } as const;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
          ULASANTOKO REVIEW V3
        </div>
        <h1 style={{ marginBottom: 8 }}>Contact & WhatsApp</h1>
        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          Nomor ini dipakai sebagai tombol WhatsApp setelah customer mengirim
          feedback privat 1–3 bintang.
        </p>

        {!userEmail ? (
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={buttonStyle} type="submit" disabled={loadingLogin}>
              {loadingLogin ? "Login..." : "Login"}
            </button>
            {loginError && <div style={{ color: "#991b1b" }}>{loginError}</div>}
          </form>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                padding: 12,
                background: "#f9fafb",
                borderRadius: 10,
                marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 14 }}>
                Login sebagai <strong>{userEmail}</strong>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  ...buttonStyle,
                  background: "#fff",
                  color: "#111827",
                  border: "1px solid #d1d5db",
                  padding: "9px 12px",
                }}
              >
                Logout
              </button>
            </div>

            {businesses.length > 1 && (
              <select
                value={businessId ?? ""}
                onChange={(e) => setBusinessId(e.target.value)}
                style={{ ...inputStyle, marginBottom: 14, background: "#fff" }}
              >
                {businesses.map((business) => (
                  <option key={business.business_id} value={business.business_id}>
                    {business.display_name || business.business_name}
                  </option>
                ))}
              </select>
            )}

            {(businessLoading || businessError) && (
              <div style={{ marginBottom: 12, color: businessError ? "#991b1b" : "#6b7280" }}>
                {businessError || "Memuat bisnis..."}
              </div>
            )}

            <form onSubmit={saveSettings} style={{ display: "grid", gap: 12 }}>
              <label style={{ fontWeight: 800 }}>Nomor WhatsApp Bisnis</label>
              <input
                style={inputStyle}
                inputMode="tel"
                placeholder="Contoh: 081234567890"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={loading}
              />
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Bisa ditulis 08..., 628..., atau +628.... Sistem akan merapikannya otomatis.
              </div>
              <button style={buttonStyle} type="submit" disabled={saving || loading || !businessId}>
                {saving ? "Menyimpan..." : "Simpan WhatsApp"}
              </button>
            </form>

            {error && (
              <div style={{ marginTop: 14, padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 10 }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ marginTop: 14, padding: 12, background: "#f0fdf4", color: "#166534", borderRadius: 10 }}>
                {message}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

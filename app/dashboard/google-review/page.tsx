"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";

type SetupResult = {
  success?: boolean;
  business_id?: string;
  maps_url?: string;
  place_id?: string;
  business_name?: string;
  formatted_address?: string;
  review_url?: string;
  profile?: {
    status?: string;
    maps_url?: string;
    place_id?: string;
    review_url?: string;
    business_id?: string;
    business_name?: string;
  };
  message?: string;
  step?: string;
  details?: unknown;
};

export default function GoogleReviewDashboardPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [internalName, setInternalName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameMessage, setNameMessage] = useState("");
  const [loadingName, setLoadingName] = useState(false);

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
      loadBusinessProfile();
    } else {
      setDisplayName("");
      setInternalName("");
    }
  }, [businessId]);

  async function loadBusinessProfile() {
    setNameError("");

    const { data, error } = await supabase.rpc("v3_get_business_profile", {
      p_business_id: businessId,
    });

    if (error) {
      setNameError(error.message);
      return;
    }

    if (data?.success === false) {
      setNameError(data?.message ?? "Gagal memuat profil bisnis.");
      return;
    }

    setInternalName(data?.internal_name ?? "");
    setDisplayName(data?.display_name ?? data?.internal_name ?? "");
  }

  async function saveDisplayName(event: FormEvent) {
    event.preventDefault();
    setNameError("");
    setNameMessage("");
    setLoadingName(true);

    const { data, error } = await supabase.rpc(
      "v3_update_business_display_name",
      {
        p_business_id: businessId,
        p_display_name: displayName,
      }
    );

    setLoadingName(false);

    if (error) {
      setNameError(error.message);
      return;
    }

    if (data?.success === false) {
      setNameError(data?.message ?? "Gagal menyimpan nama publik.");
      return;
    }

    setDisplayName(data?.display_name ?? displayName);
    setNameMessage("Nama bisnis publik berhasil disimpan.");
  }

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
    setResult(null);
  }

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    setSetupError("");
    setResult(null);
    setLoadingSetup(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setSetupError("Session login tidak ditemukan. Silakan login ulang.");
        return;
      }

      if (!businessId) {
        setSetupError("Bisnis belum dipilih.");
        return;
      }

      const response = await fetch("/api/google-review/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_id: businessId,
          maps_url: mapsUrl,
        }),
      });

      const data = (await response.json()) as SetupResult;

      if (!response.ok || !data.success) {
        setSetupError(
          data.message ||
            (data.step ? `Setup gagal di tahap: ${data.step}` : "Setup gagal.")
        );
        setResult(data);
        return;
      }

      setResult(data);
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Terjadi error saat setup."
      );
    } finally {
      setLoadingSetup(false);
    }
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px 20px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#111827",
  } as const;

  const cardStyle = {
    maxWidth: 760,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 16px 50px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb",
  } as const;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 15,
    outline: "none",
  } as const;

  const buttonStyle = {
    border: 0,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
  } as const;

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: "#6b7280",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            UlasanToko Review V3
          </div>

          <h1 style={{ margin: 0, fontSize: 30 }}>Google Review Setup</h1>

          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Tempel link Google Maps bisnis. Sistem akan mencari Place ID,
            membuat Review URL, lalu menyimpannya ke profil bisnis V3.
          </p>
        </div>

        {!userEmail ? (
          <form onSubmit={handleLogin}>
            <h2 style={{ fontSize: 18 }}>Login Owner</h2>

            <div style={{ display: "grid", gap: 12 }}>
              <input
                style={inputStyle}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <input
                style={inputStyle}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button style={buttonStyle} type="submit" disabled={loadingLogin}>
                {loadingLogin ? "Login..." : "Login"}
              </button>
            </div>

            {loginError && (
              <p style={{ color: "#b91c1c", marginTop: 12 }}>{loginError}</p>
            )}
          </form>
        ) : (
          <>
            {businesses.length > 1 && (
              <select
                value={businessId ?? ""}
                onChange={(event) => setBusinessId(event.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  marginBottom: 14,
                  background: "#ffffff",
                }}
              >
                {businesses.map((business) => (
                  <option key={business.business_id} value={business.business_id}>
                    {business.display_name || business.business_name}
                  </option>
                ))}
              </select>
            )}

            {(businessLoading || businessError) && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 14,
                  background: businessError ? "#fef2f2" : "#f9fafb",
                  color: businessError ? "#991b1b" : "#6b7280",
                }}
              >
                {businessError || "Memuat bisnis..."}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                padding: "12px 14px",
                borderRadius: 10,
                background: "#f9fafb",
                marginBottom: 24,
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
                  background: "#ffffff",
                  color: "#111827",
                  border: "1px solid #d1d5db",
                  padding: "9px 12px",
                }}
              >
                Logout
              </button>
            </div>

            <form
              onSubmit={saveDisplayName}
              style={{
                marginBottom: 24,
                padding: 18,
                borderRadius: 14,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>
                Nama Bisnis Publik
              </h2>

              <p
                style={{
                  margin: "0 0 14px",
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                Nama internal: <strong>{internalName || "-"}</strong>. Nama di
                bawah ini dipakai di landing page customer dan bisa diubah
                kapan saja tanpa mengubah Business ID, kartu, atau Review URL.
              </p>

              <input
                style={inputStyle}
                type="text"
                placeholder="Nama bisnis publik"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />

              <button
                style={{ ...buttonStyle, marginTop: 12 }}
                type="submit"
                disabled={loadingName}
              >
                {loadingName ? "Menyimpan..." : "Simpan Nama Publik"}
              </button>

              {nameError && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#991b1b",
                    fontSize: 14,
                  }}
                >
                  {nameError}
                </div>
              )}

              {nameMessage && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#166534",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {nameMessage}
                </div>
              )}
            </form>

            <form onSubmit={handleSetup}>
              <label
                htmlFor="maps-url"
                style={{ display: "block", fontWeight: 700, marginBottom: 8 }}
              >
                Google Maps URL
              </label>

              <input
                id="maps-url"
                style={inputStyle}
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                value={mapsUrl}
                onChange={(event) => setMapsUrl(event.target.value)}
                required
              />

              <button
                style={{ ...buttonStyle, width: "100%", marginTop: 14 }}
                type="submit"
                disabled={loadingSetup}
              >
                {loadingSetup ? "Memproses..." : "Simpan Google Review"}
              </button>
            </form>

            {setupError && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 10,
                  background: "#fef2f2",
                  color: "#991b1b",
                }}
              >
                {setupError}
              </div>
            )}

            {result?.success && (
              <div
                style={{
                  marginTop: 22,
                  padding: 18,
                  borderRadius: 14,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <h2 style={{ marginTop: 0, fontSize: 19 }}>
                  Google Review berhasil disimpan
                </h2>

                <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                  <div>
                    <strong>Business:</strong> {result.business_name ?? "-"}
                  </div>
                  <div>
                    <strong>Alamat:</strong> {result.formatted_address ?? "-"}
                  </div>
                  <div>
                    <strong>Place ID:</strong> {result.place_id ?? "-"}
                  </div>
                  <div>
                    <strong>Status:</strong> {result.profile?.status ?? "-"}
                  </div>
                </div>

                {result.review_url && (
                  <a
                    href={result.review_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 16,
                      fontWeight: 700,
                      color: "#166534",
                    }}
                  >
                    Test Review URL
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

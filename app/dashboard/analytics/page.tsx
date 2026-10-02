"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";

type PeriodKey = "hour" | "day" | "week" | "month" | "custom";

type AnalyticsData = {
  success?: boolean;
  period?: PeriodKey;
  timezone?: string;
  start_at?: string;
  end_at?: string;
  feedback?: {
    total?: number;
    average_rating?: number;
    rating_1?: number;
    rating_2?: number;
    rating_3?: number;
    new?: number;
    viewed?: number;
    contacted?: number;
    resolved?: number;
    closed?: number;
    contactable?: number;
    last_7_days?: number;
    last_30_days?: number;
  };
  cards?: {
    total?: number;
    active?: number;
    activated?: number;
  };
};

export default function AnalyticsDashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("day");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
    if (!businessId) {
      setAnalytics(null);
      return;
    }

    if (period === "custom" && (!customStart || !customEnd)) {
      return;
    }

    loadAnalytics();
  }, [businessId, period, customStart, customEnd]);

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
      console.error("Analytics dashboard login failed", error);
      setLoginError("Email atau password tidak sesuai.");
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }


  async function loadAnalytics() {
    setLoading(true);
    setLoadError("");

    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";

    const customStartIso =
      period === "custom" && customStart
        ? new Date(customStart).toISOString()
        : null;
    const customEndIso =
      period === "custom" && customEnd
        ? new Date(customEnd).toISOString()
        : null;

    const { data, error } = await supabase.rpc(
      "v3_get_business_analytics_period",
      {
        p_business_id: businessId,
        p_period: period,
        p_start_at: customStartIso,
        p_end_at: customEndIso,
        p_timezone: timezone,
      }
    );

    setLoading(false);

    if (error) {
      console.error("Analytics load failed", error);
      setLoadError("Data analytics belum dapat dimuat. Silakan coba lagi.");
      setAnalytics(null);
      return;
    }

    setAnalytics((data ?? null) as AnalyticsData | null);
  }

  const feedback = analytics?.feedback ?? {};
  const cards = analytics?.cards ?? {};

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px 20px",
    color: "#111827",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  } as const;

  const cardStyle = {
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 16px 50px rgba(15,23,42,.06)",
    padding: 24,
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
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
  } as const;

  const periodLabel =
    period === "hour"
      ? "Jam Ini"
      : period === "day"
        ? "Hari Ini"
        : period === "week"
          ? "Minggu Ini"
          : period === "month"
            ? "Bulan Ini"
            : "Kustom";

  const metricCards = [
    ["Total Masukan", feedback.total ?? 0],
    ["Rata-rata Rating", Number(feedback.average_rating ?? 0).toFixed(1)],
    ["Bisa Dihubungi", feedback.contactable ?? 0],
    ["Periode", periodLabel],
    ["Total Kartu", cards.total ?? 0],
    ["Kartu Aktif", cards.activated ?? 0],
  ];

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <section style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
            REPUTASIPRO
          </div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 30 }}>
            Analitik & Wawasan
          </h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Ringkasan feedback pelanggan dan performa kartu bisnis.
          </p>

          {!userEmail ? (
            <form onSubmit={handleLogin} style={{ maxWidth: 440, display: "grid", gap: 10 }}>
              <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button style={buttonStyle} type="submit" disabled={loadingLogin}>
                {loadingLogin ? "Masuk..." : "Masuk"}
              </button>
              {loginError && <div style={{ color: "#991b1b" }}>{loginError}</div>}
            </form>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, background: "#f9fafb", borderRadius: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 14 }}>Akun: <strong>{userEmail}</strong></span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#111827", border: "1px solid #d1d5db" }} onClick={loadAnalytics}>
                    Muat Ulang
                  </button>
                </div>
              </div>

              <section
                style={{
                  padding: 14,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 16,
                  background: "#ffffff",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 10 }}>
                  Pilih Periode
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {([
                    ["hour", "Jam Ini"],
                    ["day", "Hari Ini"],
                    ["week", "Minggu Ini"],
                    ["month", "Bulan Ini"],
                    ["custom", "Kustom"],
                  ] as [PeriodKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPeriod(key)}
                      style={{
                        ...buttonStyle,
                        background: period === key ? "#111827" : "#ffffff",
                        color: period === key ? "#ffffff" : "#111827",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {period === "custom" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 800 }}>
                      Mulai
                      <input
                        type="datetime-local"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 800 }}>
                      Sampai
                      <input
                        type="datetime-local"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}

                {analytics?.start_at && analytics?.end_at && (
                  <div style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
                    Data periode: {new Date(analytics.start_at).toLocaleString("id-ID")} – {new Date(analytics.end_at).toLocaleString("id-ID")}
                  </div>
                )}
              </section>

              {businesses.length > 1 && (
                <select
                  value={businessId ?? ""}
                  onChange={(e) => setBusinessId(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 16, background: "#fff" }}
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

              {loadError && (
                <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b", marginBottom: 16 }}>
                  {loadError}
                </div>
              )}

              {loading ? (
                <p>Memuat analitik...</p>
              ) : analytics ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
                    {metricCards.map(([label, value]) => (
                      <div key={String(label)} style={{ padding: 16, borderRadius: 14, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
                        <div style={{ marginTop: 5, fontSize: 26, fontWeight: 900 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                    <section style={{ padding: 18, borderRadius: 14, border: "1px solid #e5e7eb" }}>
                      <h2 style={{ marginTop: 0, fontSize: 18 }}>Distribusi Rating Masukan</h2>
                      {[
                        ["★", feedback.rating_1 ?? 0],
                        ["★★", feedback.rating_2 ?? 0],
                        ["★★★", feedback.rating_3 ?? 0],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </section>

                    <section style={{ padding: 18, borderRadius: 14, border: "1px solid #e5e7eb" }}>
                      <h2 style={{ marginTop: 0, fontSize: 18 }}>Status Masukan</h2>
                      {[
                        ["Baru", feedback.new ?? 0],
                        ["Dilihat", feedback.viewed ?? 0],
                        ["Dihubungi", feedback.contacted ?? 0],
                        ["Selesai", feedback.resolved ?? 0],
                        ["Ditutup", feedback.closed ?? 0],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </section>


                  </div>
                </>
              ) : (
                <div style={{ color: "#6b7280" }}>Belum ada data analitik.</div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

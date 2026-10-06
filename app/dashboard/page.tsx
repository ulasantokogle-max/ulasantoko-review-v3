"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useBusinessContext } from "../../lib/useBusinessContext";
import { useLanguage } from "../../lib/i18n";

type AnalyticsData = {
  feedback?: {
    total?: number;
    average_rating?: number;
    new?: number;
    contactable?: number;
    last_7_days?: number;
  };
  cards?: {
    total?: number;
    active?: number;
    activated?: number;
  };
};

type SetupState = {
  displayName: string;
  whatsapp: string;
  reviewUrl: string;
};

export default function DashboardHomePage() {
  const { tr } = useLanguage();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [setup, setSetup] = useState<SetupState>({
    displayName: "",
    whatsapp: "",
    reviewUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

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
      loadSummary();
    } else {
      setAnalytics(null);
      setSetup({ displayName: "", whatsapp: "", reviewUrl: "" });
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
      console.error("Dashboard login failed", error);
      setLoginError("Email atau password tidak sesuai.");
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }


  async function loadSummary() {
    if (!businessId) return;

    setLoading(true);
    setLoadError("");

    const [analyticsResult, setupResult] = await Promise.all([
      supabase.rpc("v3_get_business_analytics", {
        p_business_id: businessId,
      }),
      supabase.rpc("v3_get_business_setup_status", {
        p_business_id: businessId,
      }),
    ]);

    setLoading(false);

    const firstError = analyticsResult.error || setupResult.error;

    if (firstError) {
      console.error("Dashboard summary load failed", firstError);
      setLoadError("Ringkasan dashboard belum dapat dimuat. Silakan coba lagi.");
      return;
    }

    setAnalytics((analyticsResult.data ?? null) as AnalyticsData | null);
    setSetup({
      displayName: setupResult.data?.display_name ?? "",
      whatsapp: setupResult.data?.whatsapp_number ?? "",
      reviewUrl: setupResult.data?.google_review_configured ? "configured" : "",
    });
  }

  const selectedBusiness = businesses.find(
    (item) => item.business_id === businessId
  );

  const checklist = useMemo(
    () => [
      {
        label: tr("Nama bisnis publik"),
        done: Boolean(setup.displayName),
        href: "/dashboard/landing-page",
      },
      {
        label: "Google Review",
        done: Boolean(setup.reviewUrl),
        href: "/dashboard/landing-page",
      },
      {
        label: tr("WhatsApp bisnis"),
        done: Boolean(setup.whatsapp),
        href: "/dashboard/landing-page",
      },
      {
        label: tr("Kartu sudah aktif"),
        done: Number(analytics?.cards?.activated ?? 0) > 0,
        href: "/dashboard/cards",
      },
    ],
    [setup, analytics, tr]
  );

  const completed = checklist.filter((item) => item.done).length;
  const progress = Math.round((completed / checklist.length) * 100);

  const metrics = [
    [tr("Kartu Aktif", "Active Cards"), analytics?.cards?.activated ?? 0],
    [tr("Total Masukan", "Total Feedback"), analytics?.feedback?.total ?? 0],
    [
      tr("Rata-rata Penilaian Internal", "Average Internal Rating"),
      Number(analytics?.feedback?.average_rating ?? 0).toFixed(1),
    ],
    [tr("Masukan Baru", "New Feedback"), analytics?.feedback?.new ?? 0],
    [tr("7 Hari Terakhir", "Last 7 Days"), analytics?.feedback?.last_7_days ?? 0],
    [tr("Bisa Dihubungi", "Contactable"), analytics?.feedback?.contactable ?? 0],
  ];

  const buttonStyle = {
    border: 0,
    borderRadius: 10,
    padding: "10px 13px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    background: "var(--dashboard-accent, #111827)",
    color: "#ffffff",
  } as const;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 15,
  } as const;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "32px 20px",
        color: "#111827",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 16px 50px rgba(15,23,42,.06)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
          REPUTASIPRO
        </div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 30 }}>{tr("Ringkasan Dashboard")}</h1>
        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          {tr("Ringkasan bisnis, status pengaturan, masukan, dan kartu dalam satu halaman.")}
        </p>

        {!userEmail ? (
          <form
            onSubmit={handleLogin}
            style={{ maxWidth: 440, display: "grid", gap: 10 }}
          >
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
              placeholder={tr("Password")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button style={buttonStyle} type="submit" disabled={loadingLogin}>
              {loadingLogin ? tr("Masuk...") : tr("Masuk")}
            </button>
            {loginError && <div style={{ color: "#991b1b" }}>{tr(loginError)}</div>}
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
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {tr("Akun:")} <strong>{userEmail}</strong>
                </div>
                <div style={{ marginTop: 3, fontWeight: 900 }}>
                  {selectedBusiness?.display_name ||
                    selectedBusiness?.business_name ||
                    tr("Bisnis")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    background: "#fff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                  }}
                  onClick={loadSummary}
                >
                  {tr("Muat Ulang")}
                </button>
              </div>
            </div>

            {businesses.length > 1 && (
              <select
                value={businessId ?? ""}
                onChange={(event) => setBusinessId(event.target.value)}
                style={{ ...inputStyle, marginBottom: 16, background: "#fff" }}
              >
                {businesses.map((business) => (
                  <option
                    key={business.business_id}
                    value={business.business_id}
                  >
                    {business.display_name || business.business_name}
                  </option>
                ))}
              </select>
            )}

            {(businessLoading || businessError) && (
              <div
                style={{
                  marginBottom: 14,
                  color: businessError ? "#991b1b" : "#6b7280",
                }}
              >
                {tr(businessError) || tr("Memuat bisnis...")}
              </div>
            )}

            {loadError && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "#fef2f2",
                  color: "#991b1b",
                  marginBottom: 16,
                }}
              >
                {tr(loadError)}
              </div>
            )}

            {loading ? (
              <p>{tr("Memuat dashboard...")}</p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(145px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {metrics.map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        {label}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 26,
                          fontWeight: 900,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                    gap: 14,
                  }}
                >
                  <section
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <h2 style={{ margin: 0, fontSize: 18 }}>
                        {tr("Setup Bisnis")}
                      </h2>
                      <strong>{progress}%</strong>
                    </div>

                    <div
                      style={{
                        height: 8,
                        background: "#e5e7eb",
                        borderRadius: 999,
                        overflow: "hidden",
                        margin: "12px 0 14px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: progress + "%",
                          background: "var(--dashboard-accent, #111827)",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 9 }}>
                      {checklist.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            textDecoration: "none",
                            color: "#111827",
                            padding: "10px 0",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <span>{item.label}</span>
                          <strong style={{ color: item.done ? "#166534" : "#92400e" }}>
                            {item.done ? tr("Selesai") : tr("Lengkapi")}
                          </strong>
                        </Link>
                      ))}
                    </div>
                  </section>

                  <section
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 18,
                    }}
                  >
                    <h2 style={{ marginTop: 0, fontSize: 18 }}>
                      {tr("Akses Cepat")}
                    </h2>
                    <div style={{ display: "grid", gap: 10 }}>
                      {[
                        ["/dashboard/feedback", tr("Buka Masukan", "Open Feedback")],
                        ["/dashboard/analytics", tr("Lihat Analitik", "View Analytics")],
                        ["/dashboard/cards", tr("Kelola Kartu")],
                        ["/dashboard/landing-page", tr("Pengeditan Halaman", "Edit Public Page")],
                      ].map(([href, label]) => (
                        <Link
                          key={href}
                          href={href}
                          style={{
                            textDecoration: "none",
                            color: "#111827",
                            padding: "11px 12px",
                            border: "1px solid #e5e7eb",
                            borderRadius: 10,
                            fontWeight: 800,
                          }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

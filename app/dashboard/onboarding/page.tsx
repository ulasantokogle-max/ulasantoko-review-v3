"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";

type SetupStatus = {
  display_name?: string;
  whatsapp_number?: string;
  google_review_configured?: boolean;
};

type AnalyticsData = {
  cards?: {
    activated?: number;
  };
};

export default function CustomerOnboardingPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupStatus>({});
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (businessId) loadStatus();
  }, [businessId]);

  async function loadStatus() {
    if (!businessId) return;

    setLoading(true);
    setError("");

    const [setupResult, analyticsResult] = await Promise.all([
      supabase.rpc("v3_get_business_setup_status", {
        p_business_id: businessId,
      }),
      supabase.rpc("v3_get_business_analytics", {
        p_business_id: businessId,
      }),
    ]);

    setLoading(false);

    const firstError = setupResult.error || analyticsResult.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    setSetup((setupResult.data ?? {}) as SetupStatus);
    setAnalytics((analyticsResult.data ?? null) as AnalyticsData | null);
  }

  const selectedBusiness = businesses.find(
    (item) => item.business_id === businessId
  );

  const steps = useMemo(
    () => [
      {
        number: 1,
        title: "Google Review",
        description: "Hubungkan lokasi Google Maps agar rating 4–5 bisa diarahkan ke Google Review.",
        done: Boolean(setup.google_review_configured),
        href: "/dashboard/google-review",
        action: setup.google_review_configured ? "Sudah terhubung" : "Hubungkan Google Review",
      },
      {
        number: 2,
        title: "WhatsApp Bisnis",
        description: "Tambahkan nomor WhatsApp agar customer bisa menghubungi bisnis setelah memberi feedback privat.",
        done: Boolean(setup.whatsapp_number),
        href: "/dashboard/contact",
        action: setup.whatsapp_number ? "Sudah tersimpan" : "Tambahkan WhatsApp",
      },
      {
        number: 3,
        title: "Cek Kartu",
        description: "Pastikan kartu sudah aktif dan siap dipakai melalui QR maupun NFC.",
        done: Number(analytics?.cards?.activated ?? 0) > 0,
        href: "/dashboard/cards",
        action:
          Number(analytics?.cards?.activated ?? 0) > 0
            ? "Kartu aktif"
            : "Cek Card Management",
      },
    ],
    [setup, analytics]
  );

  const completed = steps.filter((item) => item.done).length;
  const progress = Math.round((completed / steps.length) * 100);

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
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 18px 60px rgba(15,23,42,.06)",
  } as const;

  if (!userEmail) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
            ULASANTOKO REVIEW V3
          </div>
          <h1 style={{ marginBottom: 8 }}>Onboarding Bisnis</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Silakan login kembali dari dashboard untuk melanjutkan setup bisnis.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "12px 16px",
              borderRadius: 10,
              background: "#111827",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Buka Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>
          ULASANTOKO REVIEW V3
        </div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 30 }}>Setup Bisnis Anda</h1>
        <p style={{ color: "#6b7280", lineHeight: 1.6, marginTop: 0 }}>
          Kartu sudah aktif. Selesaikan beberapa langkah ini supaya UlasanToko siap dipakai customer.
        </p>

        <div
          style={{
            padding: 14,
            background: "#f9fafb",
            borderRadius: 12,
            margin: "18px 0",
          }}
        >
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Login sebagai <strong>{userEmail}</strong>
          </div>
          <div style={{ fontWeight: 900, marginTop: 3 }}>
            {selectedBusiness?.display_name ||
              selectedBusiness?.business_name ||
              setup.display_name ||
              "Bisnis"}
          </div>
        </div>

        {businesses.length > 1 && (
          <select
            value={businessId ?? ""}
            onChange={(event) => setBusinessId(event.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              marginBottom: 16,
              background: "#fff",
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
              marginBottom: 12,
              color: businessError ? "#991b1b" : "#6b7280",
            }}
          >
            {businessError || "Memuat bisnis..."}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p>Memuat status setup...</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <strong>Progress setup</strong>
              <strong>{progress}%</strong>
            </div>

            <div
              style={{
                height: 9,
                background: "#e5e7eb",
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: progress + "%",
                  height: "100%",
                  background: "#111827",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {steps.map((step) => (
                <div
                  key={step.number}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 16,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 14,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        LANGKAH {step.number}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 17, marginTop: 3 }}>
                        {step.title}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                        background: step.done ? "#f0fdf4" : "#fff7ed",
                        color: step.done ? "#166534" : "#9a3412",
                      }}
                    >
                      {step.done ? "SELESAI" : "BELUM"}
                    </span>
                  </div>

                  <div style={{ color: "#6b7280", lineHeight: 1.5 }}>
                    {step.description}
                  </div>

                  <Link
                    href={step.href}
                    style={{
                      textDecoration: "none",
                      display: "inline-block",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      color: "#111827",
                      fontWeight: 800,
                    }}
                  >
                    {step.action}
                  </Link>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 20,
              }}
            >
              <Link
                href="/dashboard"
                style={{
                  textDecoration: "none",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 900,
                }}
              >
                Buka Dashboard
              </Link>

              {progress === 100 && (
                <Link
                  href="/dashboard/cards"
                  style={{
                    textDecoration: "none",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    color: "#111827",
                    fontWeight: 900,
                  }}
                >
                  Lihat Kartu Saya
                </Link>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

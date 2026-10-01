"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const DEMO_BUSINESS_ID = "99438efc-aeb4-436a-b0c6-90b0a1832674";

type FeedbackRow = {
  id: string;
  rating: number;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  category: string | null;
  contact_consent: boolean;
  status: string;
  created_at: string;
};

export default function FeedbackInboxPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

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
    if (userEmail) {
      loadFeedback();
    } else {
      setFeedback([]);
    }
  }, [userEmail]);

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
    setFeedback([]);
  }

  async function loadFeedback() {
    setLoadError("");
    setLoadingFeedback(true);

    const { data, error } = await supabase.rpc("v3_get_feedback_inbox", {
      p_business_id: DEMO_BUSINESS_ID,
      p_limit: 100,
    });

    setLoadingFeedback(false);

    if (error) {
      setLoadError(error.message);
      setFeedback([]);
      return;
    }

    setFeedback((data ?? []) as FeedbackRow[]);
  }

  const stats = useMemo(() => {
    const total = feedback.length;
    const newCount = feedback.filter((item) => item.status === "new").length;
    const avg =
      total > 0
        ? (
            feedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
            total
          ).toFixed(1)
        : "-";

    return { total, newCount, avg };
  }, [feedback]);

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "32px 20px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#111827",
  } as const;

  const shellStyle = {
    maxWidth: 980,
    margin: "0 auto",
  } as const;

  const cardStyle = {
    background: "#ffffff",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 16px 50px rgba(15, 23, 42, 0.06)",
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
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
  } as const;

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <section style={cardStyle}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.7,
              color: "#6b7280",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            UlasanToko Review V3
          </div>

          <h1 style={{ margin: 0, fontSize: 30 }}>Feedback Inbox</h1>

          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Feedback privat dari pelanggan yang memberikan rating 1–3 bintang.
          </p>

          {!userEmail ? (
            <form onSubmit={handleLogin} style={{ maxWidth: 420 }}>
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

                <button
                  type="submit"
                  style={buttonStyle}
                  disabled={loadingLogin}
                >
                  {loadingLogin ? "Login..." : "Login"}
                </button>
              </div>

              {loginError && (
                <p style={{ color: "#b91c1c", marginTop: 12 }}>{loginError}</p>
              )}
            </form>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#f9fafb",
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 14 }}>
                  Login sebagai <strong>{userEmail}</strong>
                </span>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={loadFeedback}
                    style={{
                      ...buttonStyle,
                      background: "#ffffff",
                      color: "#111827",
                      border: "1px solid #d1d5db",
                      padding: "9px 12px",
                    }}
                  >
                    Refresh
                  </button>

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
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  ["Total Feedback", String(stats.total)],
                  ["Status New", String(stats.newCount)],
                  ["Rata-rata Rating", stats.avg],
                ].map(([label, value]) => (
                  <div
                    key={label}
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
                        marginTop: 6,
                        fontSize: 24,
                        fontWeight: 800,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {loadError && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#fef2f2",
                    color: "#991b1b",
                    marginBottom: 16,
                  }}
                >
                  {loadError}
                </div>
              )}

              {loadingFeedback ? (
                <p>Memuat feedback...</p>
              ) : feedback.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 14,
                    border: "1px dashed #d1d5db",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  Belum ada feedback.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {feedback.map((item) => (
                    <article
                      key={item.id}
                      style={{
                        padding: 18,
                        borderRadius: 16,
                        border: "1px solid #e5e7eb",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 17,
                              marginBottom: 4,
                            }}
                          >
                            {"★".repeat(item.rating)}
                            <span style={{ color: "#d1d5db" }}>
                              {"★".repeat(5 - item.rating)}
                            </span>
                          </div>

                          <div style={{ fontWeight: 700 }}>
                            {item.customer_name || "Pelanggan anonim"}
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "5px 9px",
                            borderRadius: 999,
                            background:
                              item.status === "new" ? "#fef3c7" : "#f3f4f6",
                            color:
                              item.status === "new" ? "#92400e" : "#4b5563",
                            fontSize: 12,
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      {item.message && (
                        <div
                          style={{
                            marginTop: 14,
                            lineHeight: 1.6,
                            color: "#374151",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.message}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gap: 5,
                          fontSize: 13,
                          color: "#6b7280",
                        }}
                      >
                        <div>
                          WhatsApp: {item.customer_phone || "-"}
                        </div>
                        <div>
                          Boleh dihubungi:{" "}
                          {item.contact_consent ? "Ya" : "Tidak"}
                        </div>
                        <div>
                          Waktu:{" "}
                          {new Date(item.created_at).toLocaleString("id-ID")}
                        </div>
                      </div>

                      {item.customer_phone && item.contact_consent && (
                        <a
                          href={`https://wa.me/${item.customer_phone.replace(
                            /\D/g,
                            ""
                          ).replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-block",
                            marginTop: 14,
                            textDecoration: "none",
                            background: "#16a34a",
                            color: "#ffffff",
                            padding: "10px 12px",
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          Hubungi via WhatsApp
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

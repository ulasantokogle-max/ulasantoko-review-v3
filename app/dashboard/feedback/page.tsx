"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";
import { useLanguage } from "../../../lib/i18n";

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
  const { tr, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      loadFeedback();
    } else {
      setFeedback([]);
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
      console.error("Feedback dashboard login failed", error);
      setLoginError("Email atau password tidak sesuai.");
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }


  async function loadFeedback() {
    setLoadError("");
    setLoadingFeedback(true);

    const { data, error } = await supabase.rpc("v3_get_feedback_inbox", {
      p_business_id: businessId,
      p_limit: 100,
    });

    setLoadingFeedback(false);

    if (error) {
      console.error("Feedback inbox load failed", error);
      setLoadError("Masukan belum dapat dimuat. Silakan coba lagi.");
      setFeedback([]);
      return;
    }

    setFeedback((data ?? []) as FeedbackRow[]);
  }

  async function updateStatus(feedbackId: string, status: string) {
    setUpdatingId(feedbackId);
    setLoadError("");

    const { data, error } = await supabase.rpc("v3_update_feedback_status", {
      p_feedback_id: feedbackId,
      p_status: status,
    });

    setUpdatingId(null);

    if (error) {
      console.error("Feedback status update failed", error);
      setLoadError("Status masukan belum dapat diperbarui. Silakan coba lagi.");
      return;
    }

    if (data?.success === false) {
      console.error("Feedback status update returned unsuccessful result", data);
      setLoadError("Status masukan belum dapat diperbarui. Silakan coba lagi.");
      return;
    }

    setFeedback((current) =>
      current.map((item) =>
        item.id === feedbackId ? { ...item, status } : item
      )
    );
  }

  const filteredFeedback = useMemo(() => {
    if (statusFilter === "all") return feedback;
    return feedback.filter((item) => item.status === statusFilter);
  }, [feedback, statusFilter]);

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
            ReputasiPro
          </div>

            <h1 style={{ margin: 0, fontSize: 30 }}>{tr("Masukan Pelanggan")}</h1>

          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            {tr("Masukan privat dari pelanggan yang memberikan rating 1–3 bintang.")}
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
                  placeholder={tr("Password")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="submit"
                  style={buttonStyle}
                  disabled={loadingLogin}
                >
                  {loadingLogin ? tr("Masuk...") : tr("Masuk")}
                </button>
              </div>

              {loginError && (
                <p style={{ color: "#b91c1c", marginTop: 12 }}>{tr(loginError)}</p>
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
                  {tr("Akun:")} <strong>{userEmail}</strong>
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
                    {tr("Muat Ulang")}
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
                  [tr("Total Masukan", "Total Feedback"), String(stats.total)],
                  [tr("Status Baru", "New Status"), String(stats.newCount)],
                  [tr("Rata-rata Rating"), stats.avg],
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

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {["all", "new", "viewed", "contacted", "resolved", "closed"].map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      style={{
                        ...buttonStyle,
                        padding: "8px 11px",
                        background:
                          statusFilter === status ? "#111827" : "#ffffff",
                        color:
                          statusFilter === status ? "#ffffff" : "#111827",
                        border: "1px solid #d1d5db",
                        textTransform: "capitalize",
                      }}
                    >
                      {status === "all"
                        ? tr("Semua", "All")
                        : status === "new"
                          ? tr("Baru", "New")
                          : status === "viewed"
                            ? tr("Dilihat", "Viewed")
                            : status === "contacted"
                              ? tr("Dihubungi", "Contacted")
                              : status === "resolved"
                                ? tr("Selesai", "Resolved")
                                : tr("Ditutup", "Closed")}
                    </button>
                  )
                )}
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
                  {tr(loadError)}
                </div>
              )}

              {loadingFeedback ? (
                <p>{tr("Memuat masukan...")}</p>
              ) : filteredFeedback.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 14,
                    border: "1px dashed #d1d5db",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  {tr("Belum ada masukan.")}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {filteredFeedback.map((item) => (
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
                            {item.customer_name || tr("Pelanggan anonim", "Anonymous customer")}
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
                          {tr(item.status)}
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
                          {tr("Boleh dihubungi:")}{" "}
                          {item.contact_consent ? tr("Ya") : tr("Tidak")}
                        </div>
                        <div>
                          {tr("Waktu:")}{" "}
                          {new Date(item.created_at).toLocaleString(language === "en" ? "en-US" : "id-ID", { timeZone: "Asia/Jakarta" })}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
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
                          {tr("Hubungi via WhatsApp")}
                        </a>
                        )}

                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(event) =>
                            updateStatus(item.id, event.target.value)
                          }
                          style={{
                            padding: "9px 10px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          <option value="new">{tr("Baru")}</option>
                          <option value="viewed">{tr("Dilihat")}</option>
                          <option value="contacted">{tr("Dihubungi")}</option>
                          <option value="resolved">{tr("Selesai")}</option>
                          <option value="closed">{tr("Ditutup")}</option>
                        </select>

                        {item.status === "new" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, "viewed")}
                            disabled={updatingId === item.id}
                            style={{
                              ...buttonStyle,
                              padding: "9px 11px",
                              background: "#ffffff",
                              color: "#111827",
                              border: "1px solid #d1d5db",
                            }}
                          >
                            {tr("Tandai Dilihat")}
                          </button>
                        )}

                        {item.status !== "resolved" &&
                          item.status !== "closed" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(item.id, "resolved")}
                              disabled={updatingId === item.id}
                              style={{
                                ...buttonStyle,
                                padding: "9px 11px",
                              }}
                            >
                              {tr("Selesai")}
                            </button>
                          )}
                      </div>
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

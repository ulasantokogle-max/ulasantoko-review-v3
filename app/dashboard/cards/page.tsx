"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";
import { useLanguage } from "../../../lib/i18n";
import { getCardPublicPath } from "../../../lib/cardPublicId";

type CardRow = {
  id: string;
  card_code: string;
  label: string | null;
  area: string | null;
  internal_code: string | null;
  status: "active" | "suspended" | "retired";
  activation_status: "unassigned" | "assigned" | "activated";
  qr_enabled: boolean | null;
  qr_url: string | null;
  nfc_enabled: boolean | null;
  nfc_identifier: string | null;
  created_at: string;
  activated_at: string | null;
};

export default function CardsDashboardPage() {
  const { tr } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftArea, setDraftArea] = useState("");
  const [draftStatus, setDraftStatus] = useState<CardRow["status"]>("active");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

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
      loadCards();
    } else {
      setCards([]);
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
      console.error("Card dashboard login failed", error);
      setLoginError("Email atau password tidak sesuai.");
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }


  async function loadCards() {
    setLoadError("");
    setLoadingCards(true);

    const { data, error } = await supabase.rpc("v3_get_cards", {
      p_business_id: businessId,
    });

    setLoadingCards(false);

    if (error) {
      console.error("Card list load failed", error);
      setLoadError("Daftar kartu belum dapat dimuat. Silakan coba lagi.");
      setCards([]);
      return;
    }

    setCards((data ?? []) as CardRow[]);
  }

  function startEdit(card: CardRow) {
    setEditingId(card.id);
    setDraftLabel(card.label ?? "");
    setDraftArea(card.area ?? "");
    setDraftStatus(card.status);
  }

  async function resetCardSetup(card: CardRow) {
    const typed = window.prompt(
      tr(`Reset setup untuk ${card.card_code}?\n\nGoogle Review dan WhatsApp bisnis akan dikosongkan. Kepemilikan kartu, masukan, analitik, QR/NFC, dan status aktivasi tetap dipertahankan.\n\nKetik ${card.card_code} untuk konfirmasi.`, `Reset setup for ${card.card_code}?\n\nGoogle Review and business WhatsApp will be cleared. Card ownership, feedback, analytics, QR/NFC, and activation status will be retained.\n\nType ${card.card_code} to confirm.`)
    );

    if (typed !== card.card_code) {
      if (typed !== null) {
        setResetError("Reset dibatalkan karena Kode Kartu tidak sesuai.");
      }
      return;
    }

    setResetError("");
    setResetMessage("");
    setResettingId(card.id);

    const { data, error } = await supabase.rpc(
      "v3_customer_reset_card_setup",
      {
        p_card_id: card.id,
      }
    );

    setResettingId(null);

    if (error) {
      console.error("Card setup reset failed", error);
      setResetError("Setup kartu belum dapat direset. Silakan coba lagi.");
      return;
    }

    if (data?.success === false) {
      console.error("Card setup reset returned unsuccessful result", data);
      setResetError("Setup kartu belum dapat direset. Silakan coba lagi.");
      return;
    }

    setResetMessage(
      tr(`Setup ${card.card_code} berhasil direset. Kartu tetap menjadi milik bisnis Anda.`, `Setup for ${card.card_code} has been reset. The card still belongs to your business.`)
    );
    await loadCards();
  }

  async function saveCard(card: CardRow) {
    setSavingId(card.id);
    setLoadError("");

    const { data, error } = await supabase.rpc("v3_update_card", {
      p_card_id: card.id,
      p_label: draftLabel,
      p_area: draftArea,
      p_status: draftStatus,
    });

    setSavingId(null);

    if (error) {
      console.error("Card update failed", error);
      setLoadError("Perubahan kartu belum dapat disimpan. Silakan coba lagi.");
      return;
    }

    if (data?.success === false) {
      console.error("Card update returned unsuccessful result", data);
      setLoadError("Perubahan kartu belum dapat disimpan. Silakan coba lagi.");
      return;
    }

    setCards((current) =>
      current.map((item) =>
        item.id === card.id
          ? {
              ...item,
              label: data?.label ?? null,
              area: data?.area ?? null,
              status: data?.status ?? draftStatus,
            }
          : item
      )
    );

    setEditingId(null);
  }

  const stats = useMemo(() => {
    const total = cards.length;
    const active = cards.filter((card) => card.status === "active").length;
    const activated = cards.filter(
      (card) => card.activation_status === "activated"
    ).length;

    return { total, active, activated };
  }, [cards]);

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
  } as const;

  const buttonStyle = {
    border: 0,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    background: "var(--dashboard-accent, #111827)",
    color: "#ffffff",
  } as const;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "32px 20px",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 18,
          padding: 24,
          border: "1px solid #e5e7eb",
          boxShadow: "0 16px 50px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: "#6b7280",
            marginBottom: 8,
          }}
        >
          ReputasiPro
        </div>

        <h1 style={{ margin: 0, fontSize: 30 }}>{tr("Manajemen Kartu")}</h1>
        <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
          {tr("Kelola kartu QR/NFC, status operasional, label, dan area penggunaan.")}
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
                {tr(businessError) || tr("Memuat bisnis...")}
              </div>
            )}

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
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 14 }}>
                {tr("Akun:")} <strong>{userEmail}</strong>
              </span>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={loadCards}
                  style={{
                    ...buttonStyle,
                    background: "#ffffff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
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
                [tr("Total Kartu", "Total Cards"), stats.total],
                [tr("Kartu Aktif", "Active Cards"), stats.active],
                [tr("Sudah Diaktifkan", "Activated"), stats.activated],
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
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{label}</div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {resetMessage && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "#f0fdf4",
                  color: "#166534",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 800 }}>{tr(resetMessage)}</div>
                <a
                  href="/dashboard/onboarding"
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    color: "#166534",
                    fontWeight: 800,
                  }}
                >
                  {tr("Setup ulang bisnis")}
                </a>
              </div>
            )}

            {resetError && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "#fef2f2",
                  color: "#991b1b",
                  marginBottom: 16,
                }}
              >
                {tr(resetError)}
              </div>
            )}

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

            {loadingCards ? (
              <p>{tr("Memuat kartu...")}</p>
            ) : cards.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 14,
                  border: "1px dashed #d1d5db",
                  color: "#6b7280",
                  textAlign: "center",
                }}
              >
                {tr("Belum ada kartu.")}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {cards.map((card) => {
                  const editing = editingId === card.id;

                  return (
                    <article
                      key={card.id}
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
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 19,
                              fontWeight: 900,
                              marginBottom: 4,
                            }}
                          >
                            {card.card_code}
                          </div>
                          <div style={{ color: "#6b7280", fontSize: 13 }}>
                            {card.internal_code || tr("Tanpa kode internal", "No internal code")}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              padding: "5px 9px",
                              borderRadius: 999,
                              background:
                                card.status === "active" ? "#dcfce7" : "#f3f4f6",
                              color:
                                card.status === "active" ? "#166534" : "#4b5563",
                              fontSize: 12,
                              fontWeight: 800,
                              textTransform: "uppercase",
                            }}
                          >
                            {card.status === "active"
                              ? tr("Aktif", "Active")
                              : card.status === "suspended"
                                ? tr("Ditangguhkan", "Suspended")
                                : tr("Tidak Digunakan", "Retired")}
                          </span>

                          <span
                            style={{
                              padding: "5px 9px",
                              borderRadius: 999,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: 12,
                              fontWeight: 800,
                              textTransform: "uppercase",
                            }}
                          >
                            {card.activation_status === "activated"
                              ? tr("Sudah Diaktifkan", "Activated")
                              : card.activation_status === "assigned"
                                ? tr("Sudah Ditugaskan", "Assigned")
                                : tr("Belum Ditugaskan", "Unassigned")}
                          </span>
                        </div>
                      </div>

                      {editing ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            marginTop: 16,
                            padding: 14,
                            borderRadius: 12,
                            background: "#f9fafb",
                          }}
                        >
                          <input
                            style={inputStyle}
                            value={draftLabel}
                            onChange={(event) => setDraftLabel(event.target.value)}
                            placeholder={tr("Label kartu")}
                          />

                          <input
                            style={inputStyle}
                            value={draftArea}
                            onChange={(event) => setDraftArea(event.target.value)}
                            placeholder={tr("Area")}
                          />

                          <select
                            style={inputStyle}
                            value={draftStatus}
                            onChange={(event) =>
                              setDraftStatus(
                                event.target.value as CardRow["status"]
                              )
                            }
                          >
                            <option value="active">{tr("Aktif")}</option>
                            <option value="suspended">{tr("Ditangguhkan")}</option>
                            <option value="retired">{tr("Tidak Digunakan")}</option>
                          </select>

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              style={buttonStyle}
                              disabled={savingId === card.id}
                              onClick={() => saveCard(card)}
                            >
                              {savingId === card.id
                                ? tr("Menyimpan...")
                                : tr("Simpan Perubahan")}
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={{
                                ...buttonStyle,
                                background: "#ffffff",
                                color: "#111827",
                                border: "1px solid #d1d5db",
                              }}
                            >
                              {tr("Batal")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gap: 7,
                              marginTop: 16,
                              color: "#4b5563",
                              fontSize: 14,
                            }}
                          >
                            <div>
                              <strong>{tr("Label:")}</strong> {card.label || "-"}
                            </div>
                            <div>
                              <strong>{tr("Area:")}</strong> {card.area || "-"}
                            </div>
                            <div>
                              <strong>QR:</strong>{" "}
                              {card.qr_enabled ? tr("Aktif", "Active") : tr("Nonaktif")}
                            </div>
                            <div>
                              <strong>NFC:</strong>{" "}
                              {card.nfc_enabled ? tr("Aktif", "Active") : tr("Nonaktif")}
                              {card.nfc_identifier
                                ? ` · ${card.nfc_identifier}`
                                : ""}
                            </div>
                            <div style={{ overflowWrap: "anywhere" }}>
                              <strong>URL:</strong>{" "}
                              {"https://reputasipro.ulasantoko.space" + getCardPublicPath(card.qr_url, card.card_code)}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 16,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {card.card_code && (
                              <a
                                href={getCardPublicPath(card.qr_url, card.card_code)}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  ...buttonStyle,
                                  textDecoration: "none",
                                }}
                              >
                                {tr("Lihat Halaman Publik")}
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => startEdit(card)}
                              style={{
                                ...buttonStyle,
                                background: "#ffffff",
                                color: "#111827",
                                border: "1px solid #d1d5db",
                              }}
                            >
                              {tr("Edit Kartu")}
                            </button>

                            {card.activation_status === "activated" && (
                              <button
                                type="button"
                                disabled={resettingId === card.id}
                                onClick={() => resetCardSetup(card)}
                                style={{
                                  ...buttonStyle,
                                  background: "#fff7ed",
                                  color: "#9a3412",
                                  border: "1px solid #fed7aa",
                                }}
                              >
                                {resettingId === card.id
                                  ? tr("Mereset...")
                                  : tr("Reset Setup")}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

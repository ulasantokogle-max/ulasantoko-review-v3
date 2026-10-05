"use client";

import Link from "next/link";
import ProviderMfaGate from "../../components/ProviderMfaGate";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../lib/i18n";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import DownloadCardQr from "../../components/DownloadCardQr";
import WriteCardNfc from "../../components/WriteCardNfc";
import GoogleQuotaPanel from "../../components/GoogleQuotaPanel";
import DeleteProviderCard from "../../components/DeleteProviderCard";

type ProviderCard = {
  id: string;
  card_code: string;
  label: string | null;
  area: string | null;
  internal_code: string | null;
  operational_status: string;
  activation_status: string;
  business_id: string | null;
  business_name: string | null;
  qr_url: string | null;
  qr_enabled: boolean;
  nfc_enabled: boolean;
  nfc_identifier: string | null;
  inventory_status: string;
  created_at: string;
  activated_at: string | null;
};

type CreateResult = {
  success?: boolean;
  card_id?: string;
  card_code?: string;
  activation_pin?: string;
  qr_url?: string;
  nfc_url?: string;
  inventory_status?: string;
  message?: string;
};

type ResetPinResult = {
  success?: boolean;
  card_id?: string;
  card_code?: string;
  activation_pin?: string;
  message?: string;
};

export default function ProviderCardsPage() {
  return <ProviderMfaGate><ProviderCardsPageContent /></ProviderMfaGate>;
}

function ProviderCardsPageContent() {
  const { tr } = useLanguage();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [providerAllowed, setProviderAllowed] = useState<boolean | null>(null);

  const [cards, setCards] = useState<ProviderCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [label, setLabel] = useState("");
  const [area, setArea] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [created, setCreated] = useState<CreateResult | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState("");
  const [resettingCardId, setResettingCardId] = useState<string | null>(null);
  const [resetPinResult, setResetPinResult] = useState<ResetPinResult | null>(null);
  const [resetPinError, setResetPinError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

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
      checkProvider();
    } else {
      setProviderAllowed(null);
      setCards([]);
    }
  }, [userEmail]);

  async function checkProvider() {
    setLoadError("");

    const { data, error } = await supabase.rpc("v3_is_provider_admin");

    if (error) {
      console.error("Provider access check failed", error);
      setLoadError("Akses provider belum dapat diverifikasi. Silakan coba lagi.");
      setProviderAllowed(false);
      return;
    }

    const allowed = Boolean(data);
    setProviderAllowed(allowed);

    if (allowed) {
      loadCards();
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Provider login failed", error);
      setLoginError("Email atau password tidak sesuai.");
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setProviderAllowed(null);
    setCards([]);
    setCreated(null);
  }

  async function loadCards() {
    setLoadingCards(true);
    setLoadError("");

    const { data, error } = await supabase.rpc("v3_provider_list_cards", {
      p_limit: 200,
    });

    setLoadingCards(false);

    if (error) {
      console.error("Provider card list load failed", error);
      setLoadError("Daftar kartu belum dapat dimuat. Silakan coba lagi.");
      setCards([]);
      return;
    }

    setCards((data ?? []) as ProviderCard[]);
  }

  async function createCard(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreated(null);

    const { data, error } = await supabase.rpc("v3_provider_create_card", {
      p_label: label || null,
      p_area: area || null,
      p_internal_code: internalCode || null,
    });

    setCreating(false);

    if (error) {
      console.error("Provider card creation failed", error);
      setCreateError("Kartu belum dapat dibuat. Silakan coba lagi.");
      return;
    }

    if (!data?.success) {
      console.error("Provider card creation returned unsuccessful result", data);
      setCreateError("Kartu belum dapat dibuat. Periksa data lalu coba lagi.");
      return;
    }

    setCreated(data as CreateResult);
    setLabel("");
    setArea("");
    setInternalCode("");
    await loadCards();
  }

  async function copyText(value?: string, label?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label || tr("Tersalin"));
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function resetActivationPin(card: ProviderCard) {
    const confirmed = window.confirm(
      tr(`Reset PIN aktivasi untuk ${card.card_code}? PIN lama akan langsung tidak berlaku.`, `Reset the activation PIN for ${card.card_code}? The old PIN will stop working immediately.`)
    );

    if (!confirmed) return;

    setResetPinError("");
    setResetPinResult(null);
    setResettingCardId(card.id);

    const { data, error } = await supabase.rpc(
      "v3_provider_reset_activation_pin",
      {
        p_card_id: card.id,
      }
    );

    setResettingCardId(null);

    if (error) {
      console.error("Provider PIN reset failed", error);
      setResetPinError("PIN belum dapat direset. Silakan coba lagi.");
      return;
    }

    if (!data?.success) {
      console.error("Provider PIN reset returned unsuccessful result", data);
      setResetPinError("PIN belum dapat direset untuk kartu ini.");
      return;
    }

    setResetPinResult(data as ResetPinResult);
    await loadCards();
  }

  function cardDeleted(id: string) {
    setCards(current => current.filter(card => card.id !== id));
    setCreated(current => current?.card_id === id ? null : current);
    setResetPinResult(current => current?.card_id === id ? null : current);
    setDeleteMessage(tr("Kartu berhasil dihapus dari inventori.", "Card removed from inventory."));
  }

  const stats = useMemo(() => {
    return {
      total: cards.length,
      ready: cards.filter((card) => card.inventory_status === "ready_to_sell").length,
      activated: cards.filter((card) => card.inventory_status === "activated").length,
    };
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesStatus =
        statusFilter === "all" || card.inventory_status === statusFilter;

      const haystack = [
        card.card_code,
        card.label,
        card.area,
        card.internal_code,
        card.business_name,
        card.qr_url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || haystack.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [cards, search, statusFilter]);

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
    background: "#ffffff",
  };

  const buttonStyle = {
    border: 0,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
  } as const;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "28px 16px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#111827",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ marginBottom: 10 }}><LanguageSwitcher /></div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: .7,
                color: "#6b7280",
              }}
            >
              REPUTASIPRO PROVIDER
            </div>
            <h1 style={{ margin: "5px 0 0", fontSize: 30 }}>{tr("Pusat Kartu")}</h1>
            <p style={{ margin: "7px 0 0", color: "#6b7280" }}>
              {tr("Produksi kartu QR + NFC siap jual sebelum diaktifkan pemilik bisnis.")}
            </p>
          </div>

          {userEmail && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {providerAllowed && <Link href="/provider/security" style={{ ...buttonStyle, textDecoration: "none" }}>{tr("Keamanan 2FA", "2FA Security")}</Link>}
              {providerAllowed && (
                <Link
                  href="/access"
                  style={{
                    ...buttonStyle,
                    background: "#ffffff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    textDecoration: "none",
                  }}
                >
                  {tr("Menu Akses")}
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  ...buttonStyle,
                  background: "#ffffff",
                  color: "#111827",
                  border: "1px solid #d1d5db",
                }}
              >
                Keluar
              </button>
            </div>
          )}
        </header>
        {providerAllowed && <GoogleQuotaPanel />}

        {!userEmail ? (
          <section
            style={{
              maxWidth: 460,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 22,
            }}
          >
            <h2 style={{ marginTop: 0 }}>{tr("Masuk Provider")}</h2>
            <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
              <input
                style={inputStyle}
                type="email"
                placeholder={tr("Email provider")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                style={inputStyle}
                type="password"
                placeholder={tr("Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button style={buttonStyle} type="submit">
                {tr("Masuk Provider")}
              </button>
            </form>
            {loginError && <p style={{ color: "#b91c1c" }}>{tr(loginError)}</p>}
          </section>
        ) : providerAllowed === false ? (
          <section
            style={{
              background: "#fff",
              border: "1px solid #fecaca",
              borderRadius: 18,
              padding: 22,
              color: "#991b1b",
            }}
          >
            {tr("Akun")} <strong>{userEmail}</strong> {tr("tidak memiliki akses provider.")}
          </section>
        ) : providerAllowed === null ? (
          <p>{tr("Memeriksa akses provider...")}</p>
        ) : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              {[
                [tr("Total Kartu", "Total Cards"), stats.total],
                [tr("Siap Dijual", "Ready to Sell"), stats.ready],
                [tr("Sudah Diaktifkan", "Activated"), stats.activated],
              ].map(([name, value]) => (
                <div
                  key={String(name)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 25, fontWeight: 900, marginTop: 4 }}>
                    {value}
                  </div>
                </div>
              ))}
            </section>

            <section
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 20,
                marginBottom: 18,
              }}
            >
              <h2 style={{ marginTop: 0 }}>{tr("Buat Kartu Baru")}</h2>
              <p style={{ color: "#6b7280", lineHeight: 1.5 }}>
                {tr("Kode Kartu dan PIN dibuat otomatis. PIN hanya ditampilkan setelah kartu dibuat, jadi simpan/cetak bersama kartu fisik.")}
              </p>

              <form
                onSubmit={createCard}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <input
                  style={inputStyle}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={tr("Label (opsional)")}
                />
                <input
                  style={inputStyle}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={tr("Area / batch (opsional)")}
                />
                <input
                  style={inputStyle}
                  value={internalCode}
                  onChange={(e) => setInternalCode(e.target.value)}
                  placeholder={tr("Kode internal / SKU (opsional)")}
                />
                <button style={buttonStyle} type="submit" disabled={creating}>
                  {creating ? tr("Membuat...") : tr("Buat Kartu", "Create Card")}
                </button>
              </form>

              {createError && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 10,
                    background: "#fef2f2",
                    color: "#991b1b",
                  }}
                >
                  {createError}
                </div>
              )}

              {created?.success && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    borderRadius: 14,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{tr("Kartu siap dijual ✅")}</h3>
                  <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                    <div><strong>{tr("Kode Kartu:")}</strong> {created.card_code}</div>
                    <div><strong>{tr("PIN Aktivasi:")}</strong> {created.activation_pin}</div>
                    <div style={{ overflowWrap: "anywhere" }}>
                      <strong>QR / NFC URL:</strong> {created.qr_url}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => copyText(created.card_code, tr("Kode Kartu", "Card Code"))}
                    >
                      {tr("Salin Kode Kartu")}
                    </button>
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => copyText(created.activation_pin, "PIN")}
                    >
                      {tr("Salin PIN")}
                    </button>
                    <button
                      type="button"
                      style={{
                        ...buttonStyle,
                        background: "#ffffff",
                        color: "#111827",
                        border: "1px solid #d1d5db",
                      }}
                      onClick={() => copyText(created.qr_url, "URL")}
                    >
                      {tr("Salin URL")}
                    </button>
                    {created.card_code && created.qr_url && (
                      <DownloadCardQr cardCode={created.card_code} url={created.qr_url} />
                    )}
                    {created.card_code && (created.nfc_url || created.qr_url) && <WriteCardNfc cardCode={created.card_code} url={(created.nfc_url || created.qr_url)!} />}
                  </div>
                </div>
              )}
            </section>

            <section
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>{tr("Inventori Kartu")}</h2>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                    {tr("Kartu provider, baik belum terjual maupun sudah aktif.")}
                  </div>
                </div>
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 180px",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <input
                  style={inputStyle}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr("Cari kode kartu, label, area, SKU, pemilik bisnis...", "Search card code, label, area, SKU, owner...")}
                />
                <select
                  style={inputStyle}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">{tr("Semua status")}</option>
                  <option value="ready_to_sell">{tr("Siap Dijual")}</option>
                  <option value="activated">{tr("Sudah Diaktifkan")}</option>
                </select>
              </div>

              {resetPinResult?.success && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    {tr("PIN baru untuk")} {resetPinResult.card_code}
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 10 }}>
                    {tr("PIN Aktivasi:")} <strong>{resetPinResult.activation_pin}</strong>
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 10 }}>
                    {tr("Simpan PIN ini sekarang. Setelah panel ini hilang, PIN tidak dapat dilihat kembali.")}
                  </div>
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() =>
                      copyText(resetPinResult.activation_pin, tr("PIN baru"))
                    }
                  >
                    {tr("Salin PIN Baru")}
                  </button>
                </div>
              )}

              {resetPinError && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: "#fef2f2",
                    color: "#991b1b",
                  }}
                >
                  {tr(resetPinError)}
                </div>
              )}

              {deleteMessage && <p role="status" style={{ color: "#166534" }}>{deleteMessage}</p>}

              {copied && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "9px 11px",
                    borderRadius: 10,
                    background: "#f0fdf4",
                    color: "#166534",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {copied} {tr("berhasil disalin.")}
                </div>
              )}

              {loadError && (
                <div
                  style={{
                    padding: 12,
                    background: "#fef2f2",
                    color: "#991b1b",
                    borderRadius: 10,
                    marginBottom: 12,
                  }}
                >
                  {tr(loadError)}
                </div>
              )}

              {loadingCards ? (
                <p>{tr("Memuat inventory...")}</p>
              ) : cards.length === 0 ? (
                <div style={{ color: "#6b7280" }}>{tr("Belum ada inventory.")}</div>
              ) : filteredCards.length === 0 ? (
                <div style={{ color: "#6b7280" }}>
                  {tr("Tidak ada kartu yang cocok dengan filter.")}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {filteredCards.map((card) => (
                    <article
                      key={card.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 15,
                        background:
                          card.inventory_status === "ready_to_sell"
                            ? "#fffdf5"
                            : "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 17 }}>
                            {card.card_code}
                          </div>
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: 13,
                              marginTop: 3,
                            }}
                          >
                            {card.label || tr("Tanpa label")}
                            {card.internal_code ? ` · ${card.internal_code}` : ""}
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "5px 9px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            background:
                              card.inventory_status === "ready_to_sell"
                                ? "#fef3c7"
                                : card.inventory_status === "activated"
                                  ? "#dcfce7"
                                  : "#eff6ff",
                            color:
                              card.inventory_status === "ready_to_sell"
                                ? "#92400e"
                                : card.inventory_status === "activated"
                                  ? "#166534"
                                  : "#1d4ed8",
                          }}
                        >
                          {card.inventory_status === "ready_to_sell"
                            ? tr("Siap Dijual", "Ready to Sell")
                            : card.inventory_status === "activated"
                              ? tr("Sudah Diaktifkan", "Activated")
                              : card.inventory_status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 5,
                          marginTop: 12,
                          color: "#4b5563",
                          fontSize: 13,
                        }}
                      >
                        <div><strong>{tr("Area:")}</strong> {card.area || "-"}</div>
                        <div>
                          <strong>QR:</strong> {card.qr_enabled ? tr("Aktif", "Active") : tr("Nonaktif", "Inactive")}
                          {" · "}
                          <strong>NFC:</strong> {card.nfc_enabled ? tr("Aktif", "Active") : tr("Nonaktif", "Inactive")}
                        </div>
                        <div>
                          <strong>{tr("Pemilik:")}</strong> {card.business_name || tr("Belum ada", "None")}
                        </div>
                        <div style={{ overflowWrap: "anywhere" }}>
                          <strong>URL:</strong> {card.qr_url || "-"}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 12,
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            background: "#ffffff",
                            color: "#111827",
                            border: "1px solid #d1d5db",
                          }}
                          onClick={() => copyText(card.card_code, tr("Kode Kartu", "Card Code"))}
                        >
                          {tr("Salin Kode Kartu")}
                        </button>

                        {card.inventory_status === "ready_to_sell" && (
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              background: "#fff7ed",
                              color: "#9a3412",
                              border: "1px solid #fed7aa",
                            }}
                            disabled={resettingCardId === card.id}
                            onClick={() => resetActivationPin(card)}
                          >
                            {resettingCardId === card.id
                              ? tr("Resetting...")
                              : tr("Reset PIN")}
                          </button>
                        )}

                        {card.qr_url && (
                          <>
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                background: "#ffffff",
                                color: "#111827",
                                border: "1px solid #d1d5db",
                              }}
                              onClick={() => copyText(card.qr_url ?? undefined, "QR/NFC URL")}
                            >
                              {tr("Salin URL")}
                            </button>
                            <DownloadCardQr cardCode={card.card_code} url={card.qr_url} enabled={card.qr_enabled} />
                            <WriteCardNfc cardCode={card.card_code} url={card.qr_url} enabled={card.nfc_enabled} />
                            <a
                              href={card.qr_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                ...buttonStyle,
                                display: "inline-block",
                                textDecoration: "none",
                              }}
                            >
                              {tr("Uji Kartu")}
                            </a>
                          </>
                        )}
                        <DeleteProviderCard cardId={card.id} cardCode={card.card_code} onDeleted={cardDeleted} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

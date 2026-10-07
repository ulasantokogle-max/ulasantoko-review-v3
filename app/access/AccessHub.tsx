"use client";

import Link from "next/link";
import "./access.css";
import ProviderMfaGate from "../components/ProviderMfaGate";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function AccessHubPage() {
  return <ProviderMfaGate><AccessHubPageContent /></ProviderMfaGate>;
}

function AccessHubPageContent() {
  const { tr } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [cardCode, setCardCode] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setSignedIn(false);
        setAllowed(false);
        setChecking(false);
        return;
      }

      setSignedIn(true);

      const { data, error } = await supabase.rpc("v3_is_provider_admin");

      if (!active) return;

      if (error) {
        console.error("Access Hub provider check failed", error);
        setAllowed(false);
      } else {
        setAllowed(Boolean(data));
      }

      setChecking(false);
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, []);

  const normalizedCardCode = cardCode.trim().toUpperCase();
  const cardReady = normalizedCardCode.length > 0;

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 10px 30px rgba(15,23,42,.05)",
  } as const;

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    background: "#111827",
    color: "#ffffff",
  } as const;

  if (checking) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        {tr("Memeriksa akses...")}
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", padding: 20, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        <section style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: .7, color: "#6b7280" }}>YUKREVIEW INTERNAL</div>
          <h1 style={{ marginBottom: 8 }}>{tr("Menu Akses")}</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            {tr("Halaman ini khusus tim Provider. Masuk melalui Provider Portal terlebih dahulu.")}
          </p>
          <Link href="/provider/cards" style={buttonStyle}>{tr("Buka Provider Portal")}</Link>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", padding: 20, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        <section style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: .7, color: "#6b7280" }}>YUKREVIEW INTERNAL</div>
          <h1 style={{ marginBottom: 8 }}>{tr("Akses Terbatas")}</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            {tr("Akun ini tidak memiliki izin untuk membuka Menu Akses Provider.")}
          </p>
          <Link href="/dashboard" style={buttonStyle}>{tr("Kembali ke Dashboard")}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="access-page" style={{ minHeight: "100vh", background: "#f5f7fb", padding: "30px 16px 48px", fontFamily: "Inter, ui-sans-serif, system-ui", color: "#111827" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header className="access-header" style={{ marginBottom: 22 }}>
          <div className="access-toolbar" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <Link href="/provider/cards">{tr("Pusat Kartu", "Card Center")}</Link>
            <Link href="/provider/security">{tr("Keamanan 2FA", "2FA Security")}</Link>
            <LanguageSwitcher />
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: .8, color: "#6b7280" }}>YUKREVIEW INTERNAL</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 32 }}>{tr("Menu Akses Sistem")}</h1>
          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
            {tr("Akses cepat untuk pengecekan alur Provider → Pemilik Bisnis → Pengunjung.")}
          </p>
        </header>

        <section className="access-card-input" style={{ ...cardStyle, marginBottom: 16 }}>
          <label htmlFor="access-card-code" style={{ display: "block", fontWeight: 900, marginBottom: 8 }}>{tr("Kode Kartu untuk pengujian")}</label>
          <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 14 }}>
            {tr("Masukkan Kode Kartu yang ingin diuji. Menu Pengunjung dan Aktivasi akan menggunakan kode ini.")}
          </p>
          <input
            id="access-card-code"
            maxLength={80}
            value={cardCode}
            onChange={(event) => setCardCode(event.target.value.toUpperCase())}
            placeholder={tr("Contoh: ULAS-00136")}
            style={{
              width: "100%",
              maxWidth: 360,
              boxSizing: "border-box",
              padding: "12px 13px",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              fontSize: 15,
              textTransform: "uppercase",
            }}
          />
        </section>

        <div className="access-menu-grid">
          <section className="access-tile" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 1</div>
            <h2 style={{ margin: "6px 0 8px" }}>Provider</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              {tr("Produksi kartu, Kode Kartu, PIN aktivasi, inventori, reset PIN, dan status aktivasi.")}
            </p>
            <Link href="/provider/cards" style={buttonStyle}>{tr("Buka Provider Portal")}</Link>
          </section>

          <section className="access-tile" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 2</div>
            <h2 style={{ margin: "6px 0 8px" }}>{tr("Pemilik Bisnis")}</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              {tr("Dashboard bisnis untuk kartu, halaman publik, Google Review, masukan, dan analitik.")}
            </p>
            <div className="access-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/dashboard" style={buttonStyle}>{tr("Dashboard")}</Link>
              <Link href="/dashboard/landing-page" style={{ ...buttonStyle, background: "#ffffff", color: "#111827", border: "1px solid #d1d5db" }}>{tr("Pengeditan Halaman")}</Link>
            </div>
          </section>

          <section className="access-tile" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 3</div>
            <h2 style={{ margin: "6px 0 8px" }}>{tr("Aktivasi Pemilik")}</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              {tr("Simulasi pemilik bisnis yang baru membeli kartu dan akan menghubungkannya ke bisnis.")}
            </p>
            {cardReady ? (
              <Link href={"/activate/" + encodeURIComponent(normalizedCardCode)} style={buttonStyle}>{tr("Buka Aktivasi")}</Link>
            ) : (
              <div className="access-empty" style={{ color: "#9ca3af", fontSize: 14, fontWeight: 700 }}>{tr("Masukkan Kode Kartu terlebih dahulu.")}</div>
            )}
          </section>

          <section className="access-tile" style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 4</div>
            <h2 style={{ margin: "6px 0 8px" }}>{tr("Pengunjung")}</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              {tr("Tampilan yang dibuka pengunjung setelah scan QR atau tap NFC pada kartu aktif.")}
            </p>
            {cardReady ? (
              <div className="access-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={"/" + encodeURIComponent(normalizedCardCode)} style={buttonStyle}>{tr("Halaman Publik")}</Link>
                <Link href={"/" + encodeURIComponent(normalizedCardCode) + "/menu"} style={{ ...buttonStyle, background: "#ffffff", color: "#111827", border: "1px solid #d1d5db" }}>{tr("Informasi / PDF")}</Link>
              </div>
            ) : (
              <div className="access-empty" style={{ color: "#9ca3af", fontSize: 14, fontWeight: 700 }}>{tr("Masukkan Kode Kartu terlebih dahulu.")}</div>
            )}
          </section>
        </div>

        <section className="access-checklist" style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>{tr("Urutan Uji End-to-End")}</h2>
          <ol>
            <li>{tr("Buat kartu di Provider Portal.", "Create a card in the Provider Portal.")}</li>
            <li>{tr("Aktifkan kartu dengan akun pemilik dan PIN aktivasi.", "Activate the card with the owner's account and activation PIN.")}</li>
            <li>{tr("Atur halaman bisnis, Google Review, dan kontak.", "Set up the business page, Google Review, and contact details.")}</li>
            <li>{tr("Coba scan QR atau tap NFC sebagai pengunjung.", "Try scanning the QR or tapping NFC as a visitor.")}</li>
            <li>{tr("Periksa alur rating dan masukan pada dashboard bisnis.", "Check the rating and feedback flow in the business dashboard.")}</li>
          </ol>
        </section>

        <div style={{ marginTop: 18, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          {tr("Menu internal Provider · tidak ditampilkan pada navigasi pemilik bisnis atau halaman publik.")}
        </div>
      </div>
    </main>
  );
}

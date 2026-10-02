"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AccessHubPage() {
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
        Memeriksa akses...
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", padding: 20, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        <section style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: .7, color: "#6b7280" }}>REPUTASIPRO INTERNAL</div>
          <h1 style={{ marginBottom: 8 }}>Menu Akses</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Halaman ini khusus tim Provider. Masuk melalui Provider Portal terlebih dahulu.
          </p>
          <Link href="/provider/cards" style={buttonStyle}>Buka Provider Portal</Link>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", padding: 20, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        <section style={{ ...cardStyle, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: .7, color: "#6b7280" }}>REPUTASIPRO INTERNAL</div>
          <h1 style={{ marginBottom: 8 }}>Akses Terbatas</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Akun ini tidak memiliki izin untuk membuka Menu Akses Provider.
          </p>
          <Link href="/dashboard" style={buttonStyle}>Kembali ke Dashboard</Link>
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "30px 16px 48px", fontFamily: "Inter, ui-sans-serif, system-ui", color: "#111827" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: .8, color: "#6b7280" }}>REPUTASIPRO INTERNAL</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 32 }}>Menu Akses Sistem</h1>
          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
            Akses cepat untuk pengecekan alur Provider → Pemilik Bisnis → Pengunjung.
          </p>
        </header>

        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Kode Kartu untuk pengujian</div>
          <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 14 }}>
            Masukkan Kode Kartu yang ingin diuji. Menu Pengunjung dan Aktivasi akan menggunakan kode ini.
          </p>
          <input
            value={cardCode}
            onChange={(event) => setCardCode(event.target.value.toUpperCase())}
            placeholder="Contoh: ULAS-00136"
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          <section style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 1</div>
            <h2 style={{ margin: "6px 0 8px" }}>Provider</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              Produksi kartu, Kode Kartu, PIN aktivasi, inventori, reset PIN, dan status aktivasi.
            </p>
            <Link href="/provider/cards" style={buttonStyle}>Buka Provider Portal</Link>
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 2</div>
            <h2 style={{ margin: "6px 0 8px" }}>Pemilik Bisnis</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              Dashboard bisnis untuk kartu, halaman publik, Google Review, masukan, dan analitik.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/dashboard" style={buttonStyle}>Dashboard</Link>
              <Link href="/dashboard/landing-page" style={{ ...buttonStyle, background: "#ffffff", color: "#111827", border: "1px solid #d1d5db" }}>Pengeditan Halaman</Link>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 3</div>
            <h2 style={{ margin: "6px 0 8px" }}>Aktivasi Pemilik</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              Simulasi pemilik bisnis yang baru membeli kartu dan akan menghubungkannya ke bisnis.
            </p>
            {cardReady ? (
              <Link href={"/activate/" + encodeURIComponent(normalizedCardCode)} style={buttonStyle}>Buka Aktivasi</Link>
            ) : (
              <div style={{ color: "#9ca3af", fontSize: 14, fontWeight: 700 }}>Masukkan Kode Kartu terlebih dahulu.</div>
            )}
          </section>

          <section style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>LEVEL 4</div>
            <h2 style={{ margin: "6px 0 8px" }}>Pengunjung</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.55, minHeight: 66 }}>
              Tampilan yang dibuka pengunjung setelah scan QR atau tap NFC pada kartu aktif.
            </p>
            {cardReady ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={"/" + encodeURIComponent(normalizedCardCode)} style={buttonStyle}>Halaman Publik</Link>
                <Link href={"/" + encodeURIComponent(normalizedCardCode) + "/menu"} style={{ ...buttonStyle, background: "#ffffff", color: "#111827", border: "1px solid #d1d5db" }}>Informasi / PDF</Link>
              </div>
            ) : (
              <div style={{ color: "#9ca3af", fontSize: 14, fontWeight: 700 }}>Masukkan Kode Kartu terlebih dahulu.</div>
            )}
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 14 }}>
          <h2 style={{ marginTop: 0 }}>Urutan Uji End-to-End</h2>
          <div style={{ color: "#4b5563", lineHeight: 1.8, fontSize: 14 }}>
            <strong>1.</strong> Provider membuat kartu → <strong>2.</strong> pemilik bisnis membuka aktivasi dan memasukkan PIN → <strong>3.</strong> pemilik bisnis mengatur halaman → <strong>4.</strong> pengunjung scan QR/NFC → <strong>5.</strong> rating 4–5 ke Google Review, rating 1–3 masuk Masukan.
          </div>
        </section>

        <div style={{ marginTop: 18, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          Menu internal Provider · tidak ditampilkan pada navigasi pemilik bisnis atau halaman publik.
        </div>
      </div>
    </main>
  );
}

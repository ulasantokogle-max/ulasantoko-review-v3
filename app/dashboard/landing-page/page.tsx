"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";

const themes = {
  warm_brown: { label: "Warm Brown", bg: "#FFF8F1", card: "#FFFFFF", primary: "#8B5E3C", secondary: "#B9825A", soft: "#F2E5D8", text: "#4B3428", muted: "#7A6659" },
  soft_tosca: { label: "Soft Tosca", bg: "#F0FBF9", card: "#FFFFFF", primary: "#2A9D8F", secondary: "#67C9BD", soft: "#DDF4F0", text: "#173E39", muted: "#5F7C78" },
  elegant_cream: { label: "Elegant Cream", bg: "#FBF7EF", card: "#FFFDF8", primary: "#9A7B4F", secondary: "#C9B184", soft: "#EFE5D2", text: "#4D4337", muted: "#7D7366" },
  minimal_dark: { label: "Minimal Dark", bg: "#161616", card: "#202020", primary: "#E6C59A", secondary: "#BFA17B", soft: "#2B2B2B", text: "#FAF7F2", muted: "#C9C1B8" }
} as const;

type ThemeKey = keyof typeof themes;
type ToggleKey = "show_google_review" | "show_whatsapp" | "show_about" | "show_promo" | "show_instagram" | "show_pdf";

type Settings = {
  theme_key: ThemeKey;
  hero_title: string;
  hero_description: string;
  about_text: string;
  promo_text: string;
  logo_url: string;
  cover_url: string;
  cover_position: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  instagram_url: string;
  pdf_title: string;
  pdf_url: string;
  show_google_review: boolean;
  show_whatsapp: boolean;
  show_about: boolean;
  show_promo: boolean;
  show_instagram: boolean;
  show_pdf: boolean;
};

export default function LandingPageBuilderPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    theme_key: "warm_brown",
    hero_title: "",
    hero_description: "",
    about_text: "",
    promo_text: "",
    logo_url: "",
    cover_url: "",
    cover_position: "center",
    instagram_url: "",
    pdf_title: "Menu & Daftar Harga",
    pdf_url: "",
    show_google_review: true,
    show_whatsapp: true,
    show_about: true,
    show_promo: true,
    show_instagram: true,
    show_pdf: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const { businesses, businessId, setBusinessId, businessLoading, businessError } =
    useBusinessContext(userEmail);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (businessId) loadSettings();
  }, [businessId]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    setLoadingLogin(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoadingLogin(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }

  async function loadSettings() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.rpc("v3_get_landing_page_settings", { p_business_id: businessId });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSettings({
      theme_key: (data?.theme_key ?? "warm_brown") as ThemeKey,
      hero_title: data?.hero_title ?? "",
      hero_description: data?.hero_description ?? "",
      about_text: data?.about_text ?? "",
      promo_text: data?.promo_text ?? "",
      logo_url: data?.logo_url ?? "",
      cover_url: data?.cover_url ?? "",
      cover_position: data?.cover_position ?? "center",
      instagram_url: data?.instagram_url ?? "",
      pdf_title: data?.pdf_title ?? "Menu & Daftar Harga",
      pdf_url: data?.pdf_url ?? "",
      show_google_review: data?.show_google_review ?? true,
      show_whatsapp: data?.show_whatsapp ?? true,
      show_about: data?.show_about ?? true,
      show_promo: data?.show_promo ?? true,
      show_instagram: data?.show_instagram ?? true,
      show_pdf: data?.show_pdf ?? true
    });
  }

  async function uploadMedia(file: File, kind: "logo" | "cover") {
    if (!userEmail) return;

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setError("File harus berupa gambar.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }

    const setUploading = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    setError("");
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;

    if (!uid) {
      setUploading(false);
      setError("Sesi login tidak ditemukan.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = uid + "/" + kind + "-" + Date.now() + "." + safeExt;

    const { error: uploadError } = await supabase.storage
      .from("landing-media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("landing-media")
      .getPublicUrl(path);

    if (kind === "logo") {
      setSettings((s) => ({ ...s, logo_url: publicData.publicUrl }));
    } else {
      setSettings((s) => ({ ...s, cover_url: publicData.publicUrl }));
    }

    setUploading(false);
    setMessage((kind === "logo" ? "Logo" : "Cover") + " berhasil diupload. Klik Simpan Landing Page untuk menyimpan perubahan.");
  }

  async function uploadPdf(file: File) {
    if (!userEmail) return;

    if (file.type !== "application/pdf") {
      setError("File harus berupa PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran PDF maksimal 10 MB.");
      return;
    }

    setUploadingPdf(true);
    setError("");
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;

    if (!uid) {
      setUploadingPdf(false);
      setError("Sesi login tidak ditemukan.");
      return;
    }

    const path = uid + "/pdf/menu-" + Date.now() + ".pdf";

    const { error: uploadError } = await supabase.storage
      .from("landing-media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf"
      });

    if (uploadError) {
      setUploadingPdf(false);
      setError(uploadError.message);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("landing-media")
      .getPublicUrl(path);

    setSettings((s) => ({
      ...s,
      pdf_url: publicData.publicUrl,
      pdf_title: s.pdf_title || file.name.replace(/\.pdf$/i, "")
    }));

    setUploadingPdf(false);
    setMessage("PDF berhasil diupload. Klik Simpan Landing Page untuk menyimpan perubahan.");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.rpc("v3_update_landing_page_settings", {
      p_business_id: businessId,
      p_theme_key: settings.theme_key,
      p_hero_title: settings.hero_title,
      p_hero_description: settings.hero_description,
      p_about_text: settings.about_text,
      p_promo_text: settings.promo_text,
      p_logo_url: settings.logo_url,
      p_cover_url: settings.cover_url,
      p_cover_position: settings.cover_position,
      p_instagram_url: settings.instagram_url,
      p_pdf_title: settings.pdf_title,
      p_pdf_url: settings.pdf_url,
      p_show_google_review: settings.show_google_review,
      p_show_whatsapp: settings.show_whatsapp,
      p_show_about: settings.show_about,
      p_show_promo: settings.show_promo,
      p_show_instagram: settings.show_instagram,
      p_show_pdf: settings.show_pdf
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data?.success === false) {
      setError(data?.message ?? "Gagal menyimpan landing page.");
      return;
    }
    setMessage("Landing page berhasil disimpan.");
  }

  const theme = themes[settings.theme_key] ?? themes.warm_brown;
  const selectedBusiness = businesses.find((b) => b.business_id === businessId);
  const businessName = selectedBusiness?.display_name || selectedBusiness?.business_name || "Nama Bisnis";

  const toggles: Array<[ToggleKey, string]> = [
    ["show_google_review", "Tampilkan Google Review"],
    ["show_whatsapp", "Tampilkan WhatsApp"],
    ["show_about", "Tampilkan Tentang Bisnis"],
    ["show_promo", "Tampilkan Promo"],
    ["show_instagram", "Tampilkan Instagram"],
    ["show_pdf", "Tampilkan Menu PDF"]
  ];

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
    background: "#fff"
  };

  if (!authChecked) {
    return (
      <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 20px", color: "#111827" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>ULASANTOKO REVIEW V3</div>
          <h1 style={{ marginBottom: 8 }}>Landing Page Builder</h1>
          <p style={{ color: "#6b7280" }}>Memeriksa sesi login...</p>
        </div>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 20px", color: "#111827" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>ULASANTOKO REVIEW V3</div>
          <h1 style={{ margin: "6px 0 8px" }}>Landing Page Builder</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            Login customer untuk mengatur landing page bisnis.
          </p>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14 }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14 }}
            />
            <button
              type="submit"
              disabled={loadingLogin}
              style={{ border: 0, borderRadius: 10, padding: "11px 12px", background: "#8B5E3C", color: "#fff", fontWeight: 900, cursor: "pointer" }}
            >
              {loadingLogin ? "Login..." : "Login"}
            </button>
          </form>
          {loginError && <div style={{ marginTop: 12, color: "#991b1b" }}>{loginError}</div>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 20px", color: "#111827" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>ULASANTOKO REVIEW V3</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 30 }}>Landing Page Builder</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>Atur halaman publik bisnis dengan preset yang simpel, premium, dan mudah digunakan.</p>
        </div>

        {businesses.length > 1 && (
          <select value={businessId ?? ""} onChange={(e) => setBusinessId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
            {businesses.map((business) => (
              <option key={business.business_id} value={business.business_id}>
                {business.display_name || business.business_name}
              </option>
            ))}
          </select>
        )}

        {(businessLoading || businessError) && (
          <div style={{ marginBottom: 14, color: businessError ? "#991b1b" : "#6b7280" }}>
            {businessError || "Memuat bisnis..."}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
          <form onSubmit={saveSettings} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, display: "grid", gap: 18 }}>
            <section>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Pilih Tema</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {(Object.keys(themes) as ThemeKey[]).map((key) => {
                  const item = themes[key];
                  const active = settings.theme_key === key;
                  return (
                    <button key={key} type="button" onClick={() => setSettings((s) => ({ ...s, theme_key: key }))}
                      style={{ textAlign: "left", padding: 12, borderRadius: 12, border: active ? "2px solid " + item.primary : "1px solid #e5e7eb", background: item.bg, color: item.text, cursor: "pointer" }}>
                      <div style={{ height: 34, borderRadius: 8, background: "linear-gradient(135deg, " + item.primary + ", " + item.secondary + ")", marginBottom: 9 }} />
                      <strong>{item.label}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <section style={{ display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Konten Utama</h2>
              <input style={inputStyle} placeholder="Judul utama" value={settings.hero_title} onChange={(e) => setSettings((s) => ({ ...s, hero_title: e.target.value }))} maxLength={120} />
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Deskripsi singkat" value={settings.hero_description} onChange={(e) => setSettings((s) => ({ ...s, hero_description: e.target.value }))} maxLength={300} />
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} placeholder="Tentang bisnis" value={settings.about_text} onChange={(e) => setSettings((s) => ({ ...s, about_text: e.target.value }))} maxLength={700} />
              <input style={inputStyle} placeholder="Promo singkat" value={settings.promo_text} onChange={(e) => setSettings((s) => ({ ...s, promo_text: e.target.value }))} maxLength={180} />
            </section>

            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Logo & Cover</h2>
                <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12, lineHeight: 1.5 }}>
                  Supaya hasil paling rapi: logo 1:1 dan cover sekitar 16:7.
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>Logo Bisnis</label>
                <label style={{ display: "grid", placeItems: "center", minHeight: 92, borderRadius: 12, border: "1px dashed #c9b8a7", background: "#fff", cursor: "pointer", color: "#6b5849", fontSize: 13, fontWeight: 800, textAlign: "center", padding: 12 }}>
                  {uploadingLogo ? "Mengupload logo..." : settings.logo_url ? "Ganti Logo" : "Upload Logo"}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b7a6d", marginTop: 4 }}>PNG / JPG / WebP · maks. 5 MB</span>
                  <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMedia(file, "logo");
                    e.currentTarget.value = "";
                  }}
                />
                </label>
                <input
                  style={inputStyle}
                  placeholder="Atau paste Logo URL (HTTPS)"
                  value={settings.logo_url}
                  onChange={(e) => setSettings((s) => ({ ...s, logo_url: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 2, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>Cover Landing Page</label>
                <label style={{ display: "grid", placeItems: "center", minHeight: 92, borderRadius: 12, border: "1px dashed #c9b8a7", background: "#fff", cursor: "pointer", color: "#6b5849", fontSize: 13, fontWeight: 800, textAlign: "center", padding: 12 }}>
                  {uploadingCover ? "Mengupload cover..." : settings.cover_url ? "Ganti Cover" : "Upload Cover"}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b7a6d", marginTop: 4 }}>Rekomendasi rasio 16:7 · maks. 5 MB</span>
                  <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMedia(file, "cover");
                    e.currentTarget.value = "";
                  }}
                />
                </label>
                <input
                  style={inputStyle}
                  placeholder="Atau paste Cover URL (HTTPS)"
                  value={settings.cover_url}
                  onChange={(e) => setSettings((s) => ({ ...s, cover_url: e.target.value }))}
                />

                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8, color: "#6b5849" }}>
                    Posisi Cover
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                    {[
                      ["top-left", "↖"], ["top", "↑"], ["top-right", "↗"],
                      ["left", "←"], ["center", "●"], ["right", "→"],
                      ["bottom-left", "↙"], ["bottom", "↓"], ["bottom-right", "↘"]
                    ].map(([value, icon]) => {
                      const active = settings.cover_position === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={"Posisi cover " + value}
                          title={value}
                          onClick={() =>
                            setSettings((s) => ({
                              ...s,
                              cover_position: value as Settings["cover_position"]
                            }))
                          }
                          style={{
                            borderRadius: 10,
                            padding: "9px 6px",
                            border: active ? "2px solid #8B5E3C" : "1px solid #d8c9bb",
                            background: active ? "#F2E5D8" : "#fff",
                            color: active ? "#4B3428" : "#7A6659",
                            fontWeight: 900,
                            cursor: "pointer"
                          }}
                        >
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 11, color: "#8b7a6d" }}>
                    Pilih fokus cover: atas, tengah, bawah, kiri, kanan, atau sudut.
                  </div>
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Quick Menu</h2>
                <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12 }}>
                  Tambahkan Instagram dan PDF menu/katalog langsung di landing page.
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>Instagram</label>
                <input
                  style={inputStyle}
                  placeholder="https://instagram.com/username"
                  value={settings.instagram_url}
                  onChange={(e) => setSettings((s) => ({ ...s, instagram_url: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>Menu / Katalog PDF</label>
                <input
                  style={inputStyle}
                  placeholder="Judul PDF, contoh: Menu & Daftar Harga"
                  value={settings.pdf_title}
                  onChange={(e) => setSettings((s) => ({ ...s, pdf_title: e.target.value }))}
                  maxLength={80}
                />
                <label style={{ display: "grid", placeItems: "center", minHeight: 82, borderRadius: 12, border: "1px dashed #c9b8a7", background: "#fff", cursor: "pointer", color: "#6b5849", fontSize: 13, fontWeight: 800, textAlign: "center", padding: 12 }}>
                  {uploadingPdf ? "Mengupload PDF..." : settings.pdf_url ? "Ganti PDF" : "Upload PDF"}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b7a6d", marginTop: 4 }}>PDF · maksimal 10 MB</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPdf(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <input
                  style={inputStyle}
                  placeholder="Atau paste PDF URL (HTTPS)"
                  value={settings.pdf_url}
                  onChange={(e) => setSettings((s) => ({ ...s, pdf_url: e.target.value }))}
                />
              </div>
            </section>

            <section style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Tampilkan Section</h2>
              {toggles.map(([key, label]) => (
                <label key={key} style={{ display: "flex", gap: 9, alignItems: "center", padding: "9px 0" }}>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </section>

            {error && <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b" }}>{error}</div>}
            {message && <div style={{ padding: 12, borderRadius: 10, background: "#f0fdf4", color: "#166534" }}>{message}</div>}

            <button type="submit" disabled={saving || loading || !businessId}
              style={{ border: 0, borderRadius: 12, padding: "13px 16px", background: "#111827", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
              {saving ? "Menyimpan..." : "Simpan Landing Page"}
            </button>
          </form>

          <aside style={{ position: "sticky", top: 20, background: theme.bg, borderRadius: 26, padding: 14, border: "1px solid #e5e7eb", boxShadow: "0 18px 45px rgba(15,23,42,.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted, marginBottom: 8 }}>LIVE PREVIEW</div>
            <div style={{ borderRadius: 24, overflow: "hidden", background: theme.card, color: theme.text, boxShadow: "0 20px 52px rgba(0,0,0,.09)" }}>
              <div
                style={{
                  aspectRatio: "16 / 7",
                  minHeight: 120,
                  backgroundImage: settings.cover_url
                    ? "url(" + settings.cover_url + ")"
                    : "linear-gradient(135deg, " + theme.primary + ", " + theme.secondary + ")",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition:
                    settings.cover_position === "top-left" ? "left top" :
                    settings.cover_position === "top-right" ? "right top" :
                    settings.cover_position === "bottom-left" ? "left bottom" :
                    settings.cover_position === "bottom-right" ? "right bottom" :
                    settings.cover_position
                }}
              />
              <div style={{ padding: 20 }}>
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 20, marginTop: -54, border: "4px solid " + theme.card, background: theme.card, boxShadow: "0 10px 26px rgba(0,0,0,.12)" }} />
                ) : (
                  <div style={{ width: 76, height: 76, borderRadius: 20, marginTop: -54, border: "4px solid " + theme.card, background: theme.soft, display: "grid", placeItems: "center", fontWeight: 900, color: theme.primary, boxShadow: "0 10px 26px rgba(0,0,0,.08)" }}>
                    {businessName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <h2 style={{ margin: "12px 0 6px", fontSize: 26 }}>{settings.hero_title || businessName}</h2>
                <p style={{ color: theme.muted, lineHeight: 1.6, marginTop: 0 }}>{settings.hero_description || "Bagikan pengalaman Anda dan bantu bisnis ini berkembang."}</p>

                {settings.show_promo && settings.promo_text && (
                  <div style={{ margin: "14px 0", padding: 12, borderRadius: 12, background: theme.soft, color: theme.text, fontWeight: 800 }}>✦ {settings.promo_text}</div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9, marginTop: 16 }}>
                  {settings.show_google_review && <div style={{ padding: "12px 10px", borderRadius: 14, background: "linear-gradient(135deg, " + theme.primary + ", " + theme.secondary + ")", color: "#fff", textAlign: "center", fontWeight: 900, boxShadow: "0 8px 18px rgba(0,0,0,.08)" }}>★ Beri Ulasan</div>}
                  {settings.show_whatsapp && <div style={{ padding: "12px 10px", borderRadius: 14, background: theme.soft, color: theme.text, textAlign: "center", fontWeight: 900, border: "1px solid rgba(0,0,0,.05)" }}>◉ WhatsApp</div>}
                  {settings.show_instagram && settings.instagram_url && <div style={{ padding: "12px 10px", borderRadius: 14, background: theme.soft, color: theme.text, textAlign: "center", fontWeight: 900, border: "1px solid rgba(0,0,0,.05)" }}>◎ Instagram</div>}
                  {settings.show_pdf && settings.pdf_url && <div style={{ padding: "12px 10px", borderRadius: 14, background: theme.soft, color: theme.text, textAlign: "center", fontWeight: 900, border: "1px solid rgba(0,0,0,.05)" }}>▤ {settings.pdf_title || "Menu PDF"}</div>}
                </div>

                {settings.show_about && settings.about_text && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Tentang Kami</div>
                    <div style={{ color: theme.muted, lineHeight: 1.55, fontSize: 14 }}>{settings.about_text}</div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

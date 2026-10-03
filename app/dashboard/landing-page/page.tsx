"use client";

import "../../components/public-landing.css";
import BusinessTitle from "../../components/BusinessTitle";
import type { CSSProperties } from "react";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";
import { useLanguage } from "../../../lib/i18n";

const themes = {
  warm_brown: { label: "Warm Brown", bg: "#FFF8F1", card: "#FFFFFF", primary: "#8B5E3C", secondary: "#B9825A", soft: "#F2E5D8", text: "#4B3428", muted: "#7A6659" },
  soft_smoothie: { label: "Soft Smoothie", bg: "#FBF5EC", card: "#FFFDFC", primary: "#9B6A43", secondary: "#D7B08A", soft: "#F4E7D7", text: "#4A3023", muted: "#8A7567" },
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
  const { tr } = useLanguage();
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
    pdf_title: tr("Informasi", "Information"),
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
  const [whatsapp, setWhatsapp] = useState("");
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [mapsUrl, setMapsUrl] = useState("");
  const [loadingGoogleReview, setLoadingGoogleReview] = useState(false);
  const [displayName, setDisplayName] = useState("");

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
      console.error("Page editor login failed", error);
      setLoginError("Email atau password tidak sesuai.");
      return;
    }

    setUserEmail(data.user?.email ?? null);
    setPassword("");
  }

  async function loadSettings() {
    setLoading(true);
    setLoadingWhatsapp(true);
    setError("");

    const [
      { data, error },
      { data: contactData, error: contactError },
      { data: profileData, error: profileError }
    ] = await Promise.all([
      supabase.rpc("v3_get_landing_page_settings", { p_business_id: businessId }),
      supabase.rpc("v3_get_business_contact_settings", { p_business_id: businessId }),
      supabase.rpc("v3_get_business_profile", { p_business_id: businessId })
    ]);

    setLoading(false);
    setLoadingWhatsapp(false);

    if (error) {
      console.error("Landing settings load failed", error);
      setError("Pengaturan halaman publik belum dapat dimuat. Silakan coba lagi.");
      return;
    }

    if (contactError) {
      console.error("Business contact load failed", contactError);
      setError("Kontak bisnis belum dapat dimuat. Silakan coba lagi.");
      return;
    }

    if (profileError) {
      console.error("Business profile load failed", profileError);
      setError("Profil bisnis belum dapat dimuat. Silakan coba lagi.");
      return;
    }

    if (profileData?.success === false) {
      console.error("Business profile returned unsuccessful result", profileData);
      setError("Profil bisnis belum dapat dimuat. Silakan coba lagi.");
      return;
    }

    setDisplayName(profileData?.display_name ?? profileData?.internal_name ?? "");
    setWhatsapp(contactData?.whatsapp_number ?? "");
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
      pdf_title: data?.pdf_title ?? tr("Informasi", "Information"),
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

    const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
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
      setError("Sesi tidak ditemukan. Silakan masuk kembali.");
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
      console.error("Landing image upload failed", uploadError);
      setUploading(false);
      setError("Upload gambar belum berhasil. Silakan coba lagi.");
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
    setMessage((kind === "logo" ? "Logo" : tr("Cover")) + tr(" berhasil diupload. Klik Simpan Perubahan untuk menyimpan perubahan."));
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
      setError("Sesi tidak ditemukan. Silakan masuk kembali.");
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
      console.error("Landing PDF upload failed", uploadError);
      setUploadingPdf(false);
      setError("Unggah PDF belum berhasil. Silakan coba lagi.");
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
    setMessage("PDF berhasil diunggah. Klik Simpan Perubahan untuk menyimpan perubahan.");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (!displayName.trim()) {
      setSaving(false);
      setError("Nama Bisnis Publik wajib diisi.");
      return;
    }

    const { data: nameData, error: nameError } = await supabase.rpc(
      "v3_update_business_display_name",
      {
        p_business_id: businessId,
        p_display_name: displayName.trim()
      }
    );

    if (nameError) {
      console.error("Public business name update failed", nameError);
      setSaving(false);
      setError("Nama Bisnis Publik belum dapat disimpan. Silakan coba lagi.");
      return;
    }

    if (nameData?.success === false) {
      console.error("Public business name update returned unsuccessful result", nameData);
      setSaving(false);
      setError("Nama Bisnis Publik belum dapat disimpan. Silakan coba lagi.");
      return;
    }

    setDisplayName(nameData?.display_name ?? displayName.trim());

    if (mapsUrl.trim()) {
      setLoadingGoogleReview(true);

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setLoadingGoogleReview(false);
        setSaving(false);
        setError("Sesi tidak ditemukan. Silakan masuk kembali.");
        return;
      }

      try {
        const response = await fetch("/api/google-review/setup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            business_id: businessId,
            maps_url: mapsUrl.trim()
          })
        });

        const googleData = await response.json();

        if (!response.ok || !googleData?.success) {
          console.error("Google Review setup failed", {
            status: response.status,
            data: googleData
          });
          setLoadingGoogleReview(false);
          setSaving(false);

          if (response.status === 401) {
            setError("Sesi sudah berakhir. Silakan masuk kembali.");
          } else if (response.status === 429) {
            setError("Terlalu banyak percobaan. Silakan tunggu beberapa saat lalu coba lagi.");
          } else if (googleData?.step === "resolve") {
            setError("Link Google Maps belum dapat diproses. Pastikan link benar lalu coba lagi.");
          } else {
            setError("Google Review belum dapat disimpan. Silakan coba lagi.");
          }
          return;
        }

        setMapsUrl(googleData?.maps_url ?? mapsUrl.trim());
      } catch (googleError) {
        console.error("Google Review request failed", googleError);
        setLoadingGoogleReview(false);
        setSaving(false);
        setError("Google Review belum dapat diproses. Periksa koneksi lalu coba lagi.");
        return;
      }

      setLoadingGoogleReview(false);
    }

    const { data: contactData, error: contactError } = await supabase.rpc(
      "v3_update_business_contact_settings",
      {
        p_business_id: businessId,
        p_whatsapp_number: whatsapp
      }
    );

    if (contactError) {
      console.error("Business contact update failed", contactError);
      setSaving(false);
      setError("Nomor WhatsApp belum dapat disimpan. Silakan coba lagi.");
      return;
    }

    if (contactData?.success === false) {
      console.error("Business contact update returned unsuccessful result", contactData);
      setSaving(false);
      setError("Nomor WhatsApp belum dapat disimpan. Silakan coba lagi.");
      return;
    }

    setWhatsapp(contactData?.whatsapp_number ?? whatsapp);

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
      console.error("Landing page update failed", error);
      setError("Landing page belum dapat disimpan. Silakan coba lagi.");
      return;
    }
    if (data?.success === false) {
      console.error("Landing page update returned unsuccessful result", data);
      setError("Landing page belum dapat disimpan. Silakan coba lagi.");
      return;
    }
    setMessage("Landing page berhasil disimpan.");
  }

  const theme = themes[settings.theme_key] ?? themes.warm_brown;
  const isSmoothie = settings.theme_key === "soft_smoothie";
  const selectedBusiness = businesses.find((b) => b.business_id === businessId);
  const businessName =
    displayName ||
    selectedBusiness?.display_name ||
    selectedBusiness?.business_name ||
    tr("Nama Bisnis");

  const toggles: Array<[ToggleKey, string]> = [
    ["show_google_review", tr("Tampilkan Google Review", "Show Google Review")],
    ["show_whatsapp", tr("Tampilkan WhatsApp")],
    ["show_about", tr("Tampilkan Tentang Bisnis")],
    ["show_promo", tr("Tampilkan Promo")],
    ["show_instagram", tr("Tampilkan Instagram")],
    ["show_pdf", tr("Tampilkan File PDF", "Show PDF File")]
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
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>REPUTASIPRO</div>
          <h1 style={{ marginBottom: 8 }}>{tr("Pengeditan Halaman")}</h1>
          <p style={{ color: "#6b7280" }}>{tr("Memeriksa sesi...")}</p>
        </div>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 20px", color: "#111827" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>REPUTASIPRO</div>
          <h1 style={{ margin: "6px 0 8px" }}>{tr("Pengeditan Halaman")}</h1>
          <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
            {tr("Masuk untuk mengatur halaman bisnis Anda.")}
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
              placeholder={tr("Password")}
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
              {loadingLogin ? tr("Masuk...") : tr("Masuk")}
            </button>
          </form>
          {loginError && <div style={{ marginTop: 12, color: "#991b1b" }}>{tr(loginError)}</div>}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 20px", color: "#111827" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>REPUTASIPRO</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 30 }}>{tr("Pengeditan Halaman")}</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>{tr("Atur halaman publik bisnis dengan preset yang simpel, premium, dan mudah digunakan.")}</p>
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
            {tr(businessError) || tr("Memuat bisnis...")}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18, alignItems: "start" }}>
          <form onSubmit={saveSettings} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, display: "grid", gap: 18 }}>
            <section>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>{tr("Pilih Tema")}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {(Object.keys(themes) as ThemeKey[]).map((key) => {
                  const item = themes[key];
                  const active = settings.theme_key === key;
                  return (
                    <button key={key} type="button" onClick={() => setSettings((s) => ({ ...s, theme_key: key }))}
                      style={{ textAlign: "left", padding: 12, borderRadius: 12, border: active ? "2px solid " + item.primary : "1px solid #e5e7eb", background: item.bg, color: item.text, cursor: "pointer" }}>
                      <div style={{
                        height: 38,
                        borderRadius: 10,
                        background:
                          key === "soft_smoothie"
                            ? "radial-gradient(circle at 30% 20%, #fffaf4 0%, #f4e7d7 34%, #d7b08a 100%)"
                            : "linear-gradient(135deg, " + item.primary + ", " + item.secondary + ")",
                        marginBottom: 9,
                        boxShadow: key === "soft_smoothie" ? "inset 0 1px 0 rgba(255,255,255,.8), 0 6px 14px rgba(155,106,67,.10)" : "none"
                      }} />
                      <strong>{tr(item.label)}</strong>
                      {key === "soft_smoothie" && (
                        <div style={{ marginTop: 4, fontSize: 10, opacity: .72 }}>{tr("Modern · lembut · elegan", "Modern · soft · elegant")}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section style={{ display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{tr("Konten Utama")}</h2>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>{tr("Nama Bisnis Publik")}</label>
                <input
                  style={inputStyle}
                  placeholder={tr("Nama yang tampil ke pelanggan", "Name shown to customers")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={160}
                  required
                />
                <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>
                  {tr("Nama ini tampil di halaman publik pelanggan. Perubahan nama tidak memengaruhi kartu atau link Google Review.")}
                </div>
              </div>
              <input style={inputStyle} placeholder={tr("Judul utama")} value={settings.hero_title} onChange={(e) => setSettings((s) => ({ ...s, hero_title: e.target.value }))} maxLength={120} />
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder={tr("Deskripsi singkat")} value={settings.hero_description} onChange={(e) => setSettings((s) => ({ ...s, hero_description: e.target.value }))} maxLength={300} />
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} placeholder={tr("Tentang bisnis")} value={settings.about_text} onChange={(e) => setSettings((s) => ({ ...s, about_text: e.target.value }))} maxLength={700} />
              <input style={inputStyle} placeholder={tr("Promo singkat")} value={settings.promo_text} onChange={(e) => setSettings((s) => ({ ...s, promo_text: e.target.value }))} maxLength={180} />
            </section>

            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{tr("Logo & Cover")}</h2>
                <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12, lineHeight: 1.5 }}>
                  {tr("Supaya hasil paling rapi: logo 1:1 dan cover sekitar 16:7.")}
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>{tr("Logo Bisnis")}</label>
                <label style={{ display: "grid", placeItems: "center", minHeight: 92, borderRadius: 12, border: "1px dashed #c9b8a7", background: "#fff", cursor: "pointer", color: "#6b5849", fontSize: 13, fontWeight: 800, textAlign: "center", padding: 12 }}>
                  {uploadingLogo ? tr("Mengupload logo...") : settings.logo_url ? tr("Ganti Logo") : tr("Upload Logo")}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b7a6d", marginTop: 4 }}>{tr("PNG / JPG / WebP · maks. 5 MB")}</span>
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
                  placeholder={tr("Atau tempel URL logo (HTTPS)", "Or paste logo URL (HTTPS)")}
                  value={settings.logo_url}
                  onChange={(e) => setSettings((s) => ({ ...s, logo_url: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 2, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>{tr("Cover Halaman")}</label>
                <label style={{ display: "grid", placeItems: "center", minHeight: 92, borderRadius: 12, border: "1px dashed #c9b8a7", background: "#fff", cursor: "pointer", color: "#6b5849", fontSize: 13, fontWeight: 800, textAlign: "center", padding: 12 }}>
                  {uploadingCover ? tr("Mengupload cover...") : settings.cover_url ? tr("Ganti Cover") : tr("Upload Cover")}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b7a6d", marginTop: 4 }}>{tr("Rekomendasi rasio 16:7 · maks. 5 MB")}</span>
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
                  placeholder={tr("Atau tempel URL cover (HTTPS)", "Or paste cover URL (HTTPS)")}
                  value={settings.cover_url}
                  onChange={(e) => setSettings((s) => ({ ...s, cover_url: e.target.value }))}
                />

                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8, color: "#6b5849" }}>
                    {tr("Posisi Cover")}
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
                          aria-label={tr("Posisi cover ") + value}
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
                    {tr("Pilih fokus cover: atas, tengah, bawah, kiri, kanan, atau sudut.")}
                  </div>
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{tr("Quick Menu")}</h2>
                <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12 }}>
                  {tr("Atur Google Review, WhatsApp, Instagram, serta file PDF dari satu halaman.")}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>Google Maps / Google Review</label>
                <input
                  style={inputStyle}
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  disabled={loadingGoogleReview}
                />
                <div style={{ color: "#8b7a6d", fontSize: 11, lineHeight: 1.5 }}>
                  {tr("Tempel link Google Maps bisnis. Saat disimpan, sistem akan mencari Place ID dan membuat link Google Review otomatis. Kosongkan jika tidak ingin mengubah setup Google Review yang sudah ada.")}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 14, background: "#faf7f2", border: "1px solid #eadfd4" }}>
                <label style={{ fontSize: 13, fontWeight: 900 }}>{tr("WhatsApp Bisnis")}</label>
                <input
                  style={inputStyle}
                  inputMode="tel"
                  placeholder={tr("Contoh: 081234567890")}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={loadingWhatsapp}
                />
                <div style={{ color: "#8b7a6d", fontSize: 11, lineHeight: 1.5 }}>
                  {tr("Bisa ditulis 08..., 628..., atau +628.... Sistem akan merapikan format nomor otomatis.")}
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
                <label style={{ fontSize: 13, fontWeight: 900 }}>{tr("File PDF")}</label>
                <input
                  style={inputStyle}
                  placeholder={tr("Judul PDF, contoh: Menu, Daftar Layanan, Paket Travel, Brosur")}
                  value={settings.pdf_title}
                  onChange={(e) => setSettings((s) => ({ ...s, pdf_title: e.target.value }))}
                  maxLength={80}
                />
                <label style={{ display: "grid", placeItems: "center", minHeight: 82, borderRadius: 12, border: "1px dashed #c9b8a7", background: "#fff", cursor: "pointer", color: "#6b5849", fontSize: 13, fontWeight: 800, textAlign: "center", padding: 12 }}>
                  {uploadingPdf ? tr("Mengunggah PDF...", "Uploading PDF...") : settings.pdf_url ? tr("Ganti PDF", "Replace PDF") : tr("Unggah PDF", "Upload PDF")}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8b7a6d", marginTop: 4 }}>{tr("PDF · maksimal 10 MB")}</span>
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
                  placeholder={tr("Atau tempel URL PDF (HTTPS)", "Or paste PDF URL (HTTPS)")}
                  value={settings.pdf_url}
                  onChange={(e) => setSettings((s) => ({ ...s, pdf_url: e.target.value }))}
                />
              </div>
            </section>

            <section style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{tr("Tampilkan Section")}</h2>
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

            {error && <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b" }}>{tr(error)}</div>}
            {message && <div style={{ padding: 12, borderRadius: 10, background: "#f0fdf4", color: "#166534" }}>{tr(message)}</div>}

            <button type="submit" disabled={saving || loading || !businessId}
              style={{ border: 0, borderRadius: 12, padding: "13px 16px", background: "var(--dashboard-accent, #111827)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
              {saving
                ? loadingGoogleReview
                  ? tr("Memproses Google Review...")
                  : tr("Menyimpan...")
                : tr("Simpan Perubahan", "Save Changes")}
            </button>
          </form>

          <aside className="modern-landing landing-preview" data-theme={settings.theme_key} style={{ ...({ "--landing-bg": theme.bg, "--landing-card": theme.card, "--landing-primary": theme.primary, "--landing-soft": theme.soft, "--landing-text": theme.text, "--landing-muted": theme.muted } as CSSProperties), position: "sticky", top: 20, background: theme.bg, borderRadius: isSmoothie ? 30 : 26, padding: 14, border: "1px solid #e5e7eb", boxShadow: "0 18px 45px rgba(15,23,42,.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted, marginBottom: 8 }}>{tr("LIVE PREVIEW")}</div>
            <div className="public-shell" style={{ borderRadius: isSmoothie ? 30 : 24, overflow: "hidden", background: theme.card, color: theme.text, boxShadow: isSmoothie ? "0 24px 60px rgba(103,73,48,.14)" : "0 20px 52px rgba(0,0,0,.09)" }}>
              <div
                className="public-hero"
                style={{
                  aspectRatio: "16 / 7",
                  minHeight: 120,
                  maxHeight: isSmoothie ? 230 : 230,
                  borderRadius: isSmoothie ? 24 : 24,
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
              <div className="public-content" style={{ padding: isSmoothie ? "0 20px 22px" : 20, textAlign: isSmoothie ? "center" : "left" }}>
                {settings.logo_url ? (
                  <img className="preview-logo" src={settings.logo_url} alt="" style={{ width: isSmoothie ? 104 : 76, height: isSmoothie ? 104 : 76, objectFit: "cover", borderRadius: isSmoothie ? 24 : 20, marginTop: isSmoothie ? -52 : -54, border: (isSmoothie ? "6px" : "4px") + " solid " + theme.card, background: theme.card, boxShadow: "0 12px 28px rgba(0,0,0,.12)" }} />
                ) : (
                  <div className="preview-logo" style={{ width: isSmoothie ? 104 : 76, height: isSmoothie ? 104 : 76, borderRadius: isSmoothie ? 24 : 20, margin: isSmoothie ? "-52px auto 0" : "-54px 0 0", border: (isSmoothie ? "6px" : "4px") + " solid " + theme.card, background: theme.soft, display: "grid", placeItems: "center", fontWeight: 900, color: theme.primary, boxShadow: "0 10px 26px rgba(0,0,0,.08)" }}>
                    {businessName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <BusinessTitle style={{ margin: "20px 0 10px", fontSize: 32, fontWeight: 800 }}>{settings.hero_title || businessName}</BusinessTitle>
                <p className="public-description" style={{ color: theme.muted, lineHeight: 1.6, marginTop: 0 }}>{settings.hero_description || tr("Bagikan pengalaman Anda dan bantu bisnis ini berkembang.")}</p>

                {settings.show_promo && settings.promo_text && (
                  <div className="public-promo" style={{ margin: "14px 0", padding: 12, borderRadius: 12, background: theme.soft, color: theme.text, fontWeight: 800 }}>✦ {settings.promo_text}</div>
                )}

                {isSmoothie && settings.show_google_review && (
                  <div className="public-rating" style={{ marginTop: 18, padding: 16, borderRadius: 22, background: "linear-gradient(145deg, rgba(255,255,255,.88), rgba(244,231,215,.86))", boxShadow: "0 14px 34px rgba(103,73,48,.10)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>{tr("Beri kami ulasan Google")}</div>
                    <div style={{ fontSize: 11, color: theme.muted, marginBottom: 12 }}>{tr("Hanya 10 detik, sangat berarti bagi kami")}</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
                      {[1,2,3,4,5].map((n) => <span key={n} style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,.78)", display: "grid", placeItems: "center", color: "#e5a323" }}>☆</span>)}
                    </div>
                  </div>
                )}

                <div className="public-links" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: isSmoothie ? 10 : 9, marginTop: 16 }}>
                  {!isSmoothie && settings.show_google_review && <div className="public-link" style={{ padding: "12px 10px", borderRadius: 14, background: "linear-gradient(135deg, " + theme.primary + ", " + theme.secondary + ")", color: "#fff", textAlign: "center", fontWeight: 900, boxShadow: "0 8px 18px rgba(0,0,0,.08)" }}>{tr("★ Beri Ulasan")}</div>}
                  {settings.show_pdf && settings.pdf_url && <div className="public-link" style={{ gridColumn: isSmoothie ? "1 / -1" : "auto", padding: isSmoothie ? "15px 14px" : "12px 10px", borderRadius: isSmoothie ? 20 : 14, background: theme.soft, color: theme.text, textAlign: isSmoothie ? "left" : "center", fontWeight: 900, border: "1px solid rgba(0,0,0,.05)", boxShadow: isSmoothie ? "0 10px 24px rgba(103,73,48,.08)" : "none" }}>▤ {settings.pdf_title || tr("Informasi", "Information")} {isSmoothie ? "›" : ""}</div>}
                  {settings.show_whatsapp && <div className="public-link" style={{ padding: isSmoothie ? "18px 10px" : "12px 10px", borderRadius: isSmoothie ? 20 : 14, background: theme.soft, color: theme.text, textAlign: "center", fontWeight: 900, border: "1px solid rgba(0,0,0,.05)", boxShadow: isSmoothie ? "0 10px 24px rgba(103,73,48,.08)" : "none" }}>
                    <div>◉ WhatsApp</div>
                    <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, opacity: .72 }}>
                      {whatsapp || "62 812-XXXX-XXXX"}
                    </div>
                  </div>}
                  {settings.show_instagram && settings.instagram_url && <div className="public-link" style={{ padding: isSmoothie ? "18px 10px" : "12px 10px", borderRadius: isSmoothie ? 20 : 14, background: theme.soft, color: theme.text, textAlign: "center", fontWeight: 900, border: "1px solid rgba(0,0,0,.05)", boxShadow: isSmoothie ? "0 10px 24px rgba(103,73,48,.08)" : "none" }}>◎ Instagram</div>}
                </div>

                {settings.show_about && settings.about_text && (
                  <div className="public-about" style={{ marginTop: 18 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{tr("Tentang Kami")}</div>
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

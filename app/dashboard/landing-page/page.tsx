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
type ToggleKey = "show_google_review" | "show_whatsapp" | "show_about" | "show_promo";

type Settings = {
  theme_key: ThemeKey;
  hero_title: string;
  hero_description: string;
  about_text: string;
  promo_text: string;
  logo_url: string;
  cover_url: string;
  show_google_review: boolean;
  show_whatsapp: boolean;
  show_about: boolean;
  show_promo: boolean;
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
    show_google_review: true,
    show_whatsapp: true,
    show_about: true,
    show_promo: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      show_google_review: data?.show_google_review ?? true,
      show_whatsapp: data?.show_whatsapp ?? true,
      show_about: data?.show_about ?? true,
      show_promo: data?.show_promo ?? true
    });
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
      p_show_google_review: settings.show_google_review,
      p_show_whatsapp: settings.show_whatsapp,
      p_show_about: settings.show_about,
      p_show_promo: settings.show_promo
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
    ["show_promo", "Tampilkan Promo"]
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
          <p style={{ margin: 0, color: "#6b7280" }}>Atur halaman publik bisnis dengan preset yang simpel dan premium.</p>
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

            <section style={{ display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Logo & Cover</h2>
              <input style={inputStyle} placeholder="Logo URL (HTTPS)" value={settings.logo_url} onChange={(e) => setSettings((s) => ({ ...s, logo_url: e.target.value }))} />
              <input style={inputStyle} placeholder="Cover URL (HTTPS)" value={settings.cover_url} onChange={(e) => setSettings((s) => ({ ...s, cover_url: e.target.value }))} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>V1 menerima URL gambar HTTPS. Upload langsung kita tambahkan setelah flow builder stabil.</div>
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

          <aside style={{ position: "sticky", top: 20, background: theme.bg, borderRadius: 24, padding: 16, border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted, marginBottom: 8 }}>LIVE PREVIEW</div>
            <div style={{ borderRadius: 22, overflow: "hidden", background: theme.card, color: theme.text, boxShadow: "0 18px 50px rgba(0,0,0,.08)" }}>
              <div style={{ height: 120, background: settings.cover_url ? "url(" + settings.cover_url + ") center/cover" : "linear-gradient(135deg, " + theme.primary + ", " + theme.secondary + ")" }} />
              <div style={{ padding: 20 }}>
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 18, marginTop: -52, border: "4px solid " + theme.card, background: theme.card }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: 18, marginTop: -52, border: "4px solid " + theme.card, background: theme.soft, display: "grid", placeItems: "center", fontWeight: 900, color: theme.primary }}>
                    {businessName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <h2 style={{ margin: "12px 0 6px", fontSize: 26 }}>{settings.hero_title || businessName}</h2>
                <p style={{ color: theme.muted, lineHeight: 1.6, marginTop: 0 }}>{settings.hero_description || "Bagikan pengalaman Anda dan bantu bisnis ini berkembang."}</p>

                {settings.show_promo && settings.promo_text && (
                  <div style={{ margin: "14px 0", padding: 12, borderRadius: 12, background: theme.soft, color: theme.text, fontWeight: 800 }}>✦ {settings.promo_text}</div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 16 }}>
                  {settings.show_google_review && <div style={{ padding: "11px 10px", borderRadius: 12, background: theme.primary, color: "#fff", textAlign: "center", fontWeight: 900 }}>Beri Ulasan</div>}
                  {settings.show_whatsapp && <div style={{ padding: "11px 10px", borderRadius: 12, background: theme.soft, color: theme.text, textAlign: "center", fontWeight: 900 }}>WhatsApp</div>}
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

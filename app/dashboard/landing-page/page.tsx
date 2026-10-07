"use client";
import BusinessManagementGate from "../../components/BusinessManagementGate";

import "../../components/public-landing.css";
import LandingCardContent from "../../components/LandingCardContent";
import RatingFlow from "../../[cardCode]/RatingFlow";
import { landingThemes as themes } from "../../../lib/landingThemes";
import type { CSSProperties } from "react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useBusinessContext } from "../../../lib/useBusinessContext";
import { useLanguage } from "../../../lib/i18n";
import { landingDraftKey, readLandingDraft, writeLandingDraft, clearLandingDraft } from "../../../lib/landingDraft";


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

type EditorDraft = { settings: Settings; displayName: string; whatsapp: string; mapsUrl: string };
function validDraft(value: unknown): value is EditorDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as EditorDraft;
  if (![draft.displayName, draft.whatsapp, draft.mapsUrl].every(field => typeof field === "string" && field.length <= 10000)) return false;
  if (!draft.settings || !Object.hasOwn(themes, draft.settings.theme_key)) return false;
  const strings = ["hero_title", "hero_description", "about_text", "promo_text", "logo_url", "cover_url", "instagram_url", "pdf_title", "pdf_url"] as const;
  const toggles = ["show_google_review", "show_whatsapp", "show_about", "show_promo", "show_instagram", "show_pdf"] as const;
  return strings.every(key => typeof draft.settings[key] === "string" && draft.settings[key].length <= 10000)
    && toggles.every(key => typeof draft.settings[key] === "boolean")
    && ["center", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"].includes(draft.settings.cover_position);
}

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
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const { businesses, businessId, setBusinessId, businessLoading, businessError, reloadBusinesses } =
    useBusinessContext(userEmail, true);
  const draftKey = userEmail && businessId ? landingDraftKey(userEmail, businessId) : "";
  const activeDraftKey = useRef(draftKey);
  const loadSequence = useRef(0);
  const uploadSequence = useRef({ logo: 0, cover: 0, pdf: 0 });
  const uploadBusy = useRef({ logo: false, cover: false, pdf: false });
  activeDraftKey.current = draftKey;
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
  const [baseline, setBaseline] = useState("");
  const [draftNotice, setDraftNotice] = useState<"" | "restored" | "saved" | "unavailable">("");

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || authEventReceived) return;
      setUserEmail(data.session?.user?.email ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (!active) return;
      setUserEmail(session?.user?.email ?? null);
      setAuthChecked(true);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    for (const kind of ["logo", "cover", "pdf"] as const) { uploadSequence.current[kind]++; uploadBusy.current[kind] = false; }
    setUploadingLogo(false); setUploadingCover(false); setUploadingPdf(false);
    const sequence = ++loadSequence.current;
    setLoadedDraftKey("");
    setDraftNotice("");
    if (businessId && draftKey) loadSettings(draftKey, sequence);
    return () => { if (loadSequence.current === sequence) loadSequence.current++; for (const kind of ["logo", "cover", "pdf"] as const) uploadSequence.current[kind]++; };
  }, [businessId, draftKey]);

  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey) return;
    const value = { settings, displayName, whatsapp, mapsUrl };
    if (JSON.stringify(value) === baseline) {
      clearLandingDraft(draftKey);
      setDraftNotice("");
    } else {
      setDraftNotice(writeLandingDraft(draftKey, value) ? "saved" : "unavailable");
    }
  }, [settings, displayName, whatsapp, mapsUrl, draftKey, loadedDraftKey, baseline]);

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

  async function loadSettings(key: string, sequence: number) {
    setLoading(true);
    setLoadingWhatsapp(true);
    setError("");

    try {

    const [
      { data, error },
      { data: contactData, error: contactError },
      { data: profileData, error: profileError },
      { data: setupData }
    ] = await Promise.all([
      supabase.rpc("v3_get_landing_page_settings", { p_business_id: businessId }),
      supabase.rpc("v3_get_business_contact_settings", { p_business_id: businessId }),
      supabase.rpc("v3_get_business_profile", { p_business_id: businessId }),
      supabase.rpc("v3_get_business_setup_status", { p_business_id: businessId })
    ]);

    if (activeDraftKey.current !== key || loadSequence.current !== sequence) return;

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

    const serverSettings: Settings = {
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
    };
    const serverDraft: EditorDraft = {
      settings: serverSettings,
      displayName: profileData?.display_name ?? profileData?.internal_name ?? "",
      whatsapp: contactData?.whatsapp_number ?? "",
      mapsUrl: "",
    };
    const restored = readLandingDraft(key, validDraft);
    const value = restored ?? serverDraft;
    setBaseline(JSON.stringify(serverDraft));
    setSettings(value.settings);
    setDisplayName(value.displayName);
    setWhatsapp(value.whatsapp);
    setMapsUrl(value.mapsUrl);
    setGoogleConfigured(setupData?.google_review_configured === true);
    setLoadedDraftKey(key);
    if (restored) setDraftNotice("restored");
    } catch {
      if (activeDraftKey.current === key && loadSequence.current === sequence) {
        setLoading(false);
        setLoadingWhatsapp(false);
        setError("Pengaturan halaman publik belum dapat dimuat. Silakan coba lagi.");
      }
    }
  }

  async function uploadMedia(file: File, kind: "logo" | "cover") {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setError("File harus berupa gambar."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Ukuran gambar maksimal 5 MB."); return; }
    await uploadLandingFile(file, kind);
  }

  async function uploadPdf(file: File) {
    if (file.type !== "application/pdf") { setError("File harus berupa PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Ukuran PDF maksimal 10 MB."); return; }
    await uploadLandingFile(file, "pdf");
  }

  async function uploadLandingFile(file: File, kind: "logo" | "cover" | "pdf") {
    const capturedKey = draftKey;
    const capturedBusiness = businessId;
    if (!userEmail || !capturedBusiness || !capturedKey || loadedDraftKey !== capturedKey || uploadBusy.current[kind]) return;
    const request = ++uploadSequence.current[kind];
    uploadBusy.current[kind] = true;
    const current = () => activeDraftKey.current === capturedKey && uploadSequence.current[kind] === request;
    const setUploading = kind === "logo" ? setUploadingLogo : kind === "cover" ? setUploadingCover : setUploadingPdf;
    setUploading(true); setError(""); setMessage("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        (async () => {
          const { data, error: authError } = await supabase.auth.getUser();
          if (!current()) return null;
          if (authError || !data.user?.id) throw new Error("AUTH_REQUIRED");
          const uid = data.user.id;
          const ext = kind === "pdf" ? "pdf" : ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[file.type];
          const path = `${uid}/${capturedBusiness}/${kind === "pdf" ? "pdf/menu" : kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("landing-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
          if (!current()) return null;
          if (uploadError) throw new Error("UPLOAD_FAILED");
          return supabase.storage.from("landing-media").getPublicUrl(path).data.publicUrl;
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), 60000); }),
      ]);
      if (!current() || !result) return;
      setSettings(settings => kind === "pdf"
        ? { ...settings, pdf_url: result, pdf_title: settings.pdf_title || file.name.replace(/\.pdf$/i, "") }
        : { ...settings, [kind === "logo" ? "logo_url" : "cover_url"]: result });
      setMessage(kind === "pdf" ? "PDF berhasil diunggah. Klik Simpan Perubahan untuk menyimpan perubahan."
        : (kind === "logo" ? "Logo" : tr("Cover")) + tr(" berhasil diupload. Klik Simpan Perubahan untuk menyimpan perubahan."));
    } catch {
      if (current()) setError(kind === "pdf" ? "Unggah PDF belum berhasil. Silakan coba lagi." : "Upload gambar belum berhasil. Silakan coba lagi.");
    } finally {
      clearTimeout(timer);
      if (current()) { uploadBusy.current[kind] = false; setUploading(false); uploadSequence.current[kind]++; }
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (saving || !businessId || loadedDraftKey !== draftKey) return;
    const savingKey = draftKey;
    const stillCurrent = () => activeDraftKey.current === savingKey;
    let savedMapsUrl = mapsUrl;
    setSaving(true);
    setError("");
    setMessage("");

    try {
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

      if (!stillCurrent()) return;
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

        if (!stillCurrent()) return;
        if (sessionError || !session?.access_token) {
          setLoadingGoogleReview(false);
          setSaving(false);
          setError("Sesi tidak ditemukan. Silakan masuk kembali.");
          return;
        }

        try {
          const response = await fetch("/api/google-review/setup", {
            method: "POST",
            signal: AbortSignal.timeout(60000),
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
          if (!stillCurrent()) return;

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
            } else if (googleData?.code === "GOOGLE_TEMPORARILY_UNAVAILABLE") {
              setError("Pengaturan Google Maps sementara belum tersedia. Silakan coba lagi nanti.");
            } else if (googleData?.step === "resolve") {
              setError("Link Google Maps belum dapat diproses. Pastikan link benar lalu coba lagi.");
            } else {
              setError("Google Review belum dapat disimpan. Silakan coba lagi.");
            }
            return;
          }

          savedMapsUrl = googleData?.maps_url ?? mapsUrl.trim();
          setMapsUrl(savedMapsUrl);
          setGoogleConfigured(true);
        } catch (googleError) {
          if (!stillCurrent()) return;
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

      if (!stillCurrent()) return;
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

      if (!stillCurrent()) return;
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
      setBaseline(JSON.stringify({ settings, displayName: nameData?.display_name ?? displayName.trim(), whatsapp: contactData?.whatsapp_number ?? whatsapp, mapsUrl: savedMapsUrl }));
    } catch {
      if (stillCurrent()) setError("Landing page belum dapat disimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
      setLoadingGoogleReview(false);
    }
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
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>YUKREVIEW</div>
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
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>YUKREVIEW</div>
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

  if (businessLoading || !businessId || loadedDraftKey !== draftKey) {
    return <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: 24 }}>
      <section style={{ maxWidth: 520, margin: "0 auto", background: "white", borderRadius: 18, padding: 24 }}>
        <h1>{tr("Pengeditan Halaman")}</h1>
        <p role={error || businessError ? "alert" : "status"}>
          {tr(error || businessError || (businessLoading || loading ? "Memuat bisnis..." : !businessId ? "Belum ada bisnis aktif untuk akun ini." : "Pengaturan halaman publik belum dapat dimuat. Silakan coba lagi."))}
        </p>
        {!businessLoading && !loading && <button type="button" onClick={() => {
          if (!businessId) reloadBusinesses();
          else loadSettings(draftKey, ++loadSequence.current);
        }}>{tr("Coba lagi", "Try again")}</button>}
        {!businessLoading && !businessId && !businessError && <p><a href="/dashboard/onboarding">{tr("Atur Bisnis", "Set Up Business")}</a></p>}
      </section>
    </main>;
  }

  return (
    <BusinessManagementGate businessId={businessId} userEmail={userEmail} businesses={businesses} setBusinessId={setBusinessId}>
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "32px 20px", color: "#111827" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#6b7280" }}>YUKREVIEW</div>
          <h1 style={{ margin: "6px 0 8px", fontSize: 30 }}>{tr("Pengeditan Halaman")}</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>{tr("Atur halaman publik bisnis dengan preset yang simpel, premium, dan mudah digunakan.")}</p>
        </div>

        {businesses.length > 1 && (
          <select value={businessId ?? ""} disabled={saving || uploadingLogo || uploadingCover || uploadingPdf} onChange={(e) => setBusinessId(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }}>
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

        {draftNotice && <p role="status" style={{ color: draftNotice === "unavailable" ? "#9a3412" : "#166534", fontSize: 14 }}>
          {draftNotice === "unavailable"
            ? tr("Browser tidak dapat menyimpan draft. Simpan perubahan sebelum menutup halaman.", "Your browser cannot store drafts. Save your changes before closing this page.")
            : tr("Draft tersimpan otomatis di tab ini dan dipulihkan setelah refresh. Klik Simpan Perubahan untuk menerapkannya ke halaman publik.", "Your draft is saved automatically in this tab and restored after refresh. Click Save Changes to apply it to your public page.")}
        </p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18, alignItems: "start" }}>
          <form onSubmit={saveSettings} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 20, display: "grid", gap: 18 }}>
            <fieldset disabled={loading || saving || loadedDraftKey !== draftKey} style={{ display: "contents", border: 0, padding: 0, margin: 0 }}>
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
            </fieldset>
          </form>

          <aside className="modern-landing landing-preview" data-theme={settings.theme_key} style={{ ...({ "--landing-bg": theme.bg, "--landing-card": theme.card, "--landing-primary": theme.primary, "--landing-secondary": theme.secondary, "--landing-soft": theme.soft, "--landing-text": theme.text, "--landing-muted": theme.muted } as CSSProperties), position: "sticky", top: 20, background: theme.bg, borderRadius: isSmoothie ? 30 : 26, padding: 14, border: "1px solid " + theme.soft, boxShadow: "0 18px 45px rgba(15,23,42,.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted, marginBottom: 8 }}>{tr("LIVE PREVIEW")}</div>
            <section className="public-shell" style={{ overflow: "hidden", color: theme.text }}>
              <LandingCardContent
                preview theme={theme} themeKey={settings.theme_key} businessName={businessName}
                title={settings.hero_title || businessName}
                description={settings.hero_description || tr("Bagikan pengalaman Anda dan bantu bisnis ini berkembang.")}
                category={selectedBusiness?.category} logoUrl={settings.logo_url} coverUrl={settings.cover_url} coverPosition={settings.cover_position}
                promoText={settings.promo_text} aboutText={settings.about_text}
                reviewUrl={mapsUrl.trim() || googleConfigured ? "#review-preview" : null}
                whatsappUrl={whatsapp.trim() ? "#whatsapp-preview" : null} instagramUrl={settings.instagram_url} pdfUrl={settings.pdf_url} pdfTitle={settings.pdf_title || tr("Informasi", "Information")}
                showGoogleReview={settings.show_google_review} showWhatsapp={settings.show_whatsapp} showInstagram={settings.show_instagram}
                showPdf={settings.show_pdf} showAbout={settings.show_about} showPromo={settings.show_promo}
                labels={{ review: tr("★ Beri Ulasan", "★ Leave a Review"), about: tr("Tentang Kami", "About Us"), thanks: tr("Terima kasih sudah mendukung", "Thank you for supporting") }}
                rating={<RatingFlow previewOnly cardCode="preview" businessName={businessName}
                  reviewUrl={mapsUrl.trim() || googleConfigured ? "#review-preview" : null}
                  primaryColor={theme.primary} softColor={theme.soft} textColor={theme.text} mutedColor={theme.muted}
                  smoothMode />}
              />
              <div className="public-footer" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{tr("Preview")}</span><span>Powered by YukReview</span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
    </BusinessManagementGate>
  );
}

import { resolveCardCode } from "../../lib/cardPublicId";
import type { CSSProperties } from "react";
import "../components/public-landing.css";
import { createClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import LandingCardContent from "../components/LandingCardContent";
import { getLandingTheme } from "../../lib/landingThemes";
import RatingFlow from "./RatingFlow";

type AnyObject = Record<string, any>;

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getBlockTitle(block: AnyObject) {
  return firstString(
    block.title,
    block.heading,
    block.label,
    block.content?.title,
    block.content?.heading
  );
}

function getBlockBody(block: AnyObject) {
  return firstString(
    block.body,
    block.text,
    block.description,
    block.content?.body,
    block.content?.text,
    block.content?.description
  );
}

function getBlockUrl(block: AnyObject) {
  return firstString(
    block.url,
    block.href,
    block.link,
    block.content?.url,
    block.content?.href
  );
}

function IconBubble({ children, bg = "#F6E9D8" }: { children: React.ReactNode; bg?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        display: "inline-grid",
        placeItems: "center",
        background: bg,
        flex: "0 0 auto",
      }}
    >
      {children}
    </span>
  );
}

function InstagramIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.2A8.5 8.5 0 1 1 20.5 11.6Z" />
      <path d="M8.5 8.2c.3 2.9 2.4 5.1 5.3 5.6" />
      <path d="M8.4 8.1 10 7.4l1 2-1.1.8" />
      <path d="m13.8 13.8.8-1.1 2 1-.7 1.6" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2.8h8l4 4V21H6z" />
      <path d="M14 2.8V7h4" />
      <path d="M8.7 15.8c2.3-4.5 3.3-5.8 4.1-4.8.6.7-.5 2.7-1.6 3.8 1.5-.3 3.1-.4 4.2.2" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.2-.2-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.1Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.4-4H3.3v2.6A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.6 14.1A6 6 0 0 1 6.3 12c0-.7.1-1.4.3-2.1V7.3H3.3A10 10 0 0 0 2 12c0 1.7.4 3.3 1.3 4.7l3.3-2.6Z"/>
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2 10 10 0 0 0 3.3 7.3l3.3 2.6a5.8 5.8 0 0 1 5.4-4Z"/>
    </svg>
  );
}

function getWhatsAppUrl(blocks: AnyObject[]) {
  for (const block of blocks) {
    const url = getBlockUrl(block);
    if (
      url &&
      (url.includes("wa.me/") ||
        url.includes("whatsapp.com/") ||
        url.includes("api.whatsapp.com/"))
    ) {
      return url;
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardCode: string }>;
}) {
  let { cardCode } = await params;
  const routeCode = cardCode;
  const cookieStore = await cookies();
  const language = cookieStore.get("reputasipro-language")?.value === "en" ? "en" : "id";
  const tr = (idText: string, enText: string) => language === "en" ? enText : idText;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      title: "ReputasiPro",
      description: tr("Bagikan pengalaman dan masukan Anda.", "Share your experience and feedback."),
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resolvedCode = await resolveCardCode(supabase, routeCode);
    if (!resolvedCode) notFound();
    cardCode = resolvedCode;
    const { data } = await supabase.rpc("v3_get_public_business_name", {
      p_card_code: cardCode,
    });

    const name =
      firstString(data?.display_name, data?.business_name) ?? "ReputasiPro";

    return {
      title: name + " | ReputasiPro",
      description: tr("Bagikan pengalaman dan masukan Anda untuk ", "Share your experience and feedback for ") + name + ".",
    };
  } catch {
    return {
      title: "ReputasiPro",
      description: tr("Bagikan pengalaman dan masukan Anda.", "Share your experience and feedback."),
    };
  }
}

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ cardCode: string }>;
}) {
  let { cardCode } = await params;
  const routeCode = cardCode;
  const cookieStore = await cookies();
  const language = cookieStore.get("reputasipro-language")?.value === "en" ? "en" : "id";
  const tr = (idText: string, enText: string) => language === "en" ? enText : idText;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
    const resolvedCode = await resolveCardCode(supabase, routeCode);
    if (!resolvedCode) notFound();
    cardCode = resolvedCode;

  const { data: activationState } = await supabase.rpc(
    "v3_get_card_activation_state",
    { p_card_code: cardCode }
  );

  if (activationState?.success && activationState?.needs_activation) {
    redirect(`/activate/${routeCode}`);
  }

  if (activationState?.success === false) {
    notFound();
  }

  const [
    { data, error },
    { data: publicNameData },
    { data: publicContactData },
    { data: landingSettingsData },
  ] = await Promise.all([
    supabase.rpc("v3_get_public_card", {
      p_card_code: cardCode,
    }),
    supabase.rpc("v3_get_public_business_name", {
      p_card_code: cardCode,
    }),
    supabase.rpc("v3_get_public_business_contact", {
      p_card_code: cardCode,
    }),
    supabase.rpc("v3_get_public_landing_page", {
      p_card_code: cardCode,
    }),
  ]);

  if (error || !data) {
    notFound();
  }

  const payload = data as AnyObject;

  if (payload?.ok === false || payload?.success === false) {
    notFound();
  }

  const business = payload.business ?? {};
  const card = payload.card ?? {};
  const landingPage = payload.landing_page ?? {};
  const googleReview =
    payload.google_review ??
    payload.google_review_profile ??
    payload.review_profile ??
    {};

  const blocks = Array.isArray(payload.blocks)
    ? payload.blocks
    : Array.isArray(landingPage.blocks)
      ? landingPage.blocks
      : [];

  const businessName =
    firstString(
      publicNameData?.display_name,
      business.display_name,
      googleReview.business_name,
      business.name,
      business.business_name,
      payload.business_name
    ) ?? "ReputasiPro";

  const category = firstString(
    business.category,
    payload.category,
    landingPage.category
  );

  const reviewUrl = firstString(
    googleReview.review_url,
    payload.review_url
  );

  const mapsUrl = firstString(
    googleReview.maps_url,
    payload.maps_url
  );

  const whatsappUrl =
    firstString(publicContactData?.whatsapp_url) ??
    getWhatsAppUrl(blocks);

  const pageTitle =
    firstString(
      landingSettingsData?.hero_title,
      business.display_name,
      publicNameData?.display_name,
      landingPage.title,
      landingPage.name,
      payload.landing_title
    ) ?? businessName;

  const pageDescription =
    firstString(
      landingSettingsData?.hero_description,
      landingPage.description,
      landingPage.subtitle,
      payload.landing_description
    ) ??
    tr("Bagikan pengalaman Anda dan bantu bisnis ini berkembang.", "Share your experience and help this business grow.");

  const themeKey = firstString(landingSettingsData?.theme_key) ?? "warm_brown";
  const theme = getLandingTheme(themeKey);
  const isSmoothie = themeKey === "soft_smoothie";
  const logoUrl = firstString(landingSettingsData?.logo_url);
  const coverUrl = firstString(landingSettingsData?.cover_url);
  const coverPosition = firstString(landingSettingsData?.cover_position) ?? "center";
  const aboutText = firstString(landingSettingsData?.about_text);
  const promoText = firstString(landingSettingsData?.promo_text);
  const instagramUrl = firstString(landingSettingsData?.instagram_url);
  const pdfTitle = firstString(landingSettingsData?.pdf_title) ?? tr("Informasi", "Information");
  const pdfUrl = firstString(landingSettingsData?.pdf_url);
  const showGoogleReview = landingSettingsData?.show_google_review !== false;
  const showWhatsapp = landingSettingsData?.show_whatsapp !== false;
  const showAbout = landingSettingsData?.show_about !== false;
  const showPromo = landingSettingsData?.show_promo !== false;
  const showInstagram = landingSettingsData?.show_instagram !== false;
  const showPdf = landingSettingsData?.show_pdf !== false;

  return (
    <main
      className={"modern-landing " + (isSmoothie ? "smoothie-page" : "")}
      data-theme={themeKey}
      style={{
        ...({ "--landing-bg": theme.bg, "--landing-card": theme.card, "--landing-primary": theme.primary, "--landing-secondary": theme.secondary, "--landing-soft": theme.soft, "--landing-text": theme.text, "--landing-muted": theme.muted } as CSSProperties),
        minHeight: "100vh",
        background: isSmoothie
          ? "radial-gradient(circle at 50% 0%, #fffaf4 0%, #fbf5ec 38%, #f5eadc 100%)"
          : "radial-gradient(circle at top, " + theme.soft + " 0%, " + theme.bg + " 42%, " + theme.bg + " 100%)",
        padding: isSmoothie ? "10px 10px 36px" : "18px 14px 40px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: theme.text,
      }}
    >
      <section
        className={"public-shell " + (isSmoothie ? "smoothie-shell" : "")}
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: isSmoothie ? "rgba(255,253,250,.92)" : theme.card,
          border: isSmoothie ? "1px solid rgba(255,255,255,.75)" : "1px solid rgba(0,0,0,.055)",
          borderRadius: isSmoothie ? 38 : 28,
          padding: isSmoothie ? 12 : 14,
          boxShadow: isSmoothie
            ? "0 34px 90px rgba(103,73,48,.15), inset 0 1px 0 rgba(255,255,255,.9)"
            : "0 28px 80px rgba(75,52,40,.13)",
          overflow: "hidden",
        }}
      >
        <LandingCardContent
          theme={theme} themeKey={themeKey} businessName={businessName} title={pageTitle} description={pageDescription}
          category={category} logoUrl={logoUrl} coverUrl={coverUrl} coverPosition={coverPosition}
          promoText={promoText} aboutText={aboutText} reviewUrl={reviewUrl} whatsappUrl={whatsappUrl}
          instagramUrl={instagramUrl} pdfUrl={pdfUrl} pdfHref={`/${routeCode}/menu`} pdfTitle={pdfTitle}
          showGoogleReview={showGoogleReview} showWhatsapp={showWhatsapp} showInstagram={showInstagram}
          showPdf={showPdf} showAbout={showAbout} showPromo={showPromo}
          labels={{ review: tr("★ Beri Ulasan", "★ Leave a Review"), about: tr("Tentang Kami", "About Us"), thanks: tr("Terima kasih sudah mendukung", "Thank you for supporting") }}
          rating={<RatingFlow cardCode={cardCode} businessName={businessName} reviewUrl={showGoogleReview ? reviewUrl : null}
            whatsappUrl={showWhatsapp ? whatsappUrl : null} primaryColor={theme.primary} softColor={theme.soft}
            textColor={theme.text} mutedColor={theme.muted} smoothMode />}
        />
        <div style={{ padding: "0 16px 16px" }}>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              marginTop: 16,
              textAlign: "center",
              textDecoration: "none",
              background: theme.card,
              color: theme.text,
              padding: "13px 16px",
              borderRadius: 12,
              fontWeight: 700,
              border: "1px solid rgba(0,0,0,.12)",
            }}
          >
            {tr("Lihat di Google Maps", "View on Google Maps")}
          </a>
        )}

        {blocks.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 24,
            }}
          >
            {blocks.map((block: AnyObject, index: number) => {
              const title = getBlockTitle(block);
              const body = getBlockBody(block);
              const url = getBlockUrl(block);

              if (!title && !body && !url) return null;

              const inner = (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: theme.soft,
                    border: "1px solid rgba(0,0,0,.06)",
                  }}
                >
                  {title && (
                    <div
                      style={{
                        fontWeight: 800,
                        marginBottom: body ? 6 : 0,
                      }}
                    >
                      {title}
                    </div>
                  )}

                  {body && (
                    <div
                      style={{
                        color: theme.muted,
                        lineHeight: 1.55,
                        fontSize: 14,
                      }}
                    >
                      {body}
                    </div>
                  )}
                </div>
              );

              return url ? (
                <a
                  key={block.id ?? index}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  {inner}
                </a>
              ) : (
                <div key={block.id ?? index}>{inner}</div>
              );
            })}
          </div>
        )}

        </div>


        <div
          className="public-footer"
          style={{
            marginTop: isSmoothie ? 16 : 18,
            paddingTop: 18,
            borderTop: "1px solid rgba(0,0,0,.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            color: theme.muted,
            fontSize: 12,
          }}
        >
          <span>{tr("Kartu", "Card")}: {card.card_code ?? cardCode}</span>
          <span>Powered by ReputasiPro</span>
        </div>
      </section>
    </main>
  );
}

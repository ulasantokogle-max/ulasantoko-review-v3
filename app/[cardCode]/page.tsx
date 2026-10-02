import { createClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import RatingFlow from "./RatingFlow";

type AnyObject = Record<string, any>;

const themeMap: Record<string, {
  bg: string;
  card: string;
  primary: string;
  secondary: string;
  soft: string;
  text: string;
  muted: string;
}> = {
  warm_brown: {
    bg: "#FFF8F1",
    card: "#FFFFFF",
    primary: "#8B5E3C",
    secondary: "#B9825A",
    soft: "#F2E5D8",
    text: "#4B3428",
    muted: "#7A6659",
  },
  soft_tosca: {
    bg: "#F0FBF9",
    card: "#FFFFFF",
    primary: "#2A9D8F",
    secondary: "#67C9BD",
    soft: "#DDF4F0",
    text: "#173E39",
    muted: "#5F7C78",
  },
  elegant_cream: {
    bg: "#FBF7EF",
    card: "#FFFDF8",
    primary: "#9A7B4F",
    secondary: "#C9B184",
    soft: "#EFE5D2",
    text: "#4D4337",
    muted: "#7D7366",
  },
  minimal_dark: {
    bg: "#161616",
    card: "#202020",
    primary: "#E6C59A",
    secondary: "#BFA17B",
    soft: "#2B2B2B",
    text: "#FAF7F2",
    muted: "#C9C1B8",
  },
};

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

export default async function PublicCardPage({
  params,
}: {
  params: Promise<{ cardCode: string }>;
}) {
  const { cardCode } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: activationState } = await supabase.rpc(
    "v3_get_card_activation_state",
    { p_card_code: cardCode }
  );

  if (activationState?.success && activationState?.needs_activation) {
    redirect(`/activate/${cardCode}`);
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
    ) ?? "UlasanToko";

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
    "Bagikan pengalaman Anda dan bantu bisnis ini berkembang.";

  const themeKey = firstString(landingSettingsData?.theme_key) ?? "warm_brown";
  const theme = themeMap[themeKey] ?? themeMap.warm_brown;
  const logoUrl = firstString(landingSettingsData?.logo_url);
  const coverUrl = firstString(landingSettingsData?.cover_url);
  const aboutText = firstString(landingSettingsData?.about_text);
  const promoText = firstString(landingSettingsData?.promo_text);
  const showGoogleReview = landingSettingsData?.show_google_review !== false;
  const showWhatsapp = landingSettingsData?.show_whatsapp !== false;
  const showAbout = landingSettingsData?.show_about !== false;
  const showPromo = landingSettingsData?.show_promo !== false;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, " + theme.soft + " 0%, " + theme.bg + " 42%, " + theme.bg + " 100%)",
        padding: "28px 16px 48px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: theme.text,
      }}
    >
      <section
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: theme.card,
          border: "1px solid rgba(0,0,0,.06)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 24px 70px rgba(75,52,40,.12)",
        }}
      >
        <div
          style={{
            height: 150,
            borderRadius: 18,
            marginBottom: 0,
            background: coverUrl
              ? "url(" + coverUrl + ") center/cover"
              : "linear-gradient(135deg, " + theme.primary + ", " + theme.secondary + ")",
          }}
        />

        <div style={{ marginTop: -42, position: "relative" }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              style={{
                width: 84,
                height: 84,
                objectFit: "cover",
                borderRadius: 22,
                border: "5px solid " + theme.card,
                background: theme.card,
                boxShadow: "0 12px 30px rgba(0,0,0,.12)",
              }}
            />
          ) : (
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 22,
                border: "5px solid " + theme.card,
                background: theme.soft,
                display: "grid",
                placeItems: "center",
                color: theme.primary,
                fontWeight: 900,
                fontSize: 24,
                boxShadow: "0 12px 30px rgba(0,0,0,.08)",
              }}
            >
              {businessName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.8,
            color: theme.muted,
            textTransform: "uppercase",
            marginTop: 14,
            marginBottom: 10,
          }}
        >
          UlasanToko Review
        </div>

        <h1
          style={{
            fontSize: 30,
            lineHeight: 1.15,
            margin: "0 0 8px",
          }}
        >
          {pageTitle}
        </h1>

        {category && (
          <div
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: 999,
              background: theme.soft,
              color: theme.text,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {category}
          </div>
        )}

        <p
          style={{
            color: theme.muted,
            lineHeight: 1.65,
            margin: "6px 0 22px",
          }}
        >
          {pageDescription}
        </p>

        {showPromo && promoText && (
          <div
            style={{
              margin: "4px 0 18px",
              padding: "12px 14px",
              borderRadius: 14,
              background: theme.soft,
              color: theme.text,
              fontWeight: 800,
            }}
          >
            ✦ {promoText}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              showGoogleReview && showWhatsapp ? "1fr 1fr" : "1fr",
            gap: 10,
            marginBottom: 8,
          }}
        >
          {showGoogleReview && reviewUrl && (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: 12,
                background: theme.primary,
                color: "#fff",
                fontWeight: 900,
              }}
            >
              Beri Ulasan
            </a>
          )}

          {showWhatsapp && whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: 12,
                background: theme.soft,
                color: theme.text,
                fontWeight: 900,
              }}
            >
              WhatsApp
            </a>
          )}
        </div>

        {showAbout && aboutText && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              background: theme.soft,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tentang Kami</div>
            <div style={{ color: theme.muted, lineHeight: 1.6, fontSize: 14 }}>
              {aboutText}
            </div>
          </div>
        )}

        <RatingFlow
          cardCode={cardCode}
          businessName={businessName}
          reviewUrl={showGoogleReview ? reviewUrl : null}
          whatsappUrl={showWhatsapp ? whatsappUrl : null}
          primaryColor={theme.primary}
          softColor={theme.soft}
          textColor={theme.text}
          mutedColor={theme.muted}
        />

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
            Lihat di Google Maps
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

        <div
          style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: "1px solid rgba(0,0,0,.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            color: theme.muted,
            fontSize: 12,
          }}
        >
          <span>Card: {card.card_code ?? cardCode}</span>
          <span>Powered by UlasanToko</span>
        </div>
      </section>
    </main>
  );
}

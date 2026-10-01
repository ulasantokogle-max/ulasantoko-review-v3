import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
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

  const [{ data, error }, { data: publicNameData }] = await Promise.all([
    supabase.rpc("v3_get_public_card", {
      p_card_code: cardCode,
    }),
    supabase.rpc("v3_get_public_business_name", {
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

  const whatsappUrl = getWhatsAppUrl(blocks);

  const pageTitle =
    firstString(
      business.display_name,
      publicNameData?.display_name,
      landingPage.title,
      landingPage.name,
      payload.landing_title
    ) ?? businessName;

  const pageDescription =
    firstString(
      landingPage.description,
      landingPage.subtitle,
      payload.landing_description
    ) ??
    "Bagikan pengalaman Anda dan bantu bisnis ini berkembang.";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
        padding: "28px 16px 48px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.7,
            color: "#6b7280",
            textTransform: "uppercase",
            marginBottom: 14,
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
              background: "#f3f4f6",
              color: "#4b5563",
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
            color: "#6b7280",
            lineHeight: 1.65,
            margin: "6px 0 22px",
          }}
        >
          {pageDescription}
        </p>

        <RatingFlow
          cardCode={cardCode}
          businessName={businessName}
          reviewUrl={reviewUrl}
          whatsappUrl={whatsappUrl}
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
              background: "#ffffff",
              color: "#111827",
              padding: "13px 16px",
              borderRadius: 12,
              fontWeight: 700,
              border: "1px solid #d1d5db",
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
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
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
                        color: "#6b7280",
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
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            color: "#9ca3af",
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

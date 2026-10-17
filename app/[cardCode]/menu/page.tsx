import PdfViewer from "./PdfViewer";
import { isHostedMenuPdf } from "../../../lib/publicPdf";
import { resolveCardCode } from "../../../lib/cardPublicId";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
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
      title: tr("Dokumen | YukReview", "Document | YukReview"),
      description: tr("Dokumen publik bisnis.", "Public business document."),
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resolvedCode = await resolveCardCode(supabase, routeCode);
    if (!resolvedCode) notFound();
    cardCode = resolvedCode;
    const { data } = await supabase.rpc("v3_get_public_landing_page", {
      p_card_code: cardCode,
    });

    const businessName = firstString(data?.business_name) ?? "YukReview";
    const title = firstString(data?.pdf_title) ?? tr("Informasi", "Information");

    return {
      title: title + " | " + businessName,
      description: tr("Dokumen publik ", "Public document for ") + businessName + tr(" melalui YukReview.", " via YukReview."),
    };
  } catch {
    return {
      title: tr("Dokumen | YukReview", "Document | YukReview"),
      description: tr("Dokumen publik bisnis.", "Public business document."),
    };
  }
}

export default async function PublicPdfMenuPage({
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
  const { data } = await supabase.rpc("v3_get_public_landing_page", {
    p_card_code: cardCode,
  });

  if (!data?.success || data?.show_pdf === false) {
    notFound();
  }

  const pdfUrl = firstString(data?.pdf_url);
  if (!pdfUrl) {
    notFound();
  }

  const title = firstString(data?.pdf_title) ?? tr("Informasi", "Information");
  const businessName = firstString(data?.business_name) ?? "YukReview";
  const themeKey = firstString(data?.theme_key) ?? "warm_brown";
  const isSmoothie = themeKey === "soft_smoothie";
  const documentSource = isHostedMenuPdf(pdfUrl, supabaseUrl)
    ? `/${encodeURIComponent(routeCode)}/menu/file` : pdfUrl;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: isSmoothie
          ? "radial-gradient(circle at 50% 0%, #fffaf4 0%, #fbf5ec 42%, #f5eadc 100%)"
          : "#FFF8F1",
        padding: isSmoothie ? "14px 12px 24px" : "18px 14px 28px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#4B3428",
      }}
    >
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: isSmoothie ? "rgba(255,253,250,.94)" : "#fff",
          border: isSmoothie ? "1px solid rgba(255,255,255,.78)" : "1px solid rgba(0,0,0,.06)",
          borderRadius: isSmoothie ? 30 : 24,
          boxShadow: isSmoothie
            ? "0 28px 80px rgba(103,73,48,.14), inset 0 1px 0 rgba(255,255,255,.9)"
            : "0 24px 70px rgba(75,52,40,.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #eee3d8",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, color: "#8B5E3C" }}>
              {businessName}
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: isSmoothie ? 24 : 22, fontFamily: isSmoothie ? "Georgia, Times New Roman, serif" : "inherit" }}>{title}</h1>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={"/" + routeCode}
              style={{
                textDecoration: "none",
                padding: "10px 12px",
                borderRadius: isSmoothie ? 14 : 10,
                background: isSmoothie ? "#F4E7D7" : "#F2E5D8",
                color: "#4B3428",
                fontWeight: 800,
              }}
            >
              {tr("Kembali", "Back")}
            </a>
            <a
              href={documentSource}
              download="menu.pdf"
              style={{
                textDecoration: "none",
                padding: "10px 12px",
                borderRadius: isSmoothie ? 14 : 10,
                background: isSmoothie ? "#9B6A43" : "#8B5E3C",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              {tr("Unduh PDF", "Download PDF")}
            </a>
          </div>
        </div>

        <PdfViewer source={documentSource} title={title} language={language} />
      </section>

      <style>{`
        @media (max-width: 640px) {
          main {
            padding: 0 !important;
          }
          section {
            max-width: none !important;
            min-height: 100vh !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

        }
      `}</style>
    </main>
  );
}

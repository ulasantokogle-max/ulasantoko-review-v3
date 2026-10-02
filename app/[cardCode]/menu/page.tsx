import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export default async function PublicPdfMenuPage({
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

  const title = firstString(data?.pdf_title) ?? "Menu & Daftar Harga";
  const businessName = firstString(data?.business_name) ?? "UlasanToko";
  const themeKey = firstString(data?.theme_key) ?? "warm_brown";
  const isSmoothie = themeKey === "soft_smoothie";

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
            <div style={{ fontSize: 12, fontWeight: 900, color: "#8B5E3C" }}>
              {businessName}
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: isSmoothie ? 24 : 22, fontFamily: isSmoothie ? "Georgia, Times New Roman, serif" : "inherit" }}>{title}</h1>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={"/" + cardCode}
              style={{
                textDecoration: "none",
                padding: "10px 12px",
                borderRadius: isSmoothie ? 14 : 10,
                background: isSmoothie ? "#F4E7D7" : "#F2E5D8",
                color: "#4B3428",
                fontWeight: 800,
              }}
            >
              Kembali
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
                padding: "10px 12px",
                borderRadius: isSmoothie ? 14 : 10,
                background: isSmoothie ? "#9B6A43" : "#8B5E3C",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Buka PDF
            </a>
          </div>
        </div>

        <iframe
          src={pdfUrl}
          title={title}
          style={{
            width: "100%",
            height: "78vh",
            minHeight: 620,
            border: 0,
            display: "block",
            background: "#f7f3ef",
          }}
        />
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
          iframe {
            min-height: calc(100vh - 112px) !important;
            height: calc(100vh - 112px) !important;
          }
        }
      `}</style>
    </main>
  );
}

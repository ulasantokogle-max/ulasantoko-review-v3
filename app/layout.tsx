import "./globals.css";
import { cookies } from "next/headers";
import { LanguageProvider } from "../lib/i18n";

export const metadata = {
  title: "YukReview",
  description: "Platform kartu Google Review QR & NFC untuk ulasan dan masukan pelanggan.",
  metadataBase: new URL("https://yukreview.id"),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLanguage = cookieStore.get("reputasipro-language")?.value === "en" ? "en" : "id";
  return (
    <html lang={initialLanguage}>
      <body><LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider></body>
    </html>
  );
}

import "./globals.css";
import { cookies } from "next/headers";
import { LanguageProvider } from "../lib/i18n";

export const metadata = {
  title: "ReputasiPro",
  description: "Platform kartu QR & NFC untuk ulasan dan feedback pelanggan.",
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

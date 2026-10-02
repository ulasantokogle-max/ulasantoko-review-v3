import { LanguageProvider } from "../lib/i18n";

export const metadata = {
  title: "ReputasiPro",
  description: "Platform kartu QR & NFC untuk ulasan dan feedback pelanggan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}

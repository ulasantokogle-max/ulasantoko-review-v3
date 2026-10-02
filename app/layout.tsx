export const metadata = {
  title: "UlasanToko Review",
  description: "Platform kartu QR & NFC untuk ulasan dan feedback pelanggan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

export const metadata = {
  title: "UlasanToko Review V3",
  description: "Google Review Card Platform",
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

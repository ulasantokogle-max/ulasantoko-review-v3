import { redirect } from "next/navigation";
import { providerCaptchaStatus } from "../../lib/providerCaptchaServer";

export const metadata = {
  title: "Provider | ReputasiPro",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const captcha = await providerCaptchaStatus();
  if (captcha.required && !captcha.verified) redirect("/access");
  return children;
}

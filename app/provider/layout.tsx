import { cookies, headers } from "next/headers";
import ProviderCaptcha from "../components/ProviderCaptcha";
import { providerCaptchaConfig, PROVIDER_CAPTCHA_COOKIE, validProviderCaptchaPass } from "../../lib/providerCaptcha";

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
  const config = providerCaptchaConfig();
  if (config.enabled) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") || "";
    const hostname = host.split(":")[0];
    const cookie = (await cookies()).get(PROVIDER_CAPTCHA_COOKIE)?.value;
    if (!config.ready || !validProviderCaptchaPass(cookie, config.secret, hostname)) {
      return <ProviderCaptcha siteKey={config.siteKey} ready={config.ready} />;
    }
  }
  return children;
}

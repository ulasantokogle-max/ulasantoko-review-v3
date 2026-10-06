import AccessHub from "./AccessHub";
import ProviderCaptcha from "../components/ProviderCaptcha";
import { providerCaptchaStatus } from "../../lib/providerCaptchaServer";

export const metadata = {
  title: "Menu Akses | ReputasiPro",
  robots: { index: false, follow: false },
};

export default async function AccessPage() {
  const captcha = await providerCaptchaStatus();
  if (captcha.required && !captcha.verified) {
    return <ProviderCaptcha siteKey={captcha.siteKey} ready={captcha.ready} />;
  }
  return <AccessHub />;
}

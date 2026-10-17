import { cookies, headers } from "next/headers";
import { providerCaptchaConfig, PROVIDER_CAPTCHA_COOKIE, validProviderCaptchaPass } from "./providerCaptcha";

// Both access entry and direct provider routes use the same server-verified pass.
export async function providerCaptchaStatus() {
  const config = providerCaptchaConfig();
  if (!config.enabled) return { siteKey: config.siteKey, ready: false, required: false, verified: false };
  const requestHeaders = await headers();
  const hostname = (requestHeaders.get("host") || "").split(":")[0];
  const cookie = (await cookies()).get(PROVIDER_CAPTCHA_COOKIE)?.value;
  return {
    siteKey: config.siteKey,
    ready: config.ready,
    required: true,
    verified: config.ready && validProviderCaptchaPass(cookie, config.secret, hostname),
  };
}

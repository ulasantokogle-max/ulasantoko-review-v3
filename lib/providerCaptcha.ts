import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PROVIDER_CAPTCHA_COOKIE = "provider_captcha";
export const PROVIDER_CAPTCHA_ACTION = "provider_entry";
export const PROVIDER_CAPTCHA_TTL = 15 * 60;

export function providerCaptchaConfig() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || "";
  // Staged rollout: no keys preserves existing MFA. Partial configuration blocks entry.
  return { siteKey, secret, enabled: Boolean(siteKey || secret), ready: Boolean(siteKey && secret) };
}

export function createProviderCaptchaPass(secret: string, hostname: string, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + PROVIDER_CAPTCHA_TTL}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", secret).update(`${hostname}:${payload}`).digest("hex");
  return `${payload}.${signature}`;
}

export function validProviderCaptchaPass(value: string | undefined, secret: string, hostname: string, now = Date.now()) {
  if (!secret || !value || !/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expiry, nonce, signature] = value.split(".");
  const seconds = Math.floor(now / 1000);
  if (Number(expiry) <= seconds || Number(expiry) > seconds + PROVIDER_CAPTCHA_TTL) return false;
  const expected = createHmac("sha256", secret).update(`${hostname}:${expiry}.${nonce}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

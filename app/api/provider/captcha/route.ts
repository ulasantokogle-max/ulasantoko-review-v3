import { NextResponse } from "next/server";
import { ApiInputError, readApiJson } from "../../../../lib/apiInput";
import { createProviderCaptchaPass, providerCaptchaConfig, PROVIDER_CAPTCHA_ACTION, PROVIDER_CAPTCHA_COOKIE, PROVIDER_CAPTCHA_TTL } from "../../../../lib/providerCaptcha";

export const runtime = "nodejs";
const failure = (status: number) => NextResponse.json({ message: "Verifikasi belum berhasil. Silakan coba lagi." }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const config = providerCaptchaConfig();
  if (!config.ready) return failure(503);
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return failure(403);
  let token: unknown;
  try { token = (await readApiJson(request)).token; }
  catch (error) { return failure(error instanceof ApiInputError ? error.status : 400); }
  if (typeof token !== "string" || !token.trim() || token.length > 2048) return failure(400);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secret, response: token }),
      cache: "no-store", signal: AbortSignal.timeout(10000), redirect: "error",
    });
    if (!response.ok) return failure(503);
    const result = await response.json();
    if (result.success !== true || result.action !== PROVIDER_CAPTCHA_ACTION || result.hostname !== url.hostname) return failure(403);
    const verified = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    verified.cookies.set(PROVIDER_CAPTCHA_COOKIE, createProviderCaptchaPass(config.secret, url.hostname), {
      httpOnly: true, secure: url.protocol === "https:", sameSite: "strict", path: "/provider", maxAge: PROVIDER_CAPTCHA_TTL,
    });
    return verified;
  } catch { return failure(503); }
}

// Navigation-only integration. YukReview never receives WiV1 sessions, passwords, or service keys.
// The external portal must be configured per Vercel environment after the target is verified.
const configuredUrl = process.env.NEXT_PUBLIC_WIV1_PORTAL_URL ?? "";

export function wiv1Portal(): { providerUrl: string; clientUrl: string } | null {
  if (!configuredUrl) return null;
  try {
    const candidate = new URL(configuredUrl);
    const hostname = candidate.hostname.toLowerCase();
    // No implicit redirect to a random or unsafe host.
    if (candidate.protocol !== "https:" || candidate.username || candidate.password ||
      candidate.search || candidate.hash || (candidate.pathname !== "/" && candidate.pathname !== "") ||
      !(hostname === "wifi.yukreview.id" || hostname.endsWith(".vercel.app"))) {
      return null;
    }
    const origin = candidate.origin;
    return { providerUrl: origin + "/provider", clientUrl: origin + "/client" };
  } catch {
    return null;
  }
}

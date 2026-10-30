/** Provider Support V1 remains unavailable until database and security gates pass. */
export function isProviderSupportConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return env.PROVIDER_SUPPORT_V1_ENABLED === "true";
}

/** Phase A intentionally has no live support backend. */
export function isProviderSupportOperational(): boolean {
  return false;
}

export function providerSupportStatus(env: Record<string, string | undefined> = process.env) {
  return {
    configured: isProviderSupportConfigured(env),
    available: isProviderSupportConfigured(env) && isProviderSupportOperational(),
  };
}

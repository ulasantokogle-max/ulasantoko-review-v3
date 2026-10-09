// Keep the existing RPCs available while the additive TikTok migration is installed.
export async function landingWithTikTok<T extends { error?: { code?: string } | null }>(
  request: PromiseLike<T>, fallback: () => PromiseLike<T>,
): Promise<T> {
  const result = await request;
  return result.error?.code === "PGRST202" ? await fallback() : result;
}

export function safeTikTokUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > 2048 || !/^https:\/\/((www\.)?tiktok\.com|v[mt]\.tiktok\.com)\/[^\s\u0000-\u001f\u007f]+$/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return !url.username && !url.password && !url.port ? trimmed : null;
  } catch { return null; }
}

export function safeYouTubeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > 2048 || !/^https:\/\/((www\.|m\.)?youtube\.com|youtu\.be)\/[^\s\u0000-\u001f\u007f]+$/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return !url.username && !url.password && !url.port ? trimmed : null;
  } catch { return null; }
}

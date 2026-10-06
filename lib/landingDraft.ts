// Tab-scoped drafts survive refresh, and never include passwords or auth tokens.
export function landingDraftKey(email: string, businessId: string) {
  return `reputasipro-editor-v1:${encodeURIComponent(email.toLowerCase())}:${encodeURIComponent(businessId)}`;
}

export function readLandingDraft<T>(key: string, valid: (value: unknown) => value is T): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw || raw.length > 65536) return null;
    const parsed = JSON.parse(raw);
    return parsed.version === 1 && valid(parsed.value) ? parsed.value : null;
  } catch { return null; }
}

export function writeLandingDraft(key: string, value: unknown): boolean {
  try {
    const encoded = JSON.stringify({ version: 1, value });
    if (encoded.length > 65536) return false;
    window.sessionStorage.setItem(key, encoded);
    return true;
  } catch { return false; }
}

export function clearLandingDraft(key: string) {
  try { window.sessionStorage.removeItem(key); } catch { /* Restricted browser storage. */ }
}

/** Explicit, narrow field scopes. Never accept wildcard or generic edit scopes. */
export const SUPPORT_SCOPES = [
  "landing.text",
  "landing.theme",
  "landing.google_review",
  "landing.whatsapp",
  "landing.instagram",
  "landing.tiktok",
  "landing.youtube",
] as const;

export type SupportScope = (typeof SUPPORT_SCOPES)[number];

const scopeSet: ReadonlySet<string> = new Set(SUPPORT_SCOPES);

export function isSupportScope(value: unknown): value is SupportScope {
  return typeof value === "string" && scopeSet.has(value);
}

export function validateRequestedScopes(value: unknown): SupportScope[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > SUPPORT_SCOPES.length) return null;
  if (!value.every(isSupportScope)) return null;
  if (new Set(value).size !== value.length) return null;
  return value;
}

export function isApprovedScope(requested: readonly SupportScope[], approved: readonly SupportScope[], scope: SupportScope): boolean {
  if (!Array.isArray(requested) || !Array.isArray(approved)) return false;
  if (!requested.every(isSupportScope) || !approved.every(isSupportScope)) return false;
  return requested.includes(scope) && approved.includes(scope);
}

export type SupportAuthorization = {
  providerActive: boolean;
  providerAal2: boolean;
  ownerApproved: boolean;
  providerMatches: boolean;
  businessMatches: boolean;
  sessionActive: boolean;
  revoked: boolean;
  sessionStartedAtMs: number;
  sessionExpiresAtMs: number;
  nowMs: number;
  businessActive: boolean;
  businessTermWritable: boolean;
  requestedScopes: readonly SupportScope[];
  approvedScopes: readonly SupportScope[];
};

export function canEditSupportScope(context: SupportAuthorization, scope: unknown): boolean {
  if (!context || typeof context !== "object" || !isSupportScope(scope)) return false;
  if (!Number.isFinite(context.nowMs) || !Number.isFinite(context.sessionStartedAtMs) || !Number.isFinite(context.sessionExpiresAtMs)) return false;
  if (context.sessionStartedAtMs > context.nowMs) return false;
  if (context.sessionExpiresAtMs <= context.sessionStartedAtMs) return false;
  if (context.sessionExpiresAtMs - context.sessionStartedAtMs > 30 * 60 * 1000) return false;
  return context.providerActive === true && context.providerAal2 === true && context.ownerApproved === true &&
    context.providerMatches === true && context.businessMatches === true && context.sessionActive === true &&
    context.revoked === false && context.sessionExpiresAtMs > context.nowMs &&
    context.businessActive === true && context.businessTermWritable === true &&
    isApprovedScope(context.requestedScopes, context.approvedScopes, scope);
}

import { isSupportScope, type SupportScope } from "./permissions";

/**
 * STEP 2.28: pure, non-persistent policy for future support approval.
 * This module does NOT authorize API access. Server/RPC must verify identities,
 * MFA, ownership, business term, and audit transaction atomically.
 */
export const SUPPORT_SESSION_MAX_MS = 30 * 60 * 1000;

export type SupportRequestState = "pending" | "approved" | "denied" | "revoked" | "expired";

export type SupportRequestRecord = {
  id: string;
  providerId: string;
  businessId: string;
  ownerId: string;
  requestedScopes: readonly SupportScope[];
  state: SupportRequestState;
  createdAtMs: number;
};

export type OwnerDecision = {
  actorId: string;
  actorIsVerifiedOwner: boolean;
  approvedScopes: readonly SupportScope[];
  nowMs: number;
};

export function canApproveSupportRequest(request: SupportRequestRecord | null, decision: OwnerDecision | null): boolean {
  if (!request || !decision || request.state !== "pending") return false;
  if (decision.actorIsVerifiedOwner !== true || decision.actorId !== request.ownerId) return false;
  if (!Number.isFinite(decision.nowMs) || !Number.isFinite(request.createdAtMs) || decision.nowMs < request.createdAtMs) return false;
  if (!Array.isArray(request.requestedScopes) || !Array.isArray(decision.approvedScopes)) return false;
  if (request.requestedScopes.length === 0 || decision.approvedScopes.length === 0) return false;
  if (!request.requestedScopes.every(isSupportScope) || !decision.approvedScopes.every(isSupportScope)) return false;
  if (new Set(request.requestedScopes).size !== request.requestedScopes.length) return false;
  if (new Set(decision.approvedScopes).size !== decision.approvedScopes.length) return false;
  return decision.approvedScopes.every(scope => request.requestedScopes.includes(scope));
}

export type SupportSessionRecord = {
  requestId: string;
  providerId: string;
  businessId: string;
  approvedScopes: readonly SupportScope[];
  startedAtMs: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
};

export function canUseSupportSession(session: SupportSessionRecord | null, nowMs: number, scope: unknown): boolean {
  if (!session || !isSupportScope(scope) || !Number.isFinite(nowMs)) return false;
  if (!Number.isFinite(session.startedAtMs) || !Number.isFinite(session.expiresAtMs)) return false;
  if (session.startedAtMs > nowMs || session.expiresAtMs <= nowMs) return false;
  if (session.expiresAtMs <= session.startedAtMs || session.expiresAtMs - session.startedAtMs > SUPPORT_SESSION_MAX_MS) return false;
  if (session.revokedAtMs !== null) return false;
  return Array.isArray(session.approvedScopes) &&
    session.approvedScopes.length > 0 &&
    session.approvedScopes.every(isSupportScope) &&
    new Set(session.approvedScopes).size === session.approvedScopes.length &&
    session.approvedScopes.includes(scope);
}

export type SupportAuditEventType = "request_created" | "owner_approved" | "owner_denied" | "session_started" | "landing_updated" | "session_revoked" | "session_expired";
export type SupportAuditDraft = {
  eventType: SupportAuditEventType;
  requestId: string;
  businessId: string;
  actorId: string;
  occurredAtMs: number;
  scope?: SupportScope;
};

export function validateSupportAuditDraft(event: SupportAuditDraft | null): boolean {
  const allowed: ReadonlySet<string> = new Set(["request_created", "owner_approved", "owner_denied", "session_started", "landing_updated", "session_revoked", "session_expired"]);
  return !!event && allowed.has(event.eventType) &&
    typeof event.requestId === "string" && event.requestId.length > 0 &&
    typeof event.businessId === "string" && event.businessId.length > 0 &&
    typeof event.actorId === "string" && event.actorId.length > 0 &&
    Number.isFinite(event.occurredAtMs) &&
    (event.eventType !== "landing_updated" || isSupportScope(event.scope)) &&
    (event.scope === undefined || isSupportScope(event.scope));
}

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.join(__dirname, "..");
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((compiled.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
  const mod = { exports: {} };
  cache.set(relative, mod.exports);
  const localRequire = spec => {
    if (spec === "./permissions") return load("lib/providerSupport/permissions.ts");
    throw new Error("Unexpected import " + spec);
  };
  new Function("module", "exports", "require", compiled.outputText)(mod, mod.exports, localRequire);
  return mod.exports;
}
const policy = load("lib/providerSupport/sessionPolicy.ts");
const now = 10000000;
const request = {
  id: "req-demo", providerId: "provider-demo", businessId: "business-demo",
  ownerId: "owner-demo", requestedScopes: ["landing.text", "landing.theme"],
  state: "pending", createdAtMs: now - 1000,
};
const decision = { actorId: "owner-demo", actorIsVerifiedOwner: true, approvedScopes: ["landing.text"], nowMs: now };
assert.equal(policy.canApproveSupportRequest(request, decision), true);
for (const invalid of [
  { ...decision, actorId: "different-owner" },
  { ...decision, actorIsVerifiedOwner: "true" },
  { ...decision, approvedScopes: ["cards.delete"] },
  { ...decision, approvedScopes: ["landing.text", "landing.text"] },
  { ...decision, approvedScopes: ["landing.youtube"] },
  { ...decision, approvedScopes: [] },
  { ...decision, nowMs: now - 2000 },
]) assert.equal(policy.canApproveSupportRequest(request, invalid), false);
assert.equal(policy.canApproveSupportRequest({ ...request, state: "approved" }, decision), false);
const session = {
  requestId: "req-demo", providerId: "provider-demo", businessId: "business-demo",
  approvedScopes: ["landing.text"], startedAtMs: now,
  expiresAtMs: now + 30 * 60 * 1000, revokedAtMs: null,
};
assert.equal(policy.canUseSupportSession(session, now, "landing.text"), true);
assert.equal(policy.canUseSupportSession(session, now, "landing.theme"), false);
assert.equal(policy.canUseSupportSession(session, now + 30 * 60 * 1000, "landing.text"), false);
assert.equal(policy.canUseSupportSession({ ...session, expiresAtMs: session.expiresAtMs + 1 }, now, "landing.text"), false);
assert.equal(policy.canUseSupportSession({ ...session, revokedAtMs: now }, now, "landing.text"), false);
assert.equal(policy.canUseSupportSession({ ...session, approvedScopes: ["*"] }, now, "landing.text"), false);
const audit = { eventType: "landing_updated", requestId: "req-demo", businessId: "business-demo", actorId: "provider-demo", occurredAtMs: now, scope: "landing.text" };
assert.equal(policy.validateSupportAuditDraft(audit), true);
assert.equal(policy.validateSupportAuditDraft({ ...audit, scope: "cards.delete" }), false);
assert.equal(policy.validateSupportAuditDraft({ ...audit, actorId: "" }), false);
assert.equal(policy.validateSupportAuditDraft({ ...audit, eventType: "owner_impersonated" }), false);
console.log("PASS Provider Support Phase C pure policy tests");

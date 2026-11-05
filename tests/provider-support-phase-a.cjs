const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
function loadTs(relativePath) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "process", transpiled)(mod, mod.exports, process);
  return mod.exports;
}

const flags = loadTs("lib/providerSupport/featureFlag.ts");
assert.equal(flags.isProviderSupportConfigured({}), false);
assert.equal(flags.isProviderSupportConfigured({ PROVIDER_SUPPORT_V1_ENABLED: "false" }), false);
assert.equal(flags.isProviderSupportConfigured({ PROVIDER_SUPPORT_V1_ENABLED: "TRUE" }), false);
assert.equal(flags.isProviderSupportConfigured({ PROVIDER_SUPPORT_V1_ENABLED: "true" }), true);
assert.equal(flags.providerSupportStatus({ PROVIDER_SUPPORT_V1_ENABLED: "true" }).available, false);

const permissions = loadTs("lib/providerSupport/permissions.ts");
assert.equal(permissions.validateRequestedScopes(["landing.text", "landing.youtube"]).length, 2);
for (const bad of [[], ["*"], ["landing.media"], ["landing.text", "landing.text"], ["landing.text", "cards.delete"], null]) {
  assert.equal(permissions.validateRequestedScopes(bad), null);
}
const now = Date.now();
const good = {
  providerActive: true, providerAal2: true, ownerApproved: true,
  providerMatches: true, businessMatches: true, sessionActive: true,
  revoked: false, sessionStartedAtMs: now, sessionExpiresAtMs: now + 1000, nowMs: now,
  businessActive: true, businessTermWritable: true,
  requestedScopes: ["landing.text"], approvedScopes: ["landing.text"],
};
assert.equal(permissions.canEditSupportScope(good, "landing.text"), true);
assert.equal(permissions.canEditSupportScope(good, "landing.youtube"), false);
assert.equal(permissions.canEditSupportScope(null, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, requestedScopes: null }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, approvedScopes: "landing.text" }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, approvedScopes: ["*"] }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, requestedScopes: ["landing.text", "cards.delete"] }, "landing.text"), false);
for (const key of ["providerActive", "providerAal2", "ownerApproved", "providerMatches", "businessMatches", "sessionActive", "businessActive", "businessTermWritable"]) {
  assert.equal(permissions.canEditSupportScope({ ...good, [key]: false }, "landing.text"), false, key);
}
assert.equal(permissions.canEditSupportScope({ ...good, revoked: true }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, providerAal2: "true" }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, ownerApproved: 1 }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, revoked: null }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, businessTermWritable: "true" }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, sessionExpiresAtMs: now }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, approvedScopes: [] }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, sessionStartedAtMs: now + 1 }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, sessionExpiresAtMs: now + 30 * 60 * 1000 + 1 }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, sessionExpiresAtMs: now }, "landing.text"), false);
assert.equal(permissions.canEditSupportScope({ ...good, sessionStartedAtMs: NaN }, "landing.text"), false);

const routes = [
  "app/api/provider/support/requests/route.ts",
  "app/api/provider/support/sessions/[sessionId]/route.ts",
  "app/api/provider/support/sessions/[sessionId]/landing/route.ts",
  "app/api/dashboard/support/requests/[requestId]/decision/route.ts",
  "app/api/dashboard/support/sessions/[sessionId]/revoke/route.ts",
];
for (const route of routes) {
  const src = fs.readFileSync(path.join(root, route), "utf8");
  assert.match(src, /unavailableSupportResponse\(\)/);
  assert.doesNotMatch(src, /supabase|service.role|secret.key|\.rpc\(/i);
}
console.log("PASS Provider Support Phase A fail-closed static tests");

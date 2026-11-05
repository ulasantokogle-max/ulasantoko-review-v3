const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.join(__dirname, "..");
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.join(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  cache.set(relative, module.exports);
  new Function("module", "exports", "require", output)(module, module.exports, spec => {
    assert.equal(spec, "./permissions");
    return load("lib/providerSupport/permissions.ts");
  });
  return module.exports;
}
const permission = load("lib/providerSupport/permissions.ts");
const policy = load("lib/providerSupport/sessionPolicy.ts");
const t = 10000000;
const base = {
  providerActive:true, providerAal2:true, ownerApproved:true,
  providerMatches:true, businessMatches:true, sessionActive:true,
  revoked:false, sessionStartedAtMs:t, sessionExpiresAtMs:t+1800000,
  nowMs:t, businessActive:true, businessTermWritable:true,
  requestedScopes:["landing.text"], approvedScopes:["landing.text"],
};
let checks = 0;
function expect(actual, expected, label) {
  assert.equal(actual, expected, label); checks++;
}
expect(permission.canEditSupportScope(base,"landing.text"),true,"valid scoped edit");
for (const key of ["providerActive","providerAal2","ownerApproved","providerMatches","businessMatches","sessionActive","businessActive","businessTermWritable"]) {
  expect(permission.canEditSupportScope({...base,[key]:false},"landing.text"),false,key);
}
expect(permission.canEditSupportScope({...base,revoked:true},"landing.text"),false,"revoked");
expect(permission.canEditSupportScope({...base,nowMs:t+1800000},"landing.text"),false,"expired");
expect(permission.canEditSupportScope({...base,sessionExpiresAtMs:t+1800001},"landing.text"),false,"overlong");
expect(permission.canEditSupportScope({...base,sessionStartedAtMs:t+1},"landing.text"),false,"future start");
expect(permission.canEditSupportScope({...base,approvedScopes:["landing.theme"]},"landing.text"),false,"scope escalation");
for (const scope of ["*","cards.delete","billing.edit","landing.media","landing.pdf"]) {
  expect(permission.canEditSupportScope(base,scope),false,"forbidden scope "+scope);
}
expect(permission.validateRequestedScopes(["landing.text","landing.text"]),null,"duplicate scopes");
expect(permission.validateRequestedScopes([]),null,"empty scopes");
expect(permission.validateRequestedScopes(["landing.text","*"]),null,"wildcard");
const request={id:"r",providerId:"p",businessId:"b",ownerId:"o",requestedScopes:["landing.text"],state:"pending",createdAtMs:t};
const decision={actorId:"o",actorIsVerifiedOwner:true,approvedScopes:["landing.text"],nowMs:t};
expect(policy.canApproveSupportRequest(request,decision),true,"owner approval");
expect(policy.canApproveSupportRequest(request,{...decision,actorId:"another"}),false,"wrong owner");
expect(policy.canApproveSupportRequest(request,{...decision,actorIsVerifiedOwner:false}),false,"non-owner");
expect(policy.canApproveSupportRequest(request,{...decision,approvedScopes:["landing.theme"]}),false,"unrequested approval");
expect(policy.canApproveSupportRequest({...request,state:"approved"},decision),false,"duplicate approval");
const session={requestId:"r",providerId:"p",businessId:"b",approvedScopes:["landing.text"],startedAtMs:t,expiresAtMs:t+1800000,revokedAtMs:null};
expect(policy.canUseSupportSession(session,t,"landing.text"),true,"active session");
expect(policy.canUseSupportSession(session,t+1800000,"landing.text"),false,"expiry boundary");
expect(policy.canUseSupportSession({...session,revokedAtMs:t},t,"landing.text"),false,"revoked session");
expect(policy.canUseSupportSession({...session,approvedScopes:["landing.theme"]},t,"landing.text"),false,"unapproved scope");
const audit={eventType:"landing_updated",requestId:"r",businessId:"b",actorId:"p",occurredAtMs:t,scope:"landing.text"};
expect(policy.validateSupportAuditDraft(audit),true,"valid audit");
expect(policy.validateSupportAuditDraft({...audit,scope:undefined}),false,"missing update scope");
expect(policy.validateSupportAuditDraft({...audit,scope:"cards.delete"}),false,"forbidden audit scope");
const flag=fs.readFileSync(path.join(root,"lib/providerSupport/featureFlag.ts"),"utf8");
assert.match(flag,/return false/);checks++;
for (const route of [
 "app/api/provider/support/requests/route.ts",
 "app/api/provider/support/sessions/[sessionId]/route.ts",
 "app/api/provider/support/sessions/[sessionId]/landing/route.ts",
 "app/api/dashboard/support/requests/[requestId]/decision/route.ts",
 "app/api/dashboard/support/sessions/[sessionId]/revoke/route.ts"
]) {
 const source=fs.readFileSync(path.join(root,route),"utf8");
 assert.match(source,/providerSupport|supportUnavailable|isProviderSupportOperational|providerSupportStatus/i,route);checks++;
}
console.log("PASS Provider Support offline pure-policy security matrix:",checks,"checks");

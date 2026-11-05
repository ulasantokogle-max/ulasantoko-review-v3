const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const ui = read("components/providerSupport/ProviderSupportPreview.tsx");
const page = read("app/provider/support-preview/page.tsx");
const flag = read("lib/providerSupport/featureFlag.ts");
for (const [name, source, fileName] of [
  ["UI", ui, "ProviderSupportPreview.tsx"],
  ["route", page, "page.tsx"],
  ["flag", flag, "featureFlag.ts"],
]) {
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, name + ": " + errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, " ")).join("; "));
}
assert.match(page, /providerSupportStatus\(\)\.available/);
assert.match(page, /if \(!providerSupportStatus\(\)\.available\) notFound\(\)/);
assert.match(flag, /export function isProviderSupportOperational\(\): boolean \{\s*return false;/);
assert.match(ui, /synthetic data/);
assert.match(ui, /DISABLED/);
assert.match(ui, /disabled className=/);
for (const source of [ui, page]) {
  assert.doesNotMatch(source, /fetch\s*\(|supabase|\.rpc\s*\(|service.role|secret.key/i);
}
assert.doesNotMatch(page, /export\s+const\s+dynamic\s*=\s*["']force-static/);
console.log("PASS Provider Support Phase B UI static gate and TSX transpilation");

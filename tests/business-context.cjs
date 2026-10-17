const fs = require('node:fs'), ts = require('typescript'), Module = require('node:module');
const assert = require('node:assert/strict'), React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
}).outputText, f);
const requests = [];
const original = Module._load;
Module._load = function(id, parent, main) {
  if (id === './supabase') return { supabase: { rpc: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) } };
  return original.call(this, id, parent, main);
};
global.window = { location: { href: 'https://yukreview.id/dashboard' } };
const { useBusinessContext } = require('../lib/useBusinessContext.ts');
let context;
function Probe({ email }) { context = useBusinessContext(email); return null; }
const result = id => ({ data: [{ business_id: id }], error: null });
(async () => {
  let tree;
  await act(async () => { tree = create(React.createElement(Probe, { email: 'a@example.com' })); });
  const old = requests.shift();
  const staleReload = context.reloadBusinesses;
  await act(async () => tree.update(React.createElement(Probe, { email: 'b@example.com' })));
  assert.equal(context.businessId, null);
  await act(async () => staleReload());
  assert.equal(requests.length, 1, 'Stale reload cannot cancel the current account request');
  await act(async () => requests.shift().resolve(result('B')));
  assert.equal(context.businessId, 'B');
  await act(async () => old.resolve(result('A')));
  assert.equal(context.businessId, 'B', 'Previous account response cannot replace current businesses');
  await act(async () => context.setBusinessId('someone-else'));
  assert.equal(context.businessId, 'B');
  let first, second;
  await act(async () => { first = context.reloadBusinesses(); });
  const olderReload = requests.shift();
  await act(async () => { second = context.reloadBusinesses(); });
  await act(async () => { requests.shift().resolve(result('B-new')); await second; });
  await act(async () => { olderReload.resolve(result('B-old')); await first; });
  assert.equal(context.businessId, 'B-new');
  await act(async () => { first = context.reloadBusinesses(); });
  await act(async () => { requests.shift().reject(Error('offline')); await first; });
  assert.equal(context.businessLoading, false); assert.equal(context.businessId, null);
  assert(context.businessError);
  await act(async () => tree.update(React.createElement(Probe, { email: null })));
  assert.equal(context.businessLoading, false); assert.deepEqual(context.businesses, []);
  await act(async () => tree.unmount());
  console.log('PASS business context: account/reload races, invalid selection, network failure, sign-out and stale response isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, file);
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
const own = 'https://project.supabase.co/storage/v1/object/public/landing-media/user/pdf/menu.pdf';
let record = { success: true, show_pdf: true, pdf_url: own };
let resolved = 'TEST001';
const original = Module._load;
Module._load = function(id, parent, main) {
  if (id === '@supabase/supabase-js') return { createClient: () => ({ rpc: async name => ({ data: name === 'v3_resolve_card_code' ? resolved : record }) }) };
  return original.call(this, id, parent, main);
};
const { isHostedMenuPdf } = require('../lib/publicPdf.ts');
assert(isHostedMenuPdf(own, process.env.NEXT_PUBLIC_SUPABASE_URL));
for (const bad of [own.replace('https:', 'http:'), own.replace('project.', 'evil.'), own.replace('landing-media', 'private'), own.replace('.pdf', '.html'), own + '?token=x', 'https://127.0.0.1/menu.pdf', 'https://project.supabase.co/storage/v1/object/public/landing-media/../../private/file.pdf']) {
  assert.equal(isHostedMenuPdf(bad, process.env.NEXT_PUBLIC_SUPABASE_URL), false);
}
let fetches = 0;
let options;
let upstream = () => new Response('%PDF-1.7\nTest PDF bytes', { headers: { 'Content-Type': 'application/pdf' } });
global.fetch = async (url, init) => { assert.equal(url, own); fetches++; options = init; return upstream(); };
const { GET } = require('../app/[cardCode]/menu/file/route.ts');
const call = () => GET(new Request('https://yukreview.id/a7c93e10b842/menu/file'), { params: Promise.resolve({ cardCode: 'a7c93e10b842' }) });
(async () => {
  let response = await call();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('content-disposition'), 'inline; filename="menu.pdf"');
  assert.equal(await response.text(), '%PDF-1.7\nTest PDF bytes');
  assert.equal(options.redirect, 'error');
  assert(options.signal instanceof AbortSignal);
  for (const unavailable of [{ ...record, show_pdf: false }, { ...record, success: false }, { ...record, pdf_url: 'https://evil.example/file.pdf' }]) {
    const before = fetches; record = unavailable;
    assert.equal((await call()).status, 404); assert.equal(fetches, before);
  }
  record = { success: true, show_pdf: true, pdf_url: own };
  resolved = null;
  assert.equal((await call()).status, 404);
  resolved = 'TEST001';
  upstream = () => new Response('<html>Not a PDF</html>');
  assert.equal((await call()).status, 422);
  upstream = () => new Response('small', { headers: { 'Content-Length': String(10 * 1024 * 1024 + 1) } });
  assert.equal((await call()).status, 413);
  upstream = () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 1)); controller.close(); } }));
  assert.equal((await call()).status, 413);
  upstream = () => new Response('missing', { status: 404 });
  assert.equal((await call()).status, 502);
  console.log('PASS public PDF: same-project public bucket only, disabled/unknown cards denied, PDF signature and streamed size enforced, redirects blocked');
})().catch(error => { console.error(error); process.exitCode = 1; });

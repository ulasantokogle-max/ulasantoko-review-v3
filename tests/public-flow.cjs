const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, file);
}
require.extensions['.css'] = () => {};
let outcome = { data: { success: true, feedback_id: 'saved' }, error: null };
let calls = [];
let language = 'en';
let activation = { success: true, needs_activation: false };
let card = { google_review: {review_url:'https://search.google.com/local/writereview?placeid=test'}, business: { name: 'Nama Bisnis Asli' }, card: { card_code: 'TEST001' }, blocks: [] };
let pageCalls = [];
let capabilities = {private_rating_max:5};
let tikTokEnabled=false;
let pageSettings = { success: true, theme_key: 'soft_smoothie', pdf_url: 'https://example.com/menu.pdf', pdf_title: 'Dokumen Bisnis Asli' };
const originalLoad = Module._load;
Module._load = function (id, parent, main) {
  if (id === "./PdfViewer") return { __esModule: true, default: () => React.createElement("div", null, "PDF viewer") };
  if (id === '@supabase/supabase-js') return { createClient: () => ({ rpc: async (name, args) => {
    pageCalls.push({ name, args });
    if (name === 'v3_get_public_landing_page_with_tiktok') return tikTokEnabled?{data:pageSettings,error:null}:{data:null,error:{code:'PGRST202'}};
    if (name === 'v3_resolve_card_code') return { data: args.p_public_id === 'a7c93e10b842' ? 'TEST001' : null, error: null };
    if (name === 'v3_get_feedback_capabilities') return {data:capabilities,error:null};
    if (name === 'v3_submit_feedback') { calls.push(args); return outcome; }
    if (name === 'v3_get_card_activation_state') return { data: activation };
    if (name === 'v3_get_public_card') return { data: card, error: null };
    if (name === 'v3_get_public_business_name') return { data: { display_name: 'Nama Bisnis Asli' } };
    if (name === 'v3_get_public_landing_page') return { data: pageSettings };
    return { data: null, error: null };
  } }) };
  if (id === 'next/headers') return { cookies: async () => ({ get: () => ({ value: language }) }) };
  if (id === 'next/navigation') return {
    redirect: url => { throw new Error('REDIRECT:' + url); },
    notFound: () => { throw new Error('NOT_FOUND'); },
    useRouter: () => ({ refresh() {} }),
  };
  return originalLoad.call(this, id, parent, main);
};
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
const { POST } = require('../app/api/feedback/route.ts');
function request(body) { return new Request('https://example.com/api/feedback', { method: 'POST', body: JSON.stringify(body) }); }
const valid = { card_code: 'TEST001', rating: 2, message: 'Pesan pelanggan asli', contact_consent: false, session_id: 'test-session' };
(async () => {
  for (const invalid of [{ ...valid, rating: 6 }, { ...valid, rating: 0 }, { ...valid, rating: 2.5 }, { ...valid, rating: true }, { ...valid, card_code: {} }, { ...valid, contact_consent: 'false' }, { ...valid, message: {} }, { ...valid, customer_name: 'x'.repeat(121) }, []]) {
    const before = calls.length;
    assert.equal((await POST(request(invalid))).status, 400);
    assert.equal(calls.length, before, 'Invalid input must not reach RPC');
  }
  assert.equal((await POST(new Request('https://example.com/api/feedback', { method: 'POST', body: '{bad' }))).status, 400);
  for (const rating of [1,2,3,4,5]) assert.equal((await POST(request({...valid,rating}))).status,200);
  const saved = await POST(request(valid));
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).success, true);
  assert.equal(calls.at(-1).p_contact_consent, false);
  assert.equal(calls.at(-1).p_message, valid.message);
  for (const [code, status] of [['FEEDBACK_RATE_LIMITED', 429], ['DUPLICATE_FEEDBACK', 409], ['CARD_NOT_FOUND', 404]]) {
    outcome = { data: { success: false, code, message: 'Private SQL diagnostic' }, error: null };
    const response = await POST(request(valid));
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.code, code);
    assert(!body.message.includes('SQL'));
  }
  outcome = { data: null, error: null };
  const empty = await POST(request(valid));
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).success, false);
  console.log('PASS feedback submission, validation, consent, duplicate and throttling');
  const PublicPage = require('../app/[cardCode]/page.tsx').default;
  const { LanguageProvider } = require('../lib/i18n.tsx');
  for (const nextLanguage of ['id', 'en']) {
    language = nextLanguage;
    const RootLayout = require('../app/layout.tsx').default;
    const root = await RootLayout({ children: React.createElement('p', null, 'Business content') });
    assert(renderToStaticMarkup(root).includes('lang="' + language + '"'));
    const page = await PublicPage({ params: Promise.resolve({ cardCode: 'TEST001' }) });
    const html = renderToStaticMarkup(React.createElement(LanguageProvider, { initialLanguage: language }, page));
    assert(html.includes('Nama Bisnis Asli'));
    assert(html.includes('href="https://search.google.com/local/writereview?placeid=test"'));
    assert(html.includes(language === 'en' ? 'Write a Review on Google' : 'Tulis Ulasan di Google'));
  }
  capabilities = null;
  const unavailableMarkerPage = await PublicPage({ params: Promise.resolve({cardCode:'TEST001'}) });
  assert(renderToStaticMarkup(React.createElement(LanguageProvider,{initialLanguage:language},unavailableMarkerPage)).includes('href="https://search.google.com/local/writereview?placeid=test"'),'Missing migration must not affect Google access');
  capabilities = {private_rating_max:5};
  tikTokEnabled=true;
  pageSettings={...pageSettings,tiktok_url:'https://www.tiktok.com/@business',show_tiktok:true};
  let tiktokHtml=renderToStaticMarkup(React.createElement(LanguageProvider,{initialLanguage:language},await PublicPage({params:Promise.resolve({cardCode:'a7c93e10b842'})})));
  assert(tiktokHtml.includes('href="https://www.tiktok.com/@business"'),'Public random card URLs expose the saved TikTok link');
  pageSettings={...pageSettings,show_tiktok:false};
  tiktokHtml=renderToStaticMarkup(React.createElement(LanguageProvider,{initialLanguage:language},await PublicPage({params:Promise.resolve({cardCode:'a7c93e10b842'})})));
  assert(!tiktokHtml.includes('href="https://www.tiktok.com/@business"'));
  pageSettings={...pageSettings,tiktok_url:null};
  const originalSettings = pageSettings;
  for (const theme of ['warm_brown', 'soft_smoothie', 'soft_tosca', 'elegant_cream', 'minimal_dark']) {
    pageSettings = { ...originalSettings, theme_key: theme, hero_title: 'Judul dari form', hero_description: 'Deskripsi dari form', promo_text: 'Promo dari form', about_text: 'Tentang dari form', cover_position: 'bottom-right', instagram_url: 'https://instagram.com/business' };
    let html = renderToStaticMarkup(React.createElement(LanguageProvider, { initialLanguage: language }, await PublicPage({ params: Promise.resolve({ cardCode: 'a7c93e10b842' }) })));
    for (const content of ['Judul dari form', 'Deskripsi dari form', 'Promo dari form', 'Tentang dari form']) assert(html.includes(content));
    assert(html.includes('data-theme="' + theme + '"'));
    assert(html.includes('background-position:right bottom'));
    pageSettings = { ...pageSettings, show_google_review: false, show_whatsapp: false, show_instagram: false, show_pdf: false, show_about: false, show_promo: false };
    html = renderToStaticMarkup(React.createElement(LanguageProvider, { initialLanguage: language }, await PublicPage({ params: Promise.resolve({ cardCode: 'a7c93e10b842' }) })));
    assert(!html.includes('class="public-rating'));
    assert(!html.includes('class="public-links'));
    assert(!html.includes('Promo dari form')); assert(!html.includes('Tentang dari form'));
  }
  pageSettings = originalSettings;
  pageCalls = [];
  const shortPage = await PublicPage({ params: Promise.resolve({ cardCode: 'a7c93e10b842' }) });
  assert(renderToStaticMarkup(React.createElement(LanguageProvider, { initialLanguage: language }, shortPage)).includes('Nama Bisnis Asli'));
  assert(pageCalls.filter(call => call.args?.p_card_code).every(call => call.args.p_card_code === 'TEST001'));
  const MenuPage = require('../app/[cardCode]/menu/page.tsx').default;
  assert(renderToStaticMarkup(await MenuPage({ params: Promise.resolve({ cardCode: 'a7c93e10b842' }) })).includes('Dokumen Bisnis Asli'));
  await assert.rejects(PublicPage({ params: Promise.resolve({ cardCode: 'ffffffffffff' }) }), /NOT_FOUND/);
  activation = { success: true, needs_activation: true };
  await assert.rejects(PublicPage({ params: Promise.resolve({ cardCode: 'a7c93e10b842' }) }), /REDIRECT:\/activate\/a7c93e10b842/);
  await assert.rejects(PublicPage({ params: Promise.resolve({ cardCode: 'TEST001' }) }), /REDIRECT:\/activate\/TEST001/);
  activation = { success: false };
  await assert.rejects(PublicPage({ params: Promise.resolve({ cardCode: 'TEST001' }) }), /NOT_FOUND/);
  assert.throws(() => require('../app/page.tsx').default(), /REDIRECT:\/dashboard/);
  assert.throws(() => require('../app/test-login/page.tsx').default(), /REDIRECT:\/dashboard/);
  console.log('PASS public ID/EN rendering, original business name, activation, unavailable cards and legacy redirects');
})().catch(error => { console.error(error); process.exitCode = 1; });

// Verify language changes on complete page components with isolated Supabase data.
const cwd = process.cwd(), ts = require(cwd + '/node_modules/typescript'), fs = require('fs'), assert = require('assert'), Module = require('module');
for (const ext of ['.ts', '.tsx'])
    require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const React = require(cwd + '/node_modules/react');
const { act, create } = require(cwd + '/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const storage = new Map();
global.window = { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) }, setTimeout, clearTimeout };
global.document = { documentElement: { lang: 'id' }, cookie: '' };
const user = { email: 'test@example.com' };
const business = { business_id: 'b1', business_name: 'Nama Bisnis Tetap', display_name: 'Nama Bisnis Tetap' };
const feedback = { id: 'f1', rating: 2, customer_name: 'Nama Pelanggan Tetap', message: 'Pesan pelanggan tetap bahasa asli', customer_phone: '6281234567890', status: 'new', contact_consent: true, created_at: '2026-10-02T12:00:00Z' };
const card = { id: 'c1', card_code: 'TEST001', status: 'active', activation_status: 'activated', inventory_status: 'activated', qr_enabled: true, nfc_enabled: true };
const supabase = { auth: { getSession: async () => ({ data: { session: { user } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() { } } } }) }, rpc: async (name) => ({ data: name === 'v3_get_my_businesses' ? [business] : name.includes('analytics') ? { feedback: { total: 11, new: 2, average_rating: 2.3, contactable: 10 }, cards: { total: 1, active: 1, activated: 1 } } : name === 'v3_get_business_setup_status' ? { display_name: business.display_name, whatsapp_number: '6281234567890', google_review_configured: true } : name === 'v3_get_feedback_inbox' ? [feedback] : name === 'v3_get_cards' || name === 'v3_provider_list_cards' ? [card] : name === 'v3_get_business_profile' ? { success: true, display_name: business.display_name } : name === 'v3_get_landing_page_settings' ? { theme_key: 'soft_smoothie', hero_title: 'Judul Bisnis Tetap', about_text: 'Konten bisnis tetap bahasa asli' } : name === 'v3_is_provider_admin' ? true : { success: true }, error: null }) };
const original = Module._load;
Module._load = function (id, parent, main) { if (id.endsWith('/supabase') || id === './supabase')
    return { supabase }; if (id === 'next/link')
    return { __esModule: true, default: ({ children, ...p }) => React.createElement('a', p, children) }; if (id === 'next/navigation')
    return { useRouter: () => ({ replace() { }, refresh() { } }), usePathname: () => '/dashboard', useParams: () => ({ cardCode: 'TEST001' }) }; return original.call(this, id, parent, main); };
const { LanguageProvider, useLanguage } = require(cwd + '/lib/i18n.tsx');
let control;
function Probe() { control = useLanguage(); return null; }
function text(tree) { if (tree == null)
    return ''; if (typeof tree === 'string')
    return tree; if (Array.isArray(tree))
    return tree.map(text).join(' '); return text(tree.children); }
(async () => {
    for (const [file, id, en] of [['app/dashboard/page.tsx', 'Ringkasan Dasbor', 'Dashboard Overview'], ['app/dashboard/cards/page.tsx', 'Manajemen Kartu', 'Card Management'], ['app/dashboard/feedback/page.tsx', 'Masukan Pelanggan', 'Customer Feedback'], ['app/dashboard/analytics/page.tsx', 'Analitik & Wawasan', 'Analytics & Insights'], ['app/dashboard/landing-page/page.tsx', 'Pengeditan Halaman', 'Page Editor'], ['app/dashboard/onboarding/page.tsx', 'Siapkan Bisnis Anda', 'Set Up Your Business'], ['app/provider/cards/page.tsx', 'Pusat Kartu', 'Card Center'], ['app/access/page.tsx', 'Menu Akses Sistem', 'System Access Menu']]) {
        storage.clear();
        const Page = require(cwd + '/' + file).default;
        let tree;
        await act(async () => { tree = create(React.createElement(LanguageProvider, null, React.createElement(Probe), React.createElement(Page))); });
        assert(text(tree.toJSON()).includes(id), file + ' ID title');
        await act(async () => control.setLanguage('en'));
        const enText = text(tree.toJSON());
        assert(enText.includes(en), file + ' EN title');
        if (file === 'app/dashboard/page.tsx') {
            assert(enText.includes('Business Setup'));
            assert(enText.includes('Public business name'));
            assert(!enText.includes('Nama bisnis publik'));
        }
        if (file.includes('/feedback/')) {
            assert(enText.includes('Pesan pelanggan tetap bahasa asli'));
            assert.equal(tree.root.findAllByType('select').at(-1).props.value, 'new');
        }
        if (file.includes('/landing-page/')) {
            assert(enText.includes('Judul Bisnis Tetap'));
            assert(enText.includes('Choose Theme'));
            assert(enText.includes('Main Content'));
        }
        await act(async () => control.setLanguage('id'));
        assert(text(tree.toJSON()).includes(id), file + ' switch back');
        assert.equal(document.documentElement.lang, 'id');
        await act(async () => tree.unmount());
        console.log('PASS ID ↔ EN ' + file);
    }
})().catch(e => { console.error(e); process.exit(1); });

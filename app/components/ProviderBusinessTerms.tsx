'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';

type Row = { business_id: string; business_name: string; expires_on: string | null; revision: number; days_remaining: number | null };
type TermStatus = 'active' | 'soon' | 'expired' | 'unset';
const statusOf = (row: Row): TermStatus => !row.expires_on ? 'unset' : row.days_remaining !== null && row.days_remaining < 0 ? 'expired' : row.days_remaining !== null && row.days_remaining <= 30 ? 'soon' : 'active';
const PAGE_SIZE = 10;
const date = (value: string | null) => value ? value.split('-').reverse().join('/') : '—';
export default function ProviderBusinessTerms() {
  const { tr } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TermStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const requests = useRef(new Map<string, string>());
  const mounted = useRef(true);
  const lock = useRef(false);
  async function reload() {
    setLoading(true); setError('');
    try {
      const { data, error: failure } = await supabase.rpc('v3_provider_list_business_terms');
      if (!mounted.current) return;
      if (failure || !Array.isArray(data)) throw new Error('UNAVAILABLE');
      setRows(data);
    } catch { if (mounted.current) setError(tr('Masa aktif belum dapat dimuat. Pastikan migrasi 0048 sudah dijalankan.', 'Terms could not be loaded. Check migration 0048.')); }
    finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => { mounted.current = true; void reload(); return () => { mounted.current = false; }; }, []);
  async function renew() {
    if (!pending || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    const row = pending;
    const key = `${row.business_id}:${row.revision}`;
    if (!requests.current.has(key)) requests.current.set(key, crypto.randomUUID());
    try {
      const { data, error: failure } = await supabase.rpc('v3_provider_renew_business_year', {
        p_business_id: row.business_id, p_expected_revision: row.revision, p_request_id: requests.current.get(key),
      });
      if (!mounted.current) return;
      if (failure || data?.success !== true) {
        if (data?.code === 'STALE_TERM') { setPending(null); await reload(); }
        throw new Error('RENEW_FAILED');
      }
      setPending(null); setMessage(tr('Masa aktif berhasil diperpanjang sampai ', 'Term renewed through ') + date(data.expires_on));
      await reload();
    } catch { if (mounted.current) setError(tr('Perpanjangan belum dapat dikonfirmasi. Perbarui daftar atau coba lagi.', 'Renewal could not be confirmed. Refresh the list or retry.')); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }

  const labels: Record<TermStatus, string> = {
    active: tr('Aktif', 'Active'), soon: tr('Segera Berakhir', 'Expiring Soon'),
    expired: tr('Kedaluwarsa', 'Expired'), unset: tr('Belum Diatur', 'Not Configured'),
  };
  const visible = rows.filter(row => row.business_name.toLowerCase().includes(search.trim().toLowerCase()) && (filter === 'all' || statusOf(row) === filter));
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = visible.slice(start, start + PAGE_SIZE);
  useEffect(() => { setPage(previous => Math.min(previous, pageCount)); }, [pageCount]);
  return <section className="provider-terms" aria-labelledby="provider-terms-title">
    <style>{`
      .provider-terms{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:24px;margin-bottom:24px;color:#172033}
      .provider-terms *{box-sizing:border-box}
      .provider-terms h2{font-size:22px;line-height:1.3;margin:0 0 8px;letter-spacing:-.5px}
      .provider-terms p{margin:0;line-height:1.6}
      .provider-terms .pt-intro{color:#64748b;font-size:14px;max-width:740px}
      .provider-terms .pt-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}
      .provider-terms button,.provider-terms input,.provider-terms select{font:inherit;font-size:13px}
      .provider-terms button{border:1px solid #dce2ea;background:#fff;color:#334155;border-radius:10px;padding:11px 16px;min-height:44px;cursor:pointer;font-weight:600;line-height:1.4}
      .provider-terms button:hover:not(:disabled){background:#f1f5f9;border-color:#94a3b8}
      .provider-terms button:disabled{opacity:.5;cursor:wait}
      .provider-terms :is(button,input,select):focus-visible{outline:3px solid #93c5fd;outline-offset:3px}
      .provider-terms .pt-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
      .provider-terms .pt-stat{background:#f8fafc;border:1px solid #e8edf3;border-radius:12px;padding:16px}
      .provider-terms .pt-stat span{display:block;color:#64748b;font-size:12px;font-weight:600}
      .provider-terms .pt-stat strong{display:block;font-size:26px;line-height:1.3;margin-top:6px}
      .provider-terms .pt-toolbar{display:flex;gap:12px;margin-bottom:14px}
      .provider-terms .pt-search{flex:1;min-width:0}
      .provider-terms label{display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px}
      .provider-terms input,.provider-terms select{width:100%;min-height:44px;border:1px solid #dce2ea;border-radius:10px;background:#fff;color:#172033;padding:10px 12px}
      .provider-terms .pt-filter{width:200px}
      .provider-terms .pt-count{font-size:12px;color:#64748b;margin-bottom:12px}
      .provider-terms .pt-table-head,.provider-terms .pt-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(110px,.8fr) minmax(130px,.8fr) minmax(180px,1fr);gap:16px;align-items:center}
      .provider-terms .pt-table-head{padding:12px 16px;background:#f8fafc;border-radius:10px;font-size:11px;font-weight:700;color:#64748b}
      .provider-terms .pt-row{padding:18px 16px;border-bottom:1px solid #edf0f4}
      .provider-terms .pt-row:last-child{border-bottom:0}
      .provider-terms .pt-business{font-size:14px;overflow-wrap:anywhere}
      .provider-terms .pt-date{font-size:14px;font-weight:600}
      .provider-terms .pt-sub{font-size:12px;color:#64748b;margin-top:4px}
      .provider-terms .pt-badge{display:inline-block;border-radius:20px;padding:6px 10px;font-size:11px;font-weight:700;white-space:nowrap}
      .provider-terms .pt-active{background:#ecfdf5;color:#047857}
      .provider-terms .pt-soon{background:#fffbeb;color:#92400e}
      .provider-terms .pt-expired{background:#fff1f2;color:#be123c}
      .provider-terms .pt-unset{background:#f1f5f9;color:#475569}
      .provider-terms .pt-action{justify-self:end}
      .provider-terms .pt-primary{background:#172033;border-color:#172033;color:#fff}
      .provider-terms .pt-primary:hover:not(:disabled){background:#2d3c55;border-color:#2d3c55}
      .provider-terms .pt-note{background:#f8fafc;border-radius:12px;padding:14px 16px;margin-top:18px;color:#64748b;font-size:12px}
      .provider-terms .pt-note strong{color:#334155}
      .provider-terms .pt-confirm{background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:18px;margin-bottom:18px}
      .provider-terms .pt-confirm h3{margin:0 0 6px;font-size:16px}
      .provider-terms .pt-confirm p{font-size:13px;color:#785327;margin-top:6px}
      .provider-terms .pt-confirm-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
      .provider-terms .pt-alert{padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:14px;background:#fff1f2;color:#be123c}
      .provider-terms .pt-success{background:#ecfdf5;color:#047857}
      .provider-terms .pt-empty{text-align:center;padding:32px 16px;color:#64748b;font-size:14px}
      .provider-terms .pt-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px solid #edf0f4}
      .provider-terms .pt-pagination span{font-size:13px;color:#64748b}
      .provider-terms .pt-page-actions{display:flex;gap:8px;flex-wrap:wrap}
      .provider-terms .pt-mobile-label{display:none}
      @media(max-width:900px){
        .provider-terms .pt-table-head{display:none}
        .provider-terms .pt-row{grid-template-columns:minmax(0,1fr) auto;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;gap:14px}
        .provider-terms .pt-row:last-child{border-bottom:1px solid #e5e7eb}
        .provider-terms .pt-mobile-label{display:block;font-size:11px;color:#64748b;margin-bottom:4px;font-weight:400}
      }
      @media(max-width:540px){
        .provider-terms{padding:16px;border-radius:16px}
        .provider-terms h2{font-size:20px}
        .provider-terms .pt-heading{flex-direction:column;gap:12px}
        .provider-terms .pt-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .provider-terms .pt-stat{padding:12px}
        .provider-terms .pt-toolbar{flex-direction:column}
        .provider-terms .pt-filter{width:100%}
        .provider-terms .pt-row{padding:14px;grid-template-columns:minmax(0,1fr)}
        .provider-terms .pt-action{justify-self:stretch;width:100%}
        .provider-terms .pt-confirm-actions button{width:100%}
      }
    `}</style>
    <div className="pt-heading">
      <div>
        <h2 id="provider-terms-title">{tr('Masa Aktif & Perpanjangan', 'Service Terms & Renewal')}</h2>
        <p className="pt-intro">{tr('Kelola masa aktif tahunan bisnis. Satu masa aktif berlaku untuk semua kartu dalam bisnis yang sama.', 'Manage annual business terms. One term covers all cards in the same business.')}</p>
      </div>
      <button disabled={loading || busy} onClick={reload}>{loading ? tr('Memuat…', 'Loading…') : tr('Perbarui', 'Refresh')}</button>
    </div>
    <div className="pt-summary" aria-label={tr('Ringkasan masa aktif', 'Term summary')}>
      {(['active', 'soon', 'expired', 'unset'] as TermStatus[]).map(status => <div className="pt-stat" key={status}>
        <span>{labels[status]}</span><strong>{loading || error ? '—' : rows.filter(row => statusOf(row) === status).length}</strong>
      </div>)}
    </div>
    <div className="pt-toolbar">
      <div className="pt-search">
        <label htmlFor="pt-search">{tr('Cari Bisnis', 'Search Businesses')}</label>
        <input id="pt-search" aria-label={tr('Cari bisnis untuk perpanjangan', 'Search businesses for renewal')} placeholder={tr('Ketik nama bisnis…', 'Enter a business name…')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <div className="pt-filter">
        <label htmlFor="pt-filter">{tr('Status Masa Aktif', 'Term Status')}</label>
        <select id="pt-filter" value={filter} onChange={e => { setFilter(e.target.value as TermStatus | 'all'); setPage(1); }}>
          <option value="all">{tr('Semua Status', 'All Statuses')}</option>
          {(['active', 'soon', 'expired', 'unset'] as TermStatus[]).map(status => <option key={status} value={status}>{labels[status]}</option>)}
        </select>
      </div>
    </div>
    {error && <p className="pt-alert" role="alert">{error}</p>}
    {message && <p className="pt-alert pt-success" role="status">{message}</p>}
    {pending && <div className="pt-confirm" role="region" aria-labelledby="pt-confirm-title">
      <h3 id="pt-confirm-title">{tr('Konfirmasi Perpanjangan', 'Confirm Renewal')}</h3>
      <strong>{pending.business_name}</strong>
      <p>{tr('Tambah satu tahun setelah pembayaran dikonfirmasi secara manual. Sisa masa aktif tetap diperhitungkan. Tidak ada penagihan otomatis.', 'Add one year after manually confirming payment. Remaining validity is preserved. No automatic charge.')}</p>
      <div className="pt-confirm-actions">
        <button className="pt-primary" disabled={busy || loading} onClick={renew}>{busy ? tr('Memproses…', 'Processing…') : tr('Konfirmasi Perpanjangan', 'Confirm Renewal')}</button>
        <button disabled={busy} onClick={() => setPending(null)}>{tr('Batal', 'Cancel')}</button>
      </div>
    </div>}
    <p className="pt-count" aria-live="polite">{loading ? tr('Memuat daftar bisnis…', 'Loading businesses…') : tr('Menampilkan ', 'Showing ') + (visible.length ? start + 1 : 0) + '–' + (start + pageRows.length) + tr(' dari ', ' of ') + visible.length + tr(' bisnis', ' businesses')}</p>
    <div aria-busy={loading}>
      <div className="pt-table-head" aria-hidden="true"><span>{tr('BISNIS', 'BUSINESS')}</span><span>{tr('STATUS', 'STATUS')}</span><span>{tr('BERLAKU SAMPAI', 'VALID THROUGH')}</span><span>{tr('PERPANJANGAN', 'RENEWAL')}</span></div>
      {pageRows.map(row => {
        const status = statusOf(row);
        return <article className="pt-row" key={row.business_id} aria-label={row.business_name}>
          <strong className="pt-business">{row.business_name}</strong>
          <div><span className={`pt-badge pt-${status}`}>{labels[status]}</span></div>
          <div>
            <span className="pt-mobile-label">{tr('Berlaku sampai', 'Valid through')}</span>
            <div className="pt-date">{date(row.expires_on)}</div>
            <p className="pt-sub">{status === 'unset' ? tr('Masa aktif belum diatur', 'Term not configured') : status === 'expired' ? tr('Pengelolaan terkunci', 'Management locked') : row.days_remaining === 0 ? tr('Berakhir hari ini', 'Expires today') : row.days_remaining !== null ? row.days_remaining + tr(' hari tersisa', ' days remaining') : tr('Masa aktif tahunan', 'Annual term')}</p>
          </div>
          <button className="pt-action" disabled={busy || loading} aria-expanded={pending?.business_id === row.business_id} onClick={() => { setPending(row); setMessage(''); }}>{row.expires_on ? tr('Perpanjang 1 Tahun', 'Renew 1 Year') : tr('Mulai Masa Aktif 1 Tahun', 'Start 1 Year Term')}</button>
        </article>;
      })}
      {!loading && !error && visible.length === 0 && <p className="pt-empty">{rows.length === 0 ? tr('Belum ada bisnis untuk dikelola.', 'No businesses to manage yet.') : tr('Tidak ada bisnis yang cocok. Coba nama atau status lain.', 'No matching businesses. Try another name or status.')}</p>}
    </div>
    {visible.length > PAGE_SIZE && <nav className="pt-pagination" aria-label={tr('Halaman masa aktif', 'Term pages')}>
      <span aria-live="polite">{tr('Halaman ', 'Page ') + currentPage + tr(' dari ', ' of ') + pageCount}</span>
      <div className="pt-page-actions">
        <button disabled={currentPage === 1 || loading || busy} onClick={() => setPage(currentPage - 1)}>{tr('Sebelumnya', 'Previous')}</button>
        <button disabled={currentPage === pageCount || loading || busy} onClick={() => setPage(currentPage + 1)}>{tr('Berikutnya', 'Next')}</button>
      </div>
    </nav>}
    <p className="pt-note"><strong>{tr('QR & NFC tetap aktif.', 'QR & NFC remain active.')}</strong>{' '}{tr('Saat masa aktif kedaluwarsa, dashboard tetap bisa dilihat. Pengelolaan dibuka kembali setelah diperpanjang. Bisnis yang masa aktifnya belum diatur tetap berjalan.', 'After expiry, the dashboard remains readable. Management resumes after renewal. Businesses without a configured term remain operational.')}</p>
  </section>;
}

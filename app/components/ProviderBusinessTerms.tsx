'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';

type Row = { business_id: string; business_name: string; expires_on: string | null; revision: number; days_remaining: number | null };
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
  return <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 20, marginBottom: 20 }}>
    <h2>{tr('Masa Aktif & Perpanjangan', 'Service Terms & Renewal')}</h2>
    <p>{tr('Satu masa aktif untuk semua kartu dalam satu bisnis. Perpanjangan dicatat setelah pembayaran dikonfirmasi secara manual.', 'One term covers all cards in a business. Record renewal after manually confirming payment.')}</p>
    <p>{tr('Bisnis lama tetap berjalan. QR/NFC tetap aktif. Setelah kedaluwarsa, dashboard tetap bisa dilihat tetapi pengelolaan dikunci sampai diperpanjang.', 'Existing businesses remain operational. QR/NFC remain active. After expiry, the dashboard remains readable but management is locked until renewal.')}</p>
    <button disabled={loading || busy} onClick={reload}>{tr('Perbarui', 'Refresh')}</button>
    <input aria-label={tr('Cari bisnis untuk perpanjangan', 'Search businesses for renewal')} placeholder={tr('Cari bisnis', 'Search businesses')} value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 12, maxWidth: '100%', padding: 10 }} />
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {loading && <p>{tr('Memuat…', 'Loading…')}</p>}
    {pending && <div style={{ padding: 16, background: '#fff2df', borderRadius: 12 }}>
      <strong>{pending.business_name}</strong>
      <p>{tr('Konfirmasi tambah satu tahun? Sisa masa aktif tetap diperhitungkan. Tidak ada penagihan otomatis.', 'Confirm adding one year? Remaining validity is preserved. No automatic charge.')}</p>
      <button disabled={busy} onClick={renew}>{busy ? tr('Memproses…', 'Processing…') : tr('Konfirmasi Perpanjangan', 'Confirm Renewal')}</button>{' '}
      <button disabled={busy} onClick={() => setPending(null)}>{tr('Batal', 'Cancel')}</button>
    </div>}
    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
      {rows.filter(row => row.business_name.toLowerCase().includes(search.toLowerCase())).map(row => <div key={row.business_id} style={{ border: '1px solid #eee', padding: 14, borderRadius: 12 }}>
        <strong>{row.business_name}</strong>
        <p>{row.expires_on ? `${tr('Berlaku sampai', 'Valid through')}: ${date(row.expires_on)}` : tr('Masa aktif tahunan belum diatur', 'Annual term not configured')}</p>
        {row.days_remaining !== null && row.days_remaining <= 30 && <p>{row.days_remaining < 0 ? tr('Perlu perpanjangan', 'Renewal due') : `${tr('Sisa hari', 'Days remaining')}: ${row.days_remaining}`}</p>}
        <button disabled={busy || loading} onClick={() => { setPending(row); setMessage(''); }}>{row.expires_on ? tr('Perpanjang 1 Tahun', 'Renew 1 Year') : tr('Mulai Masa Aktif 1 Tahun', 'Start 1 Year Term')}</button>
      </div>)}
    </div>
  </section>;
}

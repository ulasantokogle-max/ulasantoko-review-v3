'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';
import type { BusinessContextItem } from '../../lib/useBusinessContext';

export default function BusinessManagementGate({ children, businessId, userEmail, businesses, setBusinessId }: {
  children: React.ReactNode; businessId: string | null; userEmail: string | null;
  businesses: BusinessContextItem[]; setBusinessId: (id: string) => void;
}) {
  const { tr } = useLanguage();
  const [state, setState] = useState<{ key: string; locked: boolean; error: boolean } | null>(null);
  const key = `${userEmail}:${businessId}`;
  useEffect(() => {
    let active = true;
    async function check() {
      if (!businessId || !userEmail) return;
      try {
        const { data, error } = await supabase.rpc('v3_get_business_term', { p_business_id: businessId });
        if (!active) return;
        // A project without 0048 has no annual terms yet. Preserve the legacy flow.
        if (error?.code === 'PGRST202') { setState({ key, locked: false, error: false }); return; }
        if (error || data?.success !== true || typeof data.enabled !== 'boolean' || (data.enabled && !Number.isFinite(data.days_remaining))) throw new Error('UNAVAILABLE');
        setState({ key, locked: data.enabled === true && data.days_remaining < 0, error: false });
      } catch { if (active) setState({ key, locked: true, error: true }); }
    }
    void check();
    const timer = setInterval(check, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [key, businessId, userEmail]);
  const checking = !!businessId && !!userEmail && state?.key !== key;
  const locked = checking || (!!businessId && !!userEmail && state?.key === key && state.locked);
  return <>
    {locked && <section role="status" style={{ padding: 20, marginBottom: 16, borderRadius: 16, background: '#fff2df', color: '#4b3428' }}>
      <strong>{checking ? tr('Memeriksa masa aktif…', 'Checking service term…') : state?.error
        ? tr('Masa aktif belum dapat diperiksa', 'Service term could not be checked') : tr('Pengelolaan Dashboard Dikunci', 'Dashboard Management Locked')}</strong>
      {!checking && <p>{state?.error ? tr('Coba muat ulang halaman. Fitur pengelolaan sementara dikunci sampai status dapat diperiksa.', 'Reload this page. Management is locked until the status can be checked.')
        : tr('Masa aktif tahunan telah berakhir. Hubungi penyedia kartu untuk perpanjangan. Anda tetap bisa melihat dashboard; QR/NFC dan halaman publik tetap aktif.', 'Your annual term has ended. Contact your card provider to renew. You can still view your dashboard; QR/NFC and the public page remain active.')}</p>}
      {businesses.length > 1 && <select aria-label={tr('Pilih bisnis', 'Select business')} value={businessId ?? ''} onChange={e => setBusinessId(e.target.value)}>{businesses.map(b => <option key={b.business_id} value={b.business_id}>{b.display_name || b.business_name}</option>)}</select>}
    </section>}
    <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
  </>;
}

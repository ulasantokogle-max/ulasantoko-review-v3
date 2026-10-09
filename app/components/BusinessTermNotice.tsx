'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';

type Term = { enabled: boolean; expires_on: string; days_remaining: number };
export default function BusinessTermNotice({ businessId }: { businessId: string }) {
  const { tr } = useLanguage();
  const [term, setTerm] = useState<Term | null>(null);
  useEffect(() => {
    let active = true;
    supabase.rpc('v3_get_business_term', { p_business_id: businessId }).then(({ data, error }) => {
      if (active && !error && data?.success === true && data.enabled === true
        && /^\d{4}-\d{2}-\d{2}$/.test(data.expires_on) && Number.isFinite(data.days_remaining)) setTerm(data);
    }, () => {});
    return () => { active = false; };
  }, [businessId]);
  if (!term) return null;
  const reminder = term.days_remaining <= 30;
  return <section role={reminder ? 'status' : undefined} style={{ padding: 18, margin: '16px 0', borderRadius: 16, background: reminder ? '#fff2df' : '#eef8f0', border: '1px solid #dfd4c4' }}>
    <strong>{tr('Masa Aktif Tahunan', 'Annual Service Term')}</strong>
    <p>{tr('Berlaku sampai', 'Valid through')}: {term.expires_on.split('-').reverse().join('/')}</p>
    {reminder && <p>{term.days_remaining < 0
      ? tr('Masa aktif tahunan telah berakhir. Hubungi penyedia kartu untuk perpanjangan. Pengelolaan dashboard dikunci; QR/NFC tetap dapat digunakan.', 'Your annual term has ended. Contact your card provider to renew. Dashboard management is locked; QR/NFC remain available.')
      : tr(`Masa aktif tersisa ${term.days_remaining} hari. Hubungi penyedia kartu untuk memperpanjang satu tahun.`, `${term.days_remaining} days remaining. Contact your card provider to renew for one year.`)}</p>}
  </section>;
}

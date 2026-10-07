'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';

// Practice campaigns (example promoters only): no money is sent, the road starts right away.
export default function PracticePay({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true);
    setErr('');
    const { error } = await createClient().rpc('submit_payment', { p_campaign: campaignId, p_txn: 'PRACTICE', p_phone: '' });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push(`/artist/c/${campaignId}`);
    router.refresh();
  }
  return (
    <div className="practicebox">
      <p className="practicetag">🧪 Practice campaign</p>
      <h2 className="st" style={{ margin: '4px 0 6px' }}>
        No money needed.
      </h2>
      <p style={{ margin: 0 }}>
        These are <b>example promoters</b>, so nothing is really played and nobody is paid. You see every step of the real road: song check, accept, dates, live, proof, approval and receipt.
      </p>
      {err && (
        <p className="notice err" role="alert" style={{ marginTop: 12 }}>
          {err}
        </p>
      )}
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-yellow" onClick={go} disabled={busy}>
          <Icon name="arrow" size={18} /> {busy ? 'Starting…' : 'Start the practice road'}
        </button>
      </div>
    </div>
  );
}

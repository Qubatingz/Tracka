'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { createClient } from '@/lib/supabase/client';
import { rwf } from '@/lib/util';

export default function TipForm({ bookingId, name, momo }: { bookingId: string; name: string; momo: string }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pick = String(fd.get('amt') || '');
    const amount = pick === 'other' ? parseInt(String(fd.get('other') || '').replace(/[^0-9]/g, ''), 10) : parseInt(pick, 10);
    if (!amount || amount < 500) return setErr('A tip starts at RWF 500.');
    const txn = String(fd.get('txn') || '').trim();
    if (!txn) return setErr('Type the MoMo transaction ID.');
    setBusy(true);
    const { error } = await createClient().rpc('submit_tip', { p_booking: bookingId, p_amount: amount, p_txn: txn });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }
  return (
    <details className="tipbox">
      <summary>
        <Icon name="star" size={16} /> Say thanks with a tip
      </summary>
      <form className="form" onSubmit={submit} style={{ marginTop: 12, maxWidth: 'none' }}>
        <div className="row" role="radiogroup" aria-label="Tip amount">
          {[1000, 2000, 5000].map((v) => (
            <label className="tipchip" key={v}>
              <input type="radio" name="amt" value={v} defaultChecked={v === 2000} />
              <span>{rwf(v)}</span>
            </label>
          ))}
          <label className="tipchip">
            <input type="radio" name="amt" value="other" />
            <span>Other</span>
          </label>
        </div>
        <label className="label">
          Other amount (RWF)
          <input className="input" name="other" inputMode="numeric" placeholder="e.g. 3000" />
        </label>
        <p className="hint">
          Send it to MoMo Pay code <b>{momo || '(ask Tracka)'}</b>. 100% goes to {name}.
        </p>
        <label className="label">
          Transaction ID (from the SMS)
          <input className="input" name="txn" required />
        </label>
        <div className="row">
          <button className="btn btn-yellow btn-sm" type="submit" disabled={busy}>
            Send tip
          </button>
        </div>
        {err && <small className="rpcerr">{err}</small>}
      </form>
    </details>
  );
}
